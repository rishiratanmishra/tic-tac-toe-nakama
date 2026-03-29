import * as nakama from '@heroiclabs/nakama-js';
import { v4 as uuidv4 } from 'uuid';

export type MatchKind = 'matchmaking' | 'room';
export type MatchMode = 'classic' | 'timed';
export type MatchEndReason = 'completed' | 'draw' | 'opponent_left' | 'timeout' | null;

type MatchLabel = {
    game: string;
    kind?: MatchKind;
    roomName?: string | null;
};

type CreateRoomResponse = {
    matchId: string;
    roomName: string;
    roomNumber: string;
    mode: MatchMode;
};

type JoinRoomResponse = {
    matchId: string;
    roomName: string;
    roomNumber: string;
};

export type GameStateMessage = {
    board: (string | null)[];
    marks: Record<string, string>;
    players: Record<string, string>;
    activePlayers: string[];
    turn: string | null;
    winner: string | null;
    endedReason: MatchEndReason;
    roomName: string | null;
    kind: MatchKind;
    mode: MatchMode;
    rematchVotes: string[];
    turnDeadlineAt: number | null;
    turnDurationSeconds: number | null;
    timeoutPlayerId: string | null;
};

export type LeaderboardEntry = {
    userId: string;
    username: string;
    rank: number | null;
    wins: number;
    losses: number;
    draws: number;
    currentWinStreak: number;
    bestWinStreak: number;
    classicWins: number;
    classicLosses: number;
    timedWins: number;
    timedLosses: number;
};

export type LeaderboardSnapshot = {
    leaderboard: LeaderboardEntry[];
    currentPlayer: LeaderboardEntry | null;
};

export type RoomSummary = {
    matchId: string;
    roomName: string;
    size: number;
};

const getEnvValue = (key: string, fallback: string) => {
    const envValue = import.meta.env[key];
    return typeof envValue === 'string' && envValue.trim() ? envValue.trim() : fallback;
};

const DEFAULT_HOST =
    typeof window !== 'undefined' && window.location.hostname
        ? window.location.hostname
        : '127.0.0.1';

const NAKAMA_HOST = getEnvValue('VITE_NAKAMA_HOST', DEFAULT_HOST);
const NAKAMA_PORT = getEnvValue('VITE_NAKAMA_PORT', '7350');
const NAKAMA_SERVER_KEY = getEnvValue('VITE_NAKAMA_SERVER_KEY', 'defaultkey');
const NAKAMA_USE_SSL = getEnvValue('VITE_NAKAMA_USE_SSL', 'false') === 'true';
const DEVICE_ID_STORAGE_KEY = 'nakama_device_id';
const NICKNAME_STORAGE_KEY = 'nakama_nickname';
const SESSION_TOKEN_STORAGE_KEY = 'nakama_session_token';
const ROOM_DIRECTORY_NOTIFICATION_CODE = 4100;

class NakamaService {
    private client: nakama.Client;
    private session: nakama.Session | null = null;
    private socket: nakama.Socket | null = null;
    private currentMatchId: string | null = null;
    private matchStateListener?: (data: GameStateMessage) => void;
    private matchPresenceListener?: (presence: nakama.MatchPresenceEvent) => void;
    private roomDirectoryListener?: () => void;

    constructor() {
        this.client = new nakama.Client(NAKAMA_SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_USE_SSL);
    }

    async authenticate(username: string) {
        const trimmedUsername = username.trim();
        const storage = this.getStorage();
        let deviceId = storage?.getItem(DEVICE_ID_STORAGE_KEY) ?? null;

        if (!deviceId) {
            deviceId = uuidv4();
            storage?.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
        }

        if (this.socket) {
            this.socket.disconnect(false);
        }

        this.session = await this.client.authenticateDevice(deviceId, true, trimmedUsername);
        this.afterAuthenticate(trimmedUsername);

        return this.session;
    }

