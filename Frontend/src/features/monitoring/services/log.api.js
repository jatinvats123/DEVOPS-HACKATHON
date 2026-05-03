import { env } from "../../../config/env";
import { apiRequest } from "../../../lib/api/apiRequest";

/*
 * @getLogsByMonitorId - Fetches logs for a specific monitor by its ID.
 * @param {string} monitorId - The ID of the monitor for which to fetch logs.
 */
export const getLogsByMonitorId = async (monitorId) => {
    return apiRequest("get", `${env.GET_LOGS_API}/${monitorId}`);
}