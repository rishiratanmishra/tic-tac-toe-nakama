import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GameStateMessage, MatchEndReason, MatchKind, MatchMode } from '../../services/nakama';

const createEmptyBoard = () => Array(9).fill(null) as (string | null)[];

interface GameState {
  matchId: string | null;
  board: (string | null)[];
  marks: Record<string, string>;
  players: Record<string, string>;
  activePlayers: string[];
  turn: string | null;
  winner: string | null;
  endedReason: MatchEndReason;
  roomName: string | null;
  matchKind: MatchKind | null;
  matchMode: MatchMode | null;
  rematchVotes: string[];
  turnDeadlineAt: number | null;
  turnDurationSeconds: number | null;
  timeoutPlayerId: string | null;
  lastUpdate: number;
}

const initialState: GameState = {
  matchId: null,
  board: createEmptyBoard(),
  marks: {},
  players: {},
  activePlayers: [],
  turn: null,
  winner: null,
  endedReason: null,
  roomName: null,
  matchKind: null,
  matchMode: null,
  rematchVotes: [],
  turnDeadlineAt: null,
  turnDurationSeconds: null,
  timeoutPlayerId: null,
  lastUpdate: Date.now(),
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setMatchId: (state, action: PayloadAction<string | null>) => {
      state.matchId = action.payload;
    },
    setRoomMetadata: (state, action: PayloadAction<{ matchId: string; roomName: string | null; mode: MatchMode | null; kind: MatchKind | null }>) => {
      state.matchId = action.payload.matchId;
      state.roomName = action.payload.roomName;
      state.matchMode = action.payload.mode;
      state.matchKind = action.payload.kind;
    },
    updateGameState: (state, action: PayloadAction<GameStateMessage>) => {
      const msg = action.payload;
      state.board = msg.board;
      state.marks = msg.marks;
      state.players = msg.players;
      state.activePlayers = msg.activePlayers;
      state.turn = msg.turn;
      state.winner = msg.winner;
      state.endedReason = msg.endedReason;
      state.roomName = msg.roomName;
      state.matchKind = msg.kind;
      state.matchMode = msg.mode;
      state.rematchVotes = msg.rematchVotes;
      state.turnDeadlineAt = msg.turnDeadlineAt;
      state.turnDurationSeconds = msg.turnDurationSeconds;
      state.timeoutPlayerId = msg.timeoutPlayerId;
      state.lastUpdate = Date.now();
    },
    resetGame: () => initialState,
    setRematchVotes: (state, action: PayloadAction<string[]>) => {
      state.rematchVotes = action.payload;
    },
    handlePresenceUpdate: (state, action: PayloadAction<{ joins: string[]; leaves: string[] }>) => {
      const { joins, leaves } = action.payload;
      const current = new Set(state.activePlayers);
      leaves.forEach((id) => current.delete(id));
      joins.forEach((id) => current.add(id));
      state.activePlayers = Array.from(current);
    },
    updateBoardLocal: (state, action: PayloadAction<{ index: number; mark: string }>) => {
      state.board[action.payload.index] = action.payload.mark;
    },
  },
});

export const { setMatchId, setRoomMetadata, updateGameState, resetGame, setRematchVotes, handlePresenceUpdate, updateBoardLocal } = gameSlice.actions;
export default gameSlice.reducer;
