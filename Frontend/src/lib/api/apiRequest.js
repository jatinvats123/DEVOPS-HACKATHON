/*
 * @apiRequest - A utility function to standardize API requests across the application, handling HTTP methods, endpoints, and error logging in a consistent manner.
 * @param {Object|string} methodOrConfig - Either the HTTP method string OR an object containing {method, url, data, params}
 * @param {string} [url] - The API endpoint URL (when first param is a string)
 * @param {Object} [data] - An optional object containing the request payload for methods like POST and PUT.
 * @param {Object} [params] - An optional object containing query parameters for GET requests.
 * @returns {Promise<Object>} - A promise that resolves to the response data from the API or rejects with an error.
 */

import { API } from './axios';
export const apiRequest = async (
  methodOrConfig,
  url = null,
  data = null,
  params = null
) => {
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

    if (!requestUrl || !method) {
      throw new Error('API Request Error: URL and method are required');
    }

    const config = requestParams ? { params: requestParams } : {};
    const response = await API[method](requestUrl, requestData, config);
    return response.data;
  } catch (error) {
    // A 401 is an ANSWER, not a fault: it is what the session-restore probe on
    // every page load gets for a signed-out visitor. Logging it as an error put
    // two red entries in the console of the login page, which Lighthouse counts
    // against Best Practices and which trains everyone to ignore the console.
    if (error?.response?.status !== 401) {
      console.error(`API Request Error: ${error.message}`, error);
    }
    throw error;
  }
};
