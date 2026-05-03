import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  monitors: [],
  incidents: [],
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
    setMonitors: (state, action) => {
      // Assuming getMonitors returns an array of monitor objects
      state.monitors = action.payload;
      state.error = null;
    },
    addMonitor: (state, action) => {
      // Assuming createMonitoring returns the created monitor object
      state.monitors.push(action.payload);
      state.error = null;
    },
    setIncidents: (state, action) => {
      state.incidents = action.payload;
      state.error = null;
    },

    removeMonitor: (state, action) => {
      // Assuming deleteMonitor returns confirmation and we remove by id or _id
      state.monitors = state.monitors.filter(
        (monitor) =>
          monitor._id !== action.payload && monitor.id !== action.payload,
      );
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setLoading,
  setMonitors,
  addMonitor,
  removeMonitor,
  setError,
  setIncidents,
} = monitorSlice.actions;

export default monitorSlice.reducer;