    async authenticateEmail(email: string, password: string, create: boolean, username?: string) {
        if (this.socket) {
            this.socket.disconnect(false);
        }

        this.session = await this.client.authenticateEmail(email, password, create, username);
        this.afterAuthenticate(this.session.username ?? username);

        return this.session;
    }

    async restoreSession() {
        const storage = this.getStorage();
        const token = storage?.getItem(SESSION_TOKEN_STORAGE_KEY);
        const nickname = storage?.getItem(NICKNAME_STORAGE_KEY);

        if (!token) return null;

        const session = (nakama.Session as any).restore(token);
        if (session.isexpired(Math.floor(Date.now() / 1000))) {
            storage?.removeItem(SESSION_TOKEN_STORAGE_KEY);
            return null;
        }

        this.session = session;
        const socket = this.client.createSocket(NAKAMA_USE_SSL, false);
        await socket.connect(this.session!, false);
        this.socket = socket;
        this.configureSocketListeners();

        return { session, nickname };
    }

    async getAccount() {
        const session = this.getSession();
        return await this.client.getAccount(session);
    }

    setMatchStateListener(listener?: (data: GameStateMessage) => void) {
        this.matchStateListener = listener;
    }

    setMatchPresenceListener(listener?: (presence: nakama.MatchPresenceEvent) => void) {
        this.matchPresenceListener = listener;
    }

    setRoomDirectoryListener(listener?: () => void) {
        this.roomDirectoryListener = listener;
    }

    async findMatch(mode: MatchMode): Promise<string> {
        const socket = this.getSocket();

        return new Promise<string>((resolve, reject) => {
            socket.onmatchmakermatched = async (matched: nakama.MatchmakerMatched) => {
                try {
                    const match = await this.joinMatch(matched.match_id, matched.token);
                    resolve(match.match_id);
                } catch (error) {
                    reject(error);
                }
            };

            socket.addMatchmaker(this.buildMatchmakerQuery(mode), 2, 2, { mode }).catch(reject);
        });
    }

    async createRoom(mode: MatchMode): Promise<string> {
        const session = this.getSession();
        const response = await this.client.rpc(session, 'create_room', { mode });
        const payload = this.parseRpcPayload<CreateRoomResponse>(response);
        const match = await this.joinMatch(payload.matchId);

        return match.match_id;
    }

    async listRooms(): Promise<RoomSummary[]> {
        const session = this.getSession();
        const matchList = await this.client.listMatches(session, 20, true, undefined, 0, 1);

        return (matchList.matches ?? [])
            .flatMap((match) => {
                const label = this.parseMatchLabel(match.label);
                if (!match.match_id || label?.game !== 'tictactoe' || label.kind !== 'room') {
                    return [];
                }

                return [
                    {
                        matchId: match.match_id,
                        roomName: label.roomName?.trim() || 'Open Room',
                        size: match.size ?? 0,
                    },
                ];
            })
            .sort((left, right) => left.roomName.localeCompare(right.roomName));
    }

    async joinRoom(matchId: string): Promise<string> {
        const match = await this.joinMatch(matchId);
        return match.match_id;
    }

    async joinRoomByNumber(roomNumber: string): Promise<string> {
        const session = this.getSession();
        const response = await this.client.rpc(session, 'join_room', { roomNumber });
        const payload = this.parseRpcPayload<JoinRoomResponse>(response);
        const match = await this.joinMatch(payload.matchId);

        return match.match_id;
    }

    async getLeaderboard(): Promise<LeaderboardSnapshot> {
        const session = this.getSession();
        const response = await this.client.rpc(session, 'get_leaderboard', {});
        return this.parseRpcPayload<LeaderboardSnapshot>(response);
    }

    async leaveMatch() {
        const socket = this.socket;
        const matchId = this.currentMatchId;

        this.currentMatchId = null;

        if (!socket || !matchId) {
            return;
        }

        try {
            await socket.leaveMatch(matchId);
        } catch (error) {
            console.warn('Failed to leave match cleanly:', error);
        }
    }

