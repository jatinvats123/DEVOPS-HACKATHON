/*
* @apiRequest - A utility function to standardize API requests across the application, handling HTTP methods, endpoints, and error logging in a consistent manner.
* @param {Object|string} methodOrConfig - Either the HTTP method string OR an object containing {method, url, data, params}
* @param {string} [url] - The API endpoint URL (when first param is a string)
* @param {Object} [data] - An optional object containing the request payload for methods like POST and PUT.
* @param {Object} [params] - An optional object containing query parameters for GET requests.
* @returns {Promise<Object>} - A promise that resolves to the response data from the API or rejects with an error.
*/


import { API } from "./axios"
export const apiRequest = async (methodOrConfig, url = null, data = null, params = null) => {
    try {
      // Handle both object and parameter-based calls
      let method, requestUrl, requestData, requestParams;
      
      if (typeof methodOrConfig === 'object' && methodOrConfig !== null) {
        // Object-based call: apiRequest({method, url, data, params})
        method = methodOrConfig.method;
        requestUrl = methodOrConfig.url;
        requestData = methodOrConfig.data || null;
        requestParams = methodOrConfig.params || null;
      } else {
        // Parameter-based call: apiRequest(method, url, data, params)
        method = methodOrConfig;
        requestUrl = url;
        requestData = data;
        requestParams = params;
      }

      if(!requestUrl || !method) {
        throw new Error("API Request Error: URL and method are required");
      }
      
        const config = requestParams ? { params: requestParams } : {};
        // For POST/PUT requests with no data, send empty object instead of null
        const data = (method.toLowerCase() === 'post' || method.toLowerCase() === 'put') && !requestData ? {} : requestData;
        const response = await API[method](requestUrl, data, config);
        return response.data;
    } catch (error) {
        // Extract meaningful error message from axios error
        let errorMessage = error.message || 'An error occurred';
        
        if (error.response) {
          // Backend returned an error response
          errorMessage = error.response.data?.message || 
                        error.response.statusText || 
                        `Request failed with status code ${error.response.status}`;
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = 'No response from server. Please check your connection.';
        }
        
        console.error(`API Request Error: ${errorMessage}`, error);
        
        // Preserve the original error object for use in handlers
        const enhancedError = new Error(errorMessage);
        enhancedError.response = error.response;
        enhancedError.request = error.request;
        
        throw enhancedError;
    } 
}