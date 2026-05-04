import { apiRequest } from "../../../lib/api/apiRequest.js";
import { env } from "../../../config/env.js";

export const axiosRequest = axios.create({
  baseURL: "http://localhost:5000/api/incidents",
  withCredentials: true,
});

/**
 * @getAllIncidents - Fetches all incidents
 */
export const getAllIncidents = async () => {
  const data = axiosRequest.get("/");
  return data;
};

/**
 * @getIncidentsByMonitorId - Fetches incidents for a specific monitor by its ID
 * @param {string} monitorId - The ID of the monitor for which to fetch incidents
 */
export const getIncidentsByMonitorId = async (monitorId) => {
  return apiRequest({
    method: "get",
    url: `${env.INCIDENTS_API}/${monitorId}`,
  });
};
