import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authReducer from "../features/auth/state/authSlice";
import monitorReducer from "../features/monitoring/state/monitor.slice";
import incidentReducer from "../features/monitoring/state/incident.slice";
import logReducer from "../features/monitoring/state/log.slice";
import statusReducer from "../features/monitoring/state/status.slice";

const appReducer = combineReducers({
  auth: authReducer,
  monitor: monitorReducer,
  incident: incidentReducer,
  log: logReducer,
  status: statusReducer,
});

// Wipe the WHOLE store on logout. Without this, one user's monitors, logs and
// incidents stay in memory and get rendered to the next account that signs in
// on the same tab.
const rootReducer = (state, action) => {
  if (action.type === "auth/clearAuthState") {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});
