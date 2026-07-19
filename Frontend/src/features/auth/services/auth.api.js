import { env } from "../../../config/env";
import { apiRequest } from "../../../lib/api/apiRequest";

/*
 * Registers a new user with the provided user data.
 * @param {Object} userData - { username, email, fullname, password }
 */
export const register = async (userData) => {
  return apiRequest({ method: "post", url: env.REGISTER_API, data: userData });
};

/*
 * Logs in a user with the provided user data.
 * @param {Object} userData - { email | username, password }
 */
export const login = async (userData) => {
  return apiRequest({ method: "post", url: env.LOGIN_API, data: userData });
};

/*
 * Logs out the currently authenticated user (clears the auth cookie).
 */
export const logout = async () => {
  return apiRequest({ method: "post", url: env.LOGOUT_API });
};

/*
 * @getUserProfile - Fetches the profile of the currently authenticated user.
 */
export const getUserProfile = async () => {
  return apiRequest({ method: "get", url: env.GET_USER_API });
};

/*
 * @forgotPassword - Initiates the forgot password process for a user.
 * @param {string} email - The email address of the user who forgot their password.
 */
export const forgotPassword = async (email) => {
  return apiRequest({
    method: "post",
    url: env.FORGOT_PASSWORD_API,
    data: { email },
  });
};

/*
 * @changePassword - Changes the password of the currently authenticated user.
 * @param {Object} passwordData - { oldPassword, newPassword }
 */
export const changePassword = async (passwordData) => {
  return apiRequest({
    method: "post",
    url: env.CHANGE_PASSWORD_API,
    data: passwordData,
  });
};

/*
 * @resetPassword - Sets a new password using a reset token from the email link.
 * @param {string} token - The reset token from the URL.
 * @param {string} newPassword - The new password.
 */
export const resetPassword = async (token, newPassword) => {
  return apiRequest({
    method: "post",
    url: `${env.RESET_PASSWORD_API}/${token}`,
    data: { newPassword },
  });
};
