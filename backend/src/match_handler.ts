const OP_STATE = 1;
const OP_MOVE = 2;
const OP_REMATCH = 3;
const MATCH_CLOSE_GRACE_TICKS = 1;
const ROOM_NUMBER_LENGTH = 4;
const MAX_ROOM_NUMBER_ATTEMPTS = 50;
const TURN_DURATION_SECONDS = 30;
const GLOBAL_RANKING_LEADERBOARD_ID = 'tictactoe_global_ranking';
const SORT_ORDER_DESC = 'descending' as nkruntime.SortOrder;
const OPERATOR_SET = 'set' as nkruntime.Operator;
const OVERRIDE_OPERATOR_SET = 'set' as nkruntime.OverrideOperator;

type MatchKind = 'matchmaking' | 'room';
export type MatchMode = 'classic' | 'timed';
type MatchEndReason = 'completed' | 'draw' | 'opponent_left' | 'timeout' | null;

type LeaderboardMetadata = {
    wins: number;
    losses: number;
    draws: number;
    currentWinStreak: number;
    bestWinStreak: number;
    classicWins: number;
    classicLosses: number;
    timedWins: number;
    timedLosses: number;
    updatedAt: string | null;
};

type LeaderboardProfile = LeaderboardMetadata & {
    userId: string;
    username: string;
    rank: number | null;
    score: number;
    subscore: number;
};

type LeaderboardRpcEntry = {
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

type TicTacToeMatchState = {
    board: (string | null)[];
    marks: {[key: string]: string};
    players: {[key: string]: string};
    presences: {[key: string]: nkruntime.Presence};
    turn: string | null;
    winner: string | null;
    endedReason: MatchEndReason;
    roomName: string | null;
    kind: MatchKind;
    mode: MatchMode;
    closeTick: number | null;
    rematchVotes: string[];
    turnDeadlineAt: number | null;
    turnDurationSeconds: number | null;
    timeoutPlayerId: string | null;
    resultPersisted: boolean;
};

const normalizeRoomNumber = (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return null;
    }

    const digitsOnly = `${value}`.replace(/\D/g, '').slice(0, 8);
    return digitsOnly || null;
};

const normalizeMatchMode = (value: unknown): MatchMode => (value === 'timed' ? 'timed' : 'classic');

const formatRoomLabel = (roomNumber: string | null) => (roomNumber ? `Room ${roomNumber}` : 'Open Room');

const buildMatchLabel = (kind: MatchKind, roomName: string | null) =>
    JSON.stringify({
        game: 'tictactoe',
        kind,
        roomName,
    });

const findOpenRoomByNumber = (nk: nkruntime.Nakama, roomNumber: string) => {
    const roomName = formatRoomLabel(roomNumber);
    const matches = nk.matchList(10, true, buildMatchLabel('room', roomName), 0, 1, null);
    return matches[0] ?? null;
};

const generateRoomNumber = () =>
    `${Math.floor(Math.random() * (10 ** ROOM_NUMBER_LENGTH))}`.padStart(ROOM_NUMBER_LENGTH, '0');

const createUniqueRoomNumber = (nk: nkruntime.Nakama) => {
    for (let attempt = 0; attempt < MAX_ROOM_NUMBER_ATTEMPTS; attempt += 1) {
        const candidate = generateRoomNumber();
        if (!findOpenRoomByNumber(nk, candidate)) {
            return candidate;
        }
    }

    throw new Error('Unable to allocate a room number right now.');
};

const createDefaultLeaderboardMetadata = (): LeaderboardMetadata => ({
    wins: 0,
    losses: 0,
    draws: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    classicWins: 0,
    classicLosses: 0,
    timedWins: 0,
    timedLosses: 0,
    updatedAt: null,
});

const parseLeaderboardMetadata = (metadata: {[key: string]: any} | undefined): LeaderboardMetadata => {
    const readNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

    return {
        wins: readNumber(metadata?.wins),
        losses: readNumber(metadata?.losses),
        draws: readNumber(metadata?.draws),
        currentWinStreak: readNumber(metadata?.currentWinStreak),
        bestWinStreak: readNumber(metadata?.bestWinStreak),
        classicWins: readNumber(metadata?.classicWins),
        classicLosses: readNumber(metadata?.classicLosses),
        timedWins: readNumber(metadata?.timedWins),
        timedLosses: readNumber(metadata?.timedLosses),
        updatedAt: typeof metadata?.updatedAt === 'string' ? metadata.updatedAt : null,
    };
};

