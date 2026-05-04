import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  monitors: [],
  loading: false,
  error: null,
};

const monitorSlice = createSlice({
  name: "monitor",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setMonitors: (state, action) => {
      state.monitors = action.payload;
      state.error = null;
    },
    addMonitor: (state, action) => {
      // Unshift adds the new monitor to the beginning (latest first)
      state.monitors.unshift(action.payload);
      state.error = null;
    },
    removeMonitor: (state, action) => {
      // Filter out the monitor by _id
      state.monitors = state.monitors.filter(
        (monitor) => monitor._id !== action.payload
      );
      state.error = null;
    },
    updateMonitorStatus: (state, action) => {
      // Find monitor by _id and update status and lastChecked
      const { _id, status, lastChecked } = action.payload;
      const monitor = state.monitors.find((m) => m._id === _id);
      
      if (monitor) {
        if (status !== undefined) monitor.status = status;
        if (lastChecked !== undefined) monitor.lastChecked = lastChecked;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setMonitors,
  addMonitor,
  removeMonitor,
  updateMonitorStatus,
} = monitorSlice.actions;

export const selectMonitors = (state) => state.monitor.monitors;
export const selectLoading = (state) => state.monitor.loading;
export const selectError = (state) => state.monitor.error;

export default monitorSlice.reducer;
