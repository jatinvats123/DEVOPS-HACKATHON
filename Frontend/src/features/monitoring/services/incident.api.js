import { API } from "../../../lib/api/axios";
import { env } from "../../../config/env";

/*
    * @getIncidentsByMonitorId - Fetches incidents for a specific monitor by its ID.
    * @param {string} monitorId - The ID of the monitor for which to fetch incidents.
*/

export const getIncidentsByMonitorId = async (monitorId) => {
  try {
      const response = await API.get(`${env.INCIDENTS_API}/${monitorId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching incidents:", error);
    throw error;
  }
}