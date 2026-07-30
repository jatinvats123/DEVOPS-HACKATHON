import { env } from '../../../config/env';
import { apiRequest } from '../../../lib/api/apiRequest';

/*
 * Registers a new user with the provided user data.
 * @param {Object} userData - An object containing the user's registration details
 * (e.g., username, email, fullname, password ).
 */

export const register = async (userData) => {
  return apiRequest({ method: 'post', url: env.REGISTER_API, data: userData });
};

/*
 * Logs in a user with the provided user data.
 * @param {Object} userData - An object containing the user's login details
 * (e.g.,  email, username, password ).
 */

export const login = async (userData) => {
  return apiRequest({ method: 'post', url: env.LOGIN_API, data: userData });
};

/*
 * @getUserProfile - Fetches the profile of the currently authenticated user.
 */

export const getUserProfile = async () => {
  return apiRequest({ method: 'get', url: env.GET_USER_API });
};

/*
 * @forgotPassword - Initiates the forgot password process for a user by sending their email to the backend.
 * @param {string} email - The email address of the user who forgot their password.
 */

export const forgotPassword = async (email) => {
  return apiRequest({
    method: 'post',
    url: env.FORGOT_PASSWORD_API,
    data: { email },
    // Waits on SMTP before answering, like the dispatch test. The 10s default
    // would report a failure to a user whose reset email was in fact sent —
    // and they would then request another, burning the hourly rate limit.
    timeout: 30000,
  });
};

/*
 * @resetPassword - Completes a password reset using the single-use token from
 * the emailed link.
 * @param {string} token - The raw token taken from the /reset-password/:token URL.
 * @param {string} newPassword - The replacement password.
 */

export const resetPassword = async (token, newPassword) => {
  return apiRequest({
    method: 'post',
    url: `${env.RESET_PASSWORD_API}/${encodeURIComponent(token)}`,
    data: { newPassword },
  });
};

/*
 * @googleSignIn - Exchanges a Google ID token for a WatchTower session cookie.
 * @param {string} credential - The JWT credential issued by Google Identity Services.
 */

export const googleSignIn = async (credential) => {
  return apiRequest({
    method: 'post',
    url: env.GOOGLE_AUTH_API,
    data: { credential },
  });
};

/*
 *@changePassword - Changes the password of the currently authenticated user.
 * @param {Object} passwordData - An object containing the current and new password details
 * (e.g., currentPassword, newPassword).
 */

export const changePassword = async (passwordData) => {
  return apiRequest({
    method: 'post',
    url: env.CHANGE_PASSWORD_API,
    data: passwordData,
  });
};

export const logout = async () => {
  return apiRequest({ method: 'post', url: env.LOGOUT_API });
};

/*
 * @updateProfile - Updates avatar and/or notification preferences.
 * @param {Object} data - { avatar?: dataUrl, preferences?: {...} }
 */
export const updateProfile = async (data) => {
  return apiRequest({ method: 'patch', url: env.GET_USER_API, data });
};
