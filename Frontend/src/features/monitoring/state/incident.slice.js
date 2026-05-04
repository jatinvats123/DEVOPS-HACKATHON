import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  incidents: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const incidentSlice = createSlice({
  name: "incident",
  initialState,
  reducers: {
    setIncidentLoading: (state, action) => {
      state.loading = action.payload;
    },
    setIncidentError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setIncidents: (state, action) => {
      state.incidents = action.payload;
      state.error = null;
      state.lastFetched = Date.now();
    },
    addIncident: (state, action) => {
      // Unshift to put latest first
      state.incidents.unshift(action.payload);
      state.error = null;
    },
    updateIncident: (state, action) => {
      const { _id, status, endTime, duration } = action.payload;
      const existingIncident = state.incidents.find((i) => i._id === _id);
      if (existingIncident) {
        if (status !== undefined) existingIncident.status = status;
        if (endTime !== undefined) existingIncident.endTime = endTime;
        if (duration !== undefined) existingIncident.duration = duration;
      }
    },
    removeIncident: (state, action) => {
      state.incidents = state.incidents.filter((i) => i._id !== action.payload);
    },
  },
});

export const {
  setIncidentLoading,
  setIncidentError,
  setIncidents,
  addIncident,
  updateIncident,
  removeIncident,
} = incidentSlice.actions;

export const selectIncidents = (state) => state.incident.incidents;
export const selectIncidentLoading = (state) => state.incident.loading;
export const selectIncidentError = (state) => state.incident.error;

export default incidentSlice.reducer;
