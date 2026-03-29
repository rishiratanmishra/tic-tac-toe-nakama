import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import gameReducer from './slices/gameSlice';
import lobbyReducer from './slices/lobbySlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    game: gameReducer,
    lobby: lobbyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
