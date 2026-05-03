import { env } from "../../../config/env";
import { apiRequest } from "../../../lib/api/apiRequest";

/*
 * Registers a new user with the provided user data.
 * @param {Object} userData - An object containing the user's registration details 
 * (e.g., username, email, fullname, password ).
 */

export const register = async (userData) => {
return apiRequest("post", env.REGISTER_API, userData)
}


/*
 * Logs in a user with the provided user data.
 * @param {Object} userData - An object containing the user's login details 
 * (e.g.,  email, username, password ).
 */

export const login  = async (userData) =>{
    return apiRequest("post", env.LOGIN_API, userData)
}


/*
 * @getUserProfile - Fetches the profile of the currently authenticated user.
*/

export const getUserProfile = async () => {
    return apiRequest("get", env.GET_USER_API);
}
 

/*
 * @forgotPassword - Initiates the forgot password process for a user by sending their email to the backend.
 * @param {string} email - The email address of the user who forgot their password.
 */


export const forgotPassword = async (email) => {
    return apiRequest("post", env.FORGOT_PASSWORD_API, { email });
}


/*
 *@changePassword - Changes the password of the currently authenticated user.
 * @param {Object} passwordData - An object containing the current and new password details 
 * (e.g., currentPassword, newPassword).
 */

export const changePassword = async (passwordData) => {
return apiRequest("post", env.CHANGE_PASSWORD_API, passwordData)
}