const buildLeaderboardProfile = (
    record: nkruntime.LeaderboardRecord | null | undefined,
    fallbackUserId: string,
    fallbackUsername: string,
): LeaderboardProfile => {
    const metadata = record ? parseLeaderboardMetadata(record.metadata) : createDefaultLeaderboardMetadata();
    const score = record?.score ?? metadata.wins;
    const subscore = record?.subscore ?? metadata.bestWinStreak;

    return {
        userId: fallbackUserId,
        username: record?.username || fallbackUsername,
        rank: typeof record?.rank === 'number' ? record.rank : null,
        wins: score,
        losses: metadata.losses,
        draws: metadata.draws,
        currentWinStreak: metadata.currentWinStreak,
        bestWinStreak: subscore,
        classicWins: metadata.classicWins,
        classicLosses: metadata.classicLosses,
        timedWins: metadata.timedWins,
        timedLosses: metadata.timedLosses,
        updatedAt: metadata.updatedAt,
        score,
        subscore,
    };
};

const toLeaderboardEntry = (profile: LeaderboardProfile): LeaderboardRpcEntry => ({
    userId: profile.userId,
    username: profile.username,
    rank: profile.rank,
    wins: profile.wins,
    losses: profile.losses,
    draws: profile.draws,
    currentWinStreak: profile.currentWinStreak,
    bestWinStreak: profile.bestWinStreak,
    classicWins: profile.classicWins,
    classicLosses: profile.classicLosses,
    timedWins: profile.timedWins,
    timedLosses: profile.timedLosses,
});

const getAssignedPlayerIds = (state: TicTacToeMatchState) => Object.keys(state.marks);
const getActivePlayerIds = (state: TicTacToeMatchState) => Object.keys(state.presences);
const getOpponentId = (state: TicTacToeMatchState, userId: string) =>
    getAssignedPlayerIds(state).find((id) => id !== userId) ?? null;
const hasBothPlayersReady = (state: TicTacToeMatchState) =>
    getAssignedPlayerIds(state).length === 2 && getActivePlayerIds(state).length === 2;

const buildStatePayload = (state: TicTacToeMatchState) => ({
    board: state.board,
    marks: state.marks,
    players: state.players,
    activePlayers: getActivePlayerIds(state),
    turn: state.turn,
    winner: state.winner,
    endedReason: state.endedReason,
    roomName: state.roomName,
    kind: state.kind,
    mode: state.mode,
    rematchVotes: state.rematchVotes,
    turnDeadlineAt: state.turnDeadlineAt,
    turnDurationSeconds: state.turnDurationSeconds,
    timeoutPlayerId: state.timeoutPlayerId,
});

const broadcastState = (dispatcher: nkruntime.MatchDispatcher, state: TicTacToeMatchState) => {
    dispatcher.broadcastMessage(OP_STATE, JSON.stringify(buildStatePayload(state)), null, null);
};

const broadcastRoomDirectoryUpdate = (
    nk: nkruntime.Nakama,
    logger: nkruntime.Logger,
    reason: string,
    roomName: string | null,
) => {
    return;
};

const getPlayerIdByMark = (state: TicTacToeMatchState, targetMark: string) =>
    Object.entries(state.marks).find(([, mark]) => mark === targetMark)?.[0] ?? null;

const refreshTurnDeadline = (state: TicTacToeMatchState) => {
    if (state.mode !== 'timed' || !state.turn || state.winner || !hasBothPlayersReady(state)) {
        state.turnDeadlineAt = null;
        return;
    }

    state.turnDeadlineAt = Date.now() + TURN_DURATION_SECONDS * 1000;
};

const finalizeRound = (
    state: TicTacToeMatchState,
    tick: number,
    winner: string,
    endedReason: Exclude<MatchEndReason, null>,
    timeoutPlayerId: string | null = null,
) => {
    state.winner = winner;
    state.endedReason = endedReason;
    state.turn = null;
    state.timeoutPlayerId = timeoutPlayerId;
    state.turnDeadlineAt = null;
    state.rematchVotes = [];
    state.closeTick = state.kind === 'room' && endedReason !== 'opponent_left' ? null : tick + MATCH_CLOSE_GRACE_TICKS;
};

