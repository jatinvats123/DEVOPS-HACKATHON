/*
 * @apiRequest - A utility function to standardize API requests across the application, handling HTTP methods, endpoints, and error logging in a consistent manner.
 * @param {Object|string} methodOrConfig - Either the HTTP method string OR an object containing {method, url, data, params}
 * @param {string} [url] - The API endpoint URL (when first param is a string)
 * @param {Object} [data] - An optional object containing the request payload for methods like POST and PUT.
 * @param {Object} [params] - An optional object containing query parameters for GET requests.
 * @returns {Promise<Object>} - A promise that resolves to the response data from the API or rejects with an error.
 */

import { API } from './axios';

/**
 * Axios exposes two different shorthand signatures, and calling one with the
 * other's argument list fails in ways that do not look like argument bugs:
 *
 *   API.post(url, data, config)   <- body-carrying
 *   API.get(url, config)          <- no body
 *
 * Both mistakes were live here. Passing `(url, data, config)` uniformly meant
 * GET and DELETE received `data` where `config` belongs, so `params` landed in
 * a third argument axios ignores and query strings were silently dropped.
 */
const BODYLESS_METHODS = new Set(['get', 'delete', 'head', 'options']);

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
      requestData = methodOrConfig.data;
      requestParams = methodOrConfig.params;
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
    const verb = String(method).toLowerCase();

    let response;
    if (BODYLESS_METHODS.has(verb)) {
      response = await API[verb](requestUrl, config);
    } else {
      /**
       * `undefined`, never `null`, when there is no body.
       *
       * This line used to read `data || null`, and that single fallback broke
       * every body-less POST in the application. axios JSON-serialises `null`
       * into the four-byte body `null` and still sends
       * `Content-Type: application/json`; `express.json()` runs in strict mode,
       * which accepts only objects and arrays, so the server rejected the
       * request before it reached any route:
       *
       *     400  Unexpected token 'n', "null" is not valid JSON
       *
       * Which is what "Test Dispatch" reported, and it had nothing to do with
       * the email address being entered. `undefined` makes axios omit the body
       * entirely, and an absent body parses to `{}`.
       */
      response = await API[verb](requestUrl, requestData ?? undefined, config);
    }

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
