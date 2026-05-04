import { env } from "../../../config/env.js";
import { apiRequest } from "../../../lib/api/apiRequest.js";


/* 
 *@createMonitoring - Creates a new monitor with the provided data.
 * @param {object} monitorData - The data for the new monitor, including URL, type, and frequency.
 */

console.log(`${env.BACKEND_URL}${env.CREATE_MONITORING_API}`)

export const createMonitoring = async (monitorData) => {
  return apiRequest("post", env.CREATE_MONITORING_API, monitorData);
};

/*
 *@getMonitors - Fetches all monitors for the authenticated user.
 */
export const getMonitors = async () => {
  // return apiRequest("get", env.CREATE_MONITORING_API);
  const data = await apiRequest("get", env.CREATE_MONITORING_API);
  return data;
};

/*
 *@deleteMonitor - Deletes a monitor by its ID.
 *@param {string} monitorId - The ID of the monitor to delete.
 */

export const deleteMonitor = async (monitorId) => {
  return apiRequest("delete", `${env.CREATE_MONITORING_API}/${monitorId}`);
};
