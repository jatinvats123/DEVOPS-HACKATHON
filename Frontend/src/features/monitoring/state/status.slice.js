import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  statusData: {}, // key: monitorId -> { status, lastChecked, logs }
  loading: false,
  error: null,
};

const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    setStatusLoading: (state, action) => {
      state.loading = action.payload;
    },
    setStatusError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setMonitorStatus: (state, action) => {
      const { monitorId, status, lastChecked, logs } = action.payload;
      state.statusData[monitorId] = { status, lastChecked, logs };
      state.error = null;
    },
  },
});

export const { setStatusLoading, setStatusError, setMonitorStatus } =
  statusSlice.actions;

export const selectStatusData = (state) => state.status.statusData;
export const selectStatusLoading = (state) => state.status.loading;
export const selectStatusError = (state) => state.status.error;

export default statusSlice.reducer;
