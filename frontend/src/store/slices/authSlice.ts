import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  username: string;
  email: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  username: '',
  email: null,
  userId: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ username: string; userId: string; email?: string | null }>) => {
      state.username = action.payload.username;
      state.userId = action.payload.userId;
      state.email = action.payload.email ?? null;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.username = '';
      state.userId = null;
      state.email = null;
      state.isAuthenticated = false;
    },
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },
  },
});

export const { setAuth, logout, setUsername } = authSlice.actions;
export default authSlice.reducer;
