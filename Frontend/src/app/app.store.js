import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/state/authSlice";
import monitorReducer from "../features/monitoring/state/monitor.slice";
import incidentReducer from "../features/monitoring/state/incident.slice";
import logReducer from "../features/monitoring/state/log.slice";
import statusReducer from "../features/monitoring/state/status.slice";

export const store = configureStore({
  reducer: { 
    auth: authReducer, 
    monitor: monitorReducer,
    incident: incidentReducer,
    log: logReducer,
    status: statusReducer
  },
});
