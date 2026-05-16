import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/state/authSlice";
import monitorReducer from "../features/monitoring/state/monitor.slice";

export const store = configureStore({
  reducer: { auth: authReducer, monitor: monitorReducer },
});
