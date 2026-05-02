import { API } from "../../../lib/api/axios";
import { env } from "../../../config/env";

/*
 * Registers a new user with the provided user data.
 * @param {Object} userData - An object containing the user's registration details 
 * (e.g., username, email, fullname, password ).
 */

export const register = async (userData) => {
    try {
        const response = await API.post(env.REGISTER_API, userData);
        return response.data;
    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
}


/*
 * Logs in a user with the provided user data.
 * @param {Object} userData - An object containing the user's login details 
 * (e.g.,  email, username, password ).
 */

export const login  = async (userData) =>{
    try {
        const response = await API.post(env.LOGIN_API, userData);
        return response.data;
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
}


/*
 * @getUserProfile - Fetches the profile of the currently authenticated user.
*/

export const getUserProfile = async () => {
    try {
        const response = await API.get(env.GET_USER_API);
        return response.data;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
}


/*
 * @forgotPassword - Initiates the forgot password process for a user by sending their email to the backend.
 * @param {string} email - The email address of the user who forgot their password.
 */


export const forgotPassword = async (email) => {
    try {
        const response = await API.post(env.FORGOT_PASSWORD_API, { email });
        return response.data;
    } catch (error) {
        console.error("Error initiating forgot password process:", error);
        throw error;
    }
}


/*
 *@changePassword - Changes the password of the currently authenticated user.
 * @param {Object} passwordData - An object containing the current and new password details 
 * (e.g., currentPassword, newPassword).
 */

export const changePassword = async (passwordData) => {
    try {
        const response = await API.post(env.CHANGE_PASSWORD_API, passwordData);
        return response.data;
    } catch (error) {
        console.error("Error changing password:", error);
        throw error;
    }
}
