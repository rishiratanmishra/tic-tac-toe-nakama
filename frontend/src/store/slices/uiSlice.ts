import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  pendingAction: string | null;
  errorMessage: string | null;
}

const initialState: UIState = {
  pendingAction: null,
  errorMessage: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setPendingAction: (state, action: PayloadAction<string | null>) => {
      state.pendingAction = action.payload;
    },
    setErrorMessage: (state, action: PayloadAction<string | null>) => {
      state.errorMessage = action.payload;
    },
  },
});

export const { setPendingAction, setErrorMessage } = uiSlice.actions;
export default uiSlice.reducer;
