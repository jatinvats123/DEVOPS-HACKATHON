import { env } from "../../../config/env";
import { apiRequest } from "../../../lib/api/apiRequest";

/*
 * Registers a new user with the provided user data.
 * @param {Object} userData - An object containing the user's registration details 
 * (e.g., username, email, fullname, password ).
 */

export const register = async (userData) => {
return apiRequest({method: "post", url: env.REGISTER_API, data: userData})
}


/*
 * Logs in a user with the provided user data.
 * @param {Object} userData - An object containing the user's login details 
 * (e.g.,  email, username, password ).
 */

export const login  = async (userData) =>{
    return apiRequest({method: "post", url: env.LOGIN_API, data: userData})
}


/*
 * @getUserProfile - Fetches the profile of the currently authenticated user.
*/

export const getUserProfile = async () => {
    return apiRequest({method: "get", url: env.GET_USER_API});
}
 

/*
 * @forgotPassword - Initiates the forgot password process for a user by sending their email to the backend.
 * @param {string} email - The email address of the user who forgot their password.
 */


export const forgotPassword = async (email) => {
    return apiRequest({method: "post", url: env.FORGOT_PASSWORD_API, data: { email }});
}


/*
 *@changePassword - Changes the password of the currently authenticated user.
 * @param {Object} passwordData - An object containing the current and new password details 
 * (e.g., currentPassword, newPassword).
 */

export const changePassword = async (passwordData) => {
return apiRequest({method: "post", url: env.CHANGE_PASSWORD_API, data: passwordData})
}

export const logout = async () => {
    return apiRequest({method: "post", url: env.LOGOUT_API, data: {}});
}
