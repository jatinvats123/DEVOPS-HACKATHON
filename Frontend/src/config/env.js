// Backend url and api endpoints (env overrides, sensible localhost defaults)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const env = {
  BACKEND_URL,
  REGISTER_API: import.meta.env.VITE_REGISTER_API || '/api/auth/register',
  LOGIN_API: import.meta.env.VITE_LOGIN_API || '/api/auth/login',
  LOGOUT_API: import.meta.env.VITE_LOGOUT_API || '/api/auth/logout',
  GET_USER_API: import.meta.env.VITE_GET_USER_API || '/api/auth/profile',
  FORGOT_PASSWORD_API:
    import.meta.env.VITE_FORGOT_PASSWORD_API || '/api/auth/forgot-password',
  CHANGE_PASSWORD_API:
    import.meta.env.VITE_CHANGE_PASSWORD_API || '/api/auth/change-password',
  RESET_PASSWORD_API:
    import.meta.env.VITE_RESET_PASSWORD_API || '/api/auth/reset-password',
  INCIDENTS_API: import.meta.env.VITE_INCIDENTS_API || '/api/incidents',
  LOGS_API: import.meta.env.VITE_LOGS_API || '/api/logs',
  CREATE_MONITORING_API:
    import.meta.env.VITE_CREATE_MONITORING_API || '/api/monitor',
  // Socket.IO server origin (defaults to the backend origin)
  SOCKET_URL:
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    'http://localhost:8000',
};
