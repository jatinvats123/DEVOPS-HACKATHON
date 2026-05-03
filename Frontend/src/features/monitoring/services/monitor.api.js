import { env } from "../../../config/env.js";
import { apiRequest } from "../../../lib/api/apiRequest.js";

/*   
 * @getIncidentsByMonitorId - Fetches incidents for a specific monitor by its ID.
* @param {string} monitorId - The ID of the monitor for which to fetch incidents.

*/

export const createMonitoring = async (monitorData) => {

  return apiRequest("post", env.CREATE_MONITORING_API, monitorData)
}




/* 
*@getMonitors - Fetches all monitors for the authenticated user.
*/
export const getMonitors = async () => {
    return apiRequest("get", env.CREATE_MONITORING_API);
}



/*
*@deleteMonitor - Deletes a monitor by its ID.
*@param {string} monitorId - The ID of the monitor to delete.   
*/

export const deleteMonitor = async (monitorId) => {
    return apiRequest("delete", `${env.CREATE_MONITORING_API}/${monitorId}`);
}
    
