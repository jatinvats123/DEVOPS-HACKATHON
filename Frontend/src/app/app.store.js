import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/state/authSlice";
import monitorReducer from "../features/monitoring/state/monitor.slice";
import incidentReducer from "../features/monitoring/state/incident.slice";
import logReducer from "../features/monitoring/state/log.slice";

export const store = configureStore({
  reducer: { 
    auth: authReducer, 
    monitor: monitorReducer,
    incident: incidentReducer,
    log: logReducer
  },
});
