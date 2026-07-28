//backend url and api endpoints
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// register API endpoints
const REGISTER_API = import.meta.env.VITE_REGISTER_API;

// login API endpoints
const LOGIN_API = import.meta.env.VITE_LOGIN_API;

//get user profile API endpoint
const GET_USER_API = import.meta.env.VITE_GET_USER_API;

// forgot password API endpoint
const FORGOT_PASSWORD_API = import.meta.env.VITE_FORGOT_PASSWORD_API;

// change password API endpoint
const CHANGE_PASSWORD_API = import.meta.env.VITE_CHANGE_PASSWORD_API;

// incidents API endpoint
const INCIDENTS_API = import.meta.env.VITE_INCIDENTS_API;

// logs API endpoint
const LOGS_API = import.meta.env.VITE_GET_LOGS_API;

// create monitoring API endpoint
const CREATE_MONITORING_API = import.meta.env.VITE_CREATE_MONITORING_API;

// get logs API endpoint
const GET_LOGS_API = import.meta.env.VITE_GET_LOGS_API;

// health API endpoint
const HEALTH_API = import.meta.env.VITE_HEALTH_API;

// metrics API endpoint (uptime windows, latency series, status timeline).
// Defaulted rather than required: adding a mandatory variable would break every
// existing deployment whose .env predates it, including the live instance.
const METRICS_API = import.meta.env.VITE_METRICS_API || '/api/metrics';

// Validate environment variables
if (!BACKEND_URL) {
  throw new Error('BACKEND_URL is not defined in the environment variables');
}

if (!REGISTER_API) {
  throw new Error('REGISTER_API is not defined in the environment variables');
}

if (!LOGIN_API) {
  throw new Error('LOGIN_API is not defined in the environment variables');
}

if (!GET_USER_API) {
  throw new Error('GET_USER_API is not defined in the environment variables');
}

if (!FORGOT_PASSWORD_API) {
  throw new Error(
    'FORGOT_PASSWORD_API is not defined in the environment variables'
  );
}

if (!CHANGE_PASSWORD_API) {
  throw new Error(
    'CHANGE_PASSWORD_API is not defined in the environment variables'
  );
}

if (!INCIDENTS_API) {
  throw new Error('INCIDENTS_API is not defined in the environment variables');
}

if (!LOGS_API) {
  throw new Error('LOGS_API is not defined in the environment variables');
}

if (!CREATE_MONITORING_API) {
  throw new Error(
    'CREATE_MONITORING_API is not defined in the environment variables'
  );
}

if (!GET_LOGS_API) {
  throw new Error('GET_LOGS_API is not defined in the environment variables');
}

if (!HEALTH_API) {
  throw new Error('HEALTH_API is not defined in the environment variables');
}

if (!LOGS_API) {
  throw new Error('LOGS_API is not defined in the environment variables');
}
// Export the environment variables as a config object
export const env = {
  BACKEND_URL,
  REGISTER_API,
  LOGIN_API,
  GET_USER_API,
  FORGOT_PASSWORD_API,
  CHANGE_PASSWORD_API,
  INCIDENTS_API,
  CREATE_MONITORING_API,
  GET_LOGS_API,
  HEALTH_API,
  LOGS_API,
  METRICS_API,
  LOGOUT_API: '/api/auth/logout',
};