const loadLeaderboardProfiles = (
    nk: nkruntime.Nakama,
    userIds: string[],
    playerNames: {[key: string]: string},
) => {
    const ownerRecords = nk.leaderboardRecordsList(GLOBAL_RANKING_LEADERBOARD_ID, userIds, userIds.length).ownerRecords ?? [];
    const recordByOwnerId = new Map(
        ownerRecords.map((record) => [record.ownerId.toLowerCase(), record] as const),
    );

    return new Map(
        userIds.map((userId) => {
            const username = playerNames[userId] ?? `Player ${userId.slice(0, 6)}`;
            return [userId, buildLeaderboardProfile(recordByOwnerId.get(userId), userId, username)] as const;
        }),
    );
};

const persistLeaderboardProfile = (nk: nkruntime.Nakama, profile: LeaderboardProfile) => {
    nk.leaderboardRecordWrite(
        GLOBAL_RANKING_LEADERBOARD_ID,
        profile.userId,
        profile.username,
        profile.wins,
        profile.bestWinStreak,
        {
            wins: profile.wins,
            losses: profile.losses,
            draws: profile.draws,
            currentWinStreak: profile.currentWinStreak,
            bestWinStreak: profile.bestWinStreak,
            classicWins: profile.classicWins,
            classicLosses: profile.classicLosses,
            timedWins: profile.timedWins,
            timedLosses: profile.timedLosses,
            updatedAt: profile.updatedAt,
        },
        OVERRIDE_OPERATOR_SET,
    );
};

const persistResolvedMatchResult = (
    nk: nkruntime.Nakama,
    logger: nkruntime.Logger,
    state: TicTacToeMatchState,
) => {
    if (state.resultPersisted || !state.endedReason) {
        return;
    }

    const assignedPlayerIds = getAssignedPlayerIds(state);
    if (assignedPlayerIds.length < 2) {
        return;
    }

    try {
        const profiles = loadLeaderboardProfiles(nk, assignedPlayerIds, state.players);
        const updatedAt = new Date().toISOString();

        if (state.endedReason === 'draw' || state.winner === 'draw') {
            for (const userId of assignedPlayerIds) {
                const profile = profiles.get(userId);
                if (!profile) {
                    continue;
                }

                profile.draws += 1;
                profile.currentWinStreak = 0;
                profile.updatedAt = updatedAt;
                persistLeaderboardProfile(nk, profile);
            }

            state.resultPersisted = true;
            return;
        }

        const winnerId = state.winner?.toLowerCase() ?? null;
        const loserId = winnerId ? getOpponentId(state, winnerId) : null;
        if (!winnerId || !loserId) {
            return;
        }

        const winnerProfile = profiles.get(winnerId);
        const loserProfile = profiles.get(loserId);
        if (!winnerProfile || !loserProfile) {
            return;
        }

        winnerProfile.wins += 1;
        winnerProfile.currentWinStreak += 1;
        winnerProfile.bestWinStreak = Math.max(winnerProfile.bestWinStreak, winnerProfile.currentWinStreak);
        winnerProfile.updatedAt = updatedAt;

        loserProfile.losses += 1;
        loserProfile.currentWinStreak = 0;
        loserProfile.updatedAt = updatedAt;

        if (state.mode === 'timed') {
            winnerProfile.timedWins += 1;
            loserProfile.timedLosses += 1;
        } else {
            winnerProfile.classicWins += 1;
            loserProfile.classicLosses += 1;
        }

        persistLeaderboardProfile(nk, winnerProfile);
        persistLeaderboardProfile(nk, loserProfile);
        state.resultPersisted = true;
    } catch (error) {
        logger.error(`persistResolvedMatchResult: ${error}`);
    }
};

const resetBoardForRematch = (state: TicTacToeMatchState) => {
    state.board = Array(9).fill(null);
    state.turn = getPlayerIdByMark(state, 'X');
    state.winner = null;
    state.endedReason = null;
    state.closeTick = null;
    state.rematchVotes = [];
    state.turnDeadlineAt = null;
    state.timeoutPlayerId = null;
    state.resultPersisted = false;
    refreshTurnDeadline(state);
};