    sendMove(matchId: string, index: number) {
        const socket = this.getSocket();
        const payload = JSON.stringify({ index });
        const data = new TextEncoder().encode(payload);

        socket.sendMatchState(matchId, 2, data);
    }

    requestRematch(matchId: string) {
        const socket = this.getSocket();
        const data = new TextEncoder().encode(JSON.stringify({ rematch: true }));

        socket.sendMatchState(matchId, 3, data);
    }

    getUserId() {
        return this.session?.user_id ?? null;
    }

    getSavedNickname() {
        const nickname = this.getStorage()?.getItem(NICKNAME_STORAGE_KEY)?.trim();
        return nickname || null;
    }

    async logout() {
        await this.leaveMatch();

        if (this.socket) {
            try {
                this.socket.disconnect(false);
            } catch (error) {
                console.warn('Failed to disconnect socket cleanly:', error);
            }
        }

        this.currentMatchId = null;
        this.socket = null;
        this.session = null;

        const storage = this.getStorage();
        storage?.removeItem(DEVICE_ID_STORAGE_KEY);
        storage?.removeItem(NICKNAME_STORAGE_KEY);
        storage?.removeItem(SESSION_TOKEN_STORAGE_KEY);
    }

    private async afterAuthenticate(nickname?: string) {
        const storage = this.getStorage();
        if (this.session) {
            storage?.setItem(SESSION_TOKEN_STORAGE_KEY, this.session.token);
            if (nickname) {
                storage?.setItem(NICKNAME_STORAGE_KEY, nickname);
            }
        }

        this.socket = this.client.createSocket(NAKAMA_USE_SSL, false);
        await this.socket.connect(this.session!, false);
        this.configureSocketListeners();
    }

    private configureSocketListeners() {
        const socket = this.getSocket();

        socket.onmatchdata = (result: nakama.MatchData) => {
            if (result.op_code !== 1) {
                return;
            }

            try {
                const decoded = new TextDecoder().decode(result.data);
                const data = JSON.parse(decoded) as GameStateMessage;
                this.matchStateListener?.(data);
            } catch (error) {
                console.error('Failed to decode match state:', error);
            }
        };

        socket.onmatchpresence = (presence: nakama.MatchPresenceEvent) => {
            if (this.currentMatchId === presence.match_id) {
                this.matchPresenceListener?.(presence);
            }
        };

        socket.onnotification = (notification: nakama.Notification) => {
            if (notification.code === ROOM_DIRECTORY_NOTIFICATION_CODE) {
                this.roomDirectoryListener?.();
            }
        };
    }

    async joinMatch(matchId: string, token?: string): Promise<nakama.Match> {
        const socket = this.getSocket();
        const match = await socket.joinMatch(matchId, token);
        this.currentMatchId = match.match_id;

        // Trigger presence listener with initial joins
        if (match.presences && match.presences.length > 0) {
            this.matchPresenceListener?.({
                match_id: match.match_id,
                joins: match.presences,
                leaves: [],
            });
        }

        return match;
    }

    private getSession() {
        if (!this.session) {
            throw new Error('Not authenticated');
        }

        return this.session;
    }

    private getSocket() {
        if (!this.socket) {
            throw new Error('Socket not connected');
        }

        return this.socket;
    }

    private parseRpcPayload<T>(response: nakama.RpcResponse): T {
        if (!response.payload) {
            throw new Error('Empty RPC response payload');
        }

        return response.payload as T;
    }

    private parseMatchLabel(label?: string): MatchLabel | null {
        if (!label) {
            return null;
        }

        try {
            return JSON.parse(label) as MatchLabel;
        } catch {
            return null;
        }
    }

    private getStorage() {
        if (typeof window === 'undefined') {
            return null;
        }

        return window.localStorage;
    }

    private buildMatchmakerQuery(mode: MatchMode) {
        return `+properties.mode:${mode}`;
    }
}

export const nakamaService = new NakamaService();
