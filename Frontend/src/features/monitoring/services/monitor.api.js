import { env } from "../../../config/env.js";
import { apiRequest } from "../../../lib/api/apiRequest.js";

import axios from "axios";

//axios request for monitoring
export const axiosRequest = axios.create({
  baseURL: "http://localhost:5000/api/monitor",
  withCredentials: true,
});

/*
 * @getIncidentsByMonitorId - Fetches incidents for a specific monitor by its ID.
 * @param {string} monitorId - The ID of the monitor for which to fetch incidents.
 */

export const createMonitoring = async (monitorData) => {
  return axiosRequest("post", env.CREATE_MONITORING_API, monitorData);
};

/*
 *@getMonitors - Fetches all monitors for the authenticated user.
 */
export const getMonitors = async () => {
  // return apiRequest("get", env.CREATE_MONITORING_API);
  const data = axiosRequest.get("/");
  return data;
};

/*
 *@deleteMonitor - Deletes a monitor by its ID.
 *@param {string} monitorId - The ID of the monitor to delete.
 */

export const deleteMonitor = async (monitorId) => {
  return apiRequest("delete", `${env.CREATE_MONITORING_API}/${monitorId}`);
};