export const matchInit: nkruntime.MatchInitFunction<TicTacToeMatchState> = (ctx, logger, nk, params) => {
    logger.info('matchInit: Initializing new Tic-Tac-Toe match');

    const kind: MatchKind = params.kind === 'room' ? 'room' : 'matchmaking';
    const roomNumber = kind === 'room' ? normalizeRoomNumber(params.roomName) : null;
    const roomName = kind === 'room' ? formatRoomLabel(roomNumber) : null;
    const mode = normalizeMatchMode(params.mode);

    const state: TicTacToeMatchState = {
        board: Array(9).fill(null),
        marks: {},
        players: {},
        presences: {},
        turn: null,
        winner: null,
        endedReason: null,
        roomName,
        kind,
        mode,
        closeTick: null,
        rematchVotes: [],
        turnDeadlineAt: null,
        turnDurationSeconds: mode === 'timed' ? TURN_DURATION_SECONDS : null,
        timeoutPlayerId: null,
        resultPersisted: false,
    };

    return {
        state,
        tickRate: 1,
        label: buildMatchLabel(kind, roomName),
    };
};

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<TicTacToeMatchState> = (
    ctx,
    logger,
    nk,
    dispatcher,
    tick,
    state,
    presence,
    metadata,
) => {
    const userId = presence.userId.toLowerCase();
    const knownPlayer = Boolean(state.marks[userId]);
    const activePlayerCount = getActivePlayerIds(state).length;
    const totalAssignedPlayers = getAssignedPlayerIds(state).length;

    logger.info(
        'matchJoinAttempt: Current presences = ' + activePlayerCount + ', New arrival = ' + presence.username,
    );

    if (state.winner && !knownPlayer) {
        return { state, accept: false, rejectMessage: 'Match already finished' };
    }

    if (!knownPlayer && (activePlayerCount >= 2 || totalAssignedPlayers >= 2)) {
        return { state, accept: false, rejectMessage: 'Match is full' };
    }

    return { state, accept: true };
};

export const matchJoin: nkruntime.MatchJoinFunction<TicTacToeMatchState> = (
    ctx,
    logger,
    nk,
    dispatcher,
    tick,
    state,
    presences,
) => {
    for (const presence of presences) {
        const userId = presence.userId.toLowerCase();
        logger.info('matchJoin: User ' + presence.username + ' (ID: ' + userId + ') joined');

        state.presences[userId] = presence;
        state.players[userId] = presence.username;

        if (!state.marks[userId]) {
            const assignedCount = getAssignedPlayerIds(state).length;
            if (assignedCount === 0) {
                state.marks[userId] = 'X';
                state.turn = userId;
                logger.info('matchJoin: Assigned X to ' + presence.username + ' (' + userId + ')');
            } else if (assignedCount === 1) {
                state.marks[userId] = 'O';
                logger.info('matchJoin: Assigned O to ' + presence.username + ' (' + userId + ')');
            }
        }
    }

    refreshTurnDeadline(state);
    broadcastState(dispatcher, state);

    if (state.kind === 'room') {
        broadcastRoomDirectoryUpdate(nk, logger, 'room_joined', state.roomName);
    }

    return { state };
};

export const matchLeave: nkruntime.MatchLeaveFunction<TicTacToeMatchState> = (
    ctx,
    logger,
    nk,
    dispatcher,
    tick,
    state,
    presences,
) => {
    for (const presence of presences) {
        logger.info('matchLeave: User ' + presence.username + ' left');
        delete state.presences[presence.userId.toLowerCase()];
    }

    const activePlayers = getActivePlayerIds(state);

    if (activePlayers.length === 0) {
        logger.info('matchLeave: No active players remain, terminating match');

        if (state.kind === 'room') {
            broadcastRoomDirectoryUpdate(nk, logger, 'room_closed', state.roomName);
        }

        return null;
    }

    if (getAssignedPlayerIds(state).length === 2 && activePlayers.length === 1 && !state.winner) {
        finalizeRound(state, tick, activePlayers[0], 'opponent_left');
        logger.info('matchLeave: Opponent disconnected, awarding match to ' + state.winner);
        persistResolvedMatchResult(nk, logger, state);
    } else {
        refreshTurnDeadline(state);
    }

    broadcastState(dispatcher, state);

    if (state.kind === 'room') {
        broadcastRoomDirectoryUpdate(nk, logger, 'room_left', state.roomName);
    }

    return { state };
};

