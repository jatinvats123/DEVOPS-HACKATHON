/*
* @apiRequest - A utility function to standardize API requests across the application, handling HTTP methods, endpoints, and error logging in a consistent manner.
* @param {string} method - The HTTP method to use for the request (e.g., "get", "post", "put", "delete").
* @param {string} url - The API endpoint URL to which the request should be sent.
* @param {Object} [data] - An optional object containing the request payload for methods like POST and PUT.
* @param {Object} [params] - An optional object containing query parameters for GET requests.
* @returns {Promise<Object>} - A promise that resolves to the response data from the API or rejects with an error.
*/


import { API } from "./axios"
export const apiRequest = async (method, url, data = null, params = null) => {
    try {

      if(!url && !method) {
        throw new Error("API Request Error: URL and method are required");
      }
        const config = params ? { params } : {};
        const response = await API[method](url, data, config);
        return response.data;
    } catch (error) {
        console.error(`API Request Error: ${method.toUpperCase()} ${url}`, error);
        throw error;
    } 
}