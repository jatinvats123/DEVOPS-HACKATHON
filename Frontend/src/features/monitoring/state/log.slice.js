import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  logs: [],
  selectedLogs: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const logSlice = createSlice({
  name: 'log',
  initialState,
  reducers: {
    setLogsLoading: (state, action) => {
      state.loading = action.payload;
    },
    setLogsError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setLogs: (state, action) => {
      state.logs = action.payload;
      state.error = null;
      state.lastFetched = Date.now();
    },
    setSelectedLogs: (state, action) => {
      state.selectedLogs = action.payload;
      state.error = null;
    },
    addLog: (state, action) => {
      // Latest first
      state.logs.unshift(action.payload);
      // If it belongs to currently selected monitor, we could add it, but for simplicity we rely on selectedLogs refetch or explicit checks
    },
    clearSelectedLogs: (state) => {
      state.selectedLogs = [];
    },
  },
});

export const {
  setLogsLoading,
  setLogsError,
  setLogs,
  setSelectedLogs,
  addLog,
  clearSelectedLogs,
} = logSlice.actions;

export const selectLogs = (state) => state.log.logs;
export const selectSelectedLogs = (state) => state.log.selectedLogs;
export const selectLogsLoading = (state) => state.log.loading;
export const selectLogsError = (state) => state.log.error;

export default logSlice.reducer;