export const matchLoop: nkruntime.MatchLoopFunction<TicTacToeMatchState> = (
    ctx,
    logger,
    nk,
    dispatcher,
    tick,
    state,
    messages,
) => {
    if (
        !state.winner &&
        state.mode === 'timed' &&
        state.turn &&
        state.turnDeadlineAt !== null &&
        Date.now() >= state.turnDeadlineAt
    ) {
        const timedOutPlayerId = state.turn.toLowerCase();
        const winnerId = getOpponentId(state, timedOutPlayerId);

        if (winnerId) {
            finalizeRound(state, tick, winnerId, 'timeout', timedOutPlayerId);
            logger.info(`matchLoop: Timed move forfeit. ${timedOutPlayerId} ran out of time.`);
            persistResolvedMatchResult(nk, logger, state);
            broadcastState(dispatcher, state);
        }
    }

    if (state.closeTick !== null && tick >= state.closeTick) {
        logger.info('matchLoop: Closing completed match');
        return null;
    }

    if (tick % 10 === 0) {
        logger.info(
            `matchLoop: Tick ${tick} | Marks: ${JSON.stringify(state.marks)} | Turn: ${state.turn} | Mode: ${state.mode}`,
        );
    }

    if (messages.length > 0) {
        logger.info(`matchLoop: TICK ${tick} | RECEIVED ${messages.length} MESSAGES`);
    }

    for (const message of messages) {
        const sender = message.sender;
        const userId = sender ? sender.userId.toLowerCase() : null;
        const username = sender ? sender.username : 'SYSTEM';

        logger.info(`matchLoop: TICK ${tick} | OpCode ${message.opCode} | From: ${username} (${userId})`);

        if (message.opCode !== OP_MOVE && message.opCode !== OP_REMATCH) {
            continue;
        }

        try {
            if (!sender || !userId) {
                logger.error('matchLoop: Missing presence/userId');
                continue;
            }

            if (message.opCode === OP_REMATCH) {
                if (!state.winner || state.kind !== 'room' || state.endedReason === 'opponent_left') {
                    logger.info('matchLoop: Ignoring rematch request, match is not rematchable');
                    continue;
                }

                const activePlayers = getActivePlayerIds(state);
                if (!activePlayers.includes(userId) || activePlayers.length < 2) {
                    logger.info('matchLoop: Ignoring rematch request, missing both active players');
                    continue;
                }

                if (!state.rematchVotes.includes(userId)) {
                    state.rematchVotes.push(userId);
                    logger.info(`matchLoop: ${username} requested a rematch`);
                }

                if (activePlayers.every((id) => state.rematchVotes.includes(id))) {
                    resetBoardForRematch(state);
                    logger.info('matchLoop: Rematch accepted by both players, resetting board');
                }

                broadcastState(dispatcher, state);
                continue;
            }

            if (state.winner) {
                logger.info('matchLoop: Ignoring move, game already finished');
                continue;
            }

            const payload = JSON.parse(nk.binaryToString(message.data)) as {index?: number};
            const index = Number(payload.index);
            const currentTurn = state.turn ? state.turn.toLowerCase() : '';

            logger.info(`matchLoop: MOVE Index=${index} | CurrentTurn=${currentTurn} | Requestor=${userId}`);

            if (currentTurn !== userId) {
                logger.info(`matchLoop: REJECT MOVE. Not ${username}'s turn.`);
                continue;
            }

            if (!Number.isInteger(index) || index < 0 || index >= state.board.length) {
                logger.info(`matchLoop: REJECT MOVE. Invalid cell ${payload.index}.`);
                continue;
            }

            if (state.board[index] !== null) {
                logger.info(`matchLoop: REJECT MOVE. Cell ${index} occupied.`);
                continue;
            }

            const mark = state.marks[userId];
            if (!mark) {
                logger.error(`matchLoop: FAILED. No mark found for UID: ${userId} in ${JSON.stringify(state.marks)}`);
                continue;
            }

            state.board[index] = mark;
            logger.info(`matchLoop: ACCEPTED. ${username} (${mark}) at index ${index}`);

            const win = checkWin(state.board);
            if (win) {
                finalizeRound(
                    state,
                    tick,
                    win === 'draw' ? 'draw' : userId,
                    win === 'draw' ? 'draw' : 'completed',
                );
                logger.info(`matchLoop: GAME OVER. Winner: ${state.winner}`);
                persistResolvedMatchResult(nk, logger, state);
            } else {
                state.turn = getOpponentId(state, userId);
                state.endedReason = null;
                state.closeTick = null;
                state.rematchVotes = [];
                state.timeoutPlayerId = null;
                state.resultPersisted = false;
                refreshTurnDeadline(state);
                logger.info(`matchLoop: Next Turn: ${state.turn}`);
            }

            broadcastState(dispatcher, state);
            logger.info('matchLoop: Dispatched immediate move update');
        } catch (error) {
            logger.error(`matchLoop: Error: ${error}`);
        }
    }

    return { state };
};

