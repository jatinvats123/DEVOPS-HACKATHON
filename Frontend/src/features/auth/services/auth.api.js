import { API } from "../../../lib/api/axios";
import { env } from "../../../config/env";

/**
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


/**
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


/**
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