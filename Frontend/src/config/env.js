/**
 * Frontend configuration.
 *
 * Every value has a working same-origin default, and NOTHING here throws.
 *
 * This module used to throw at import time for eleven missing `VITE_*`
 * variables. Because it is imported transitively by the router, a single
 * missing variable meant the bundle threw before React mounted and the user got
 * a permanently blank page with an error only visible in the devtools console.
 *
 * That is exactly what shipped in the Docker image: `.dockerignore` excludes
 * every `.env` file (correctly — they can contain secrets), so the SPA was
 * built with no `VITE_*` values at all and the image served an app that could
 * never render.
 * The CI smoke test did not catch it because it asserted the HTML shell was
 * served, and the shell is served fine — it is the JavaScript that dies.
 *
 * The deeper problem was requiring build-time configuration for values that are
 * knowable at runtime. The API is served from the same origin as the SPA, so
 * relative paths are correct by default and need no configuration whatsoever.
 * The variables remain overridable for split-origin deployments.
 */

/** Use the override when it is a non-empty string; otherwise the default. */
const fromEnv = (value, fallback) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : fallback;
};

/**
 * Empty string = same origin. The SPA is served BY the API, so a relative
 * request already reaches the right place, and axios/Socket.IO both treat an
 * empty base URL as "current origin".
 */
const BACKEND_URL = fromEnv(import.meta.env.VITE_BACKEND_URL, '');

export const env = {
  BACKEND_URL,

  // --- auth ---
  REGISTER_API: fromEnv(
    import.meta.env.VITE_REGISTER_API,
    '/api/auth/register'
  ),
  LOGIN_API: fromEnv(import.meta.env.VITE_LOGIN_API, '/api/auth/login'),
  LOGOUT_API: fromEnv(import.meta.env.VITE_LOGOUT_API, '/api/auth/logout'),
  GET_USER_API: fromEnv(import.meta.env.VITE_GET_USER_API, '/api/auth/profile'),
  FORGOT_PASSWORD_API: fromEnv(
    import.meta.env.VITE_FORGOT_PASSWORD_API,
    '/api/auth/forgot-password'
  ),
  CHANGE_PASSWORD_API: fromEnv(
    import.meta.env.VITE_CHANGE_PASSWORD_API,
    '/api/auth/change-password'
  ),
  RESET_PASSWORD_API: fromEnv(
    import.meta.env.VITE_RESET_PASSWORD_API,
    '/api/auth/reset-password'
  ),
  GOOGLE_AUTH_API: fromEnv(
    import.meta.env.VITE_GOOGLE_AUTH_API,
    '/api/auth/google'
  ),

  /**
   * Google OAuth client ID.
   *
   * Empty by default and NOT required — a public identifier, safe to ship in
   * the bundle, but absent until Google sign-in is configured for the
   * deployment. The sign-in button renders only when this has a value, so a
   * deployment without Google configured shows email/password sign-in with no
   * dead control and no console errors, rather than a button that fails when
   * clicked.
   */
  GOOGLE_CLIENT_ID: fromEnv(import.meta.env.VITE_GOOGLE_CLIENT_ID, ''),

  // --- monitoring ---
  CREATE_MONITORING_API: fromEnv(
    import.meta.env.VITE_CREATE_MONITORING_API,
    '/api/monitor'
  ),
  INCIDENTS_API: fromEnv(import.meta.env.VITE_INCIDENTS_API, '/api/incidents'),
  LOGS_API: fromEnv(import.meta.env.VITE_GET_LOGS_API, '/api/logs'),
  GET_LOGS_API: fromEnv(import.meta.env.VITE_GET_LOGS_API, '/api/logs'),
  METRICS_API: fromEnv(import.meta.env.VITE_METRICS_API, '/api/metrics'),
  CHANNELS_API: fromEnv(import.meta.env.VITE_CHANNELS_API, '/api/channels'),
  HEALTH_API: fromEnv(import.meta.env.VITE_HEALTH_API, '/api/health'),
};

export default env;