const checkWin = (board: (string | null)[]): string | null => {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    if (board.every((cell) => cell !== null)) {
        return 'draw';
    }

    return null;
};

export const ensureGlobalRankingLeaderboard = (logger: nkruntime.Logger, nk: nkruntime.Nakama) => {
    try {
        nk.leaderboardCreate(
            GLOBAL_RANKING_LEADERBOARD_ID,
            true,
            SORT_ORDER_DESC,
            OPERATOR_SET,
            null,
            {
                game: 'tictactoe',
                ranking: 'wins_then_best_streak',
            },
            true,
        );
        logger.info(`ensureGlobalRankingLeaderboard: Created ${GLOBAL_RANKING_LEADERBOARD_ID}`);
    } catch (error) {
        const message = `${error}`.toLowerCase();
        if (message.includes('already exists')) {
            logger.info(`ensureGlobalRankingLeaderboard: ${GLOBAL_RANKING_LEADERBOARD_ID} already exists`);
            return;
        }

        logger.error(`ensureGlobalRankingLeaderboard: ${error}`);
    }
};

export const createRoomRpc: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
    const parsedPayload = payload ? (JSON.parse(payload) as {mode?: MatchMode}) : {};
    const roomNumber = createUniqueRoomNumber(nk);
    const roomName = formatRoomLabel(roomNumber);
    const mode = normalizeMatchMode(parsedPayload.mode);

    const matchId = nk.matchCreate('tictactoe', {
        kind: 'room',
        roomName: roomNumber,
        mode,
    });

    logger.info(`createRoomRpc: Created room "${roomName}" (${matchId}) in ${mode} mode`);
    broadcastRoomDirectoryUpdate(nk, logger, 'room_created', roomName);
    return JSON.stringify({ matchId, roomName, roomNumber, mode });
};

export const joinRoomRpc: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
    let roomNumber: string | null = null;

    if (payload) {
        const parsedPayload = JSON.parse(payload) as {roomNumber?: string | number};
        roomNumber = normalizeRoomNumber(parsedPayload.roomNumber);
    }

    if (!roomNumber) {
        throw new Error('Room number is required.');
    }

    const roomName = formatRoomLabel(roomNumber);
    const existingRoom = findOpenRoomByNumber(nk, roomNumber);

    if (!existingRoom?.matchId) {
        throw new Error(`Room ${roomNumber} was not found.`);
    }

    logger.info(`joinRoomRpc: Found room "${roomName}" (${existingRoom.matchId})`);
    return JSON.stringify({ matchId: existingRoom.matchId, roomName, roomNumber });
};

export const getLeaderboardRpc: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
    const topRecords = nk.leaderboardRecordsList(GLOBAL_RANKING_LEADERBOARD_ID, [], 10).records ?? [];
    const currentOwnerRecords = ctx.userId
        ? nk.leaderboardRecordsList(GLOBAL_RANKING_LEADERBOARD_ID, [ctx.userId], 1).ownerRecords ?? []
        : [];

    const leaderboard = topRecords.map((record) =>
        toLeaderboardEntry(buildLeaderboardProfile(record, record.ownerId.toLowerCase(), record.username)),
    );

    const currentPlayer = ctx.userId
        ? toLeaderboardEntry(
              buildLeaderboardProfile(
                  currentOwnerRecords[0],
                  ctx.userId.toLowerCase(),
                  ctx.username ?? 'Player',
              ),
          )
        : null;

    return JSON.stringify({ leaderboard, currentPlayer });
};

export const matchTerminate: nkruntime.MatchTerminateFunction<TicTacToeMatchState> = (
    ctx,
    logger,
    nk,
    dispatcher,
    tick,
    state,
    graceSeconds,
) => {
    logger.info('matchTerminate: Match ended');

    if (state.kind === 'room') {
        broadcastRoomDirectoryUpdate(nk, logger, 'room_terminated', state.roomName);
    }

    return { state };
};

export const matchSignal: nkruntime.MatchSignalFunction<TicTacToeMatchState> = (
    ctx,
    logger,
    nk,
    dispatcher,
    tick,
    state,
    data,
) => {
    return { state, data };
};
