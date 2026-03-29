import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { LeaderboardEntry, MatchMode } from '../../services/nakama';

interface LobbyState {
  leaderboard: LeaderboardEntry[];
  currentPlayerStats: LeaderboardEntry | null;
  leaderboardLoading: boolean;
  selectedMode: MatchMode;
  joinRoomNumberInput: string;
}

const initialState: LobbyState = {
  leaderboard: [],
  currentPlayerStats: null,
  leaderboardLoading: false,
  selectedMode: 'classic',
  joinRoomNumberInput: '',
};

const lobbySlice = createSlice({
  name: 'lobby',
  initialState,
  reducers: {
    setLeaderboard: (state, action: PayloadAction<LeaderboardEntry[]>) => {
      state.leaderboard = action.payload;
    },
    setCurrentPlayerStats: (state, action: PayloadAction<LeaderboardEntry | null>) => {
      state.currentPlayerStats = action.payload;
    },
    setLeaderboardLoading: (state, action: PayloadAction<boolean>) => {
      state.leaderboardLoading = action.payload;
    },
    setSelectedMode: (state, action: PayloadAction<MatchMode>) => {
      state.selectedMode = action.payload;
    },
    setJoinRoomNumberInput: (state, action: PayloadAction<string>) => {
      state.joinRoomNumberInput = action.payload;
    },
  },
});

export const { setLeaderboard, setCurrentPlayerStats, setLeaderboardLoading, setSelectedMode, setJoinRoomNumberInput } = lobbySlice.actions;
export default lobbySlice.reducer;
