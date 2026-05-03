
import { apiRequest } from '../../../lib/api/apiRequest.js';
import { env } from '../../../config/env.js';

/**
 * @getAllLogs - Fetches all recent logs
 */
export const getAllLogs = async () => {
  return apiRequest({
    method: 'get',
    url: env.LOGS_API
  });
};

/**
 * @getLogsByMonitorId - Fetches logs for a specific monitor by its ID
 * @param {string} monitorId - The ID of the monitor for which to fetch logs
 */
export const getLogsByMonitorId = async (monitorId) => {
  return apiRequest({
    method: 'get',
    url: `${env.LOGS_API}/${monitorId}`
  });
};
