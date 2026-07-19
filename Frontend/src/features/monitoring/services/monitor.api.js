import { env } from '../../../config/env.js';
import { apiRequest } from '../../../lib/api/apiRequest.js';

/*
 * @createMonitoring - Creates a new monitor.
 * @param {Object} monitorData - { title, url, type, interval, timeout }
 */
export const createMonitoring = async (monitorData) => {
  return apiRequest({
    method: 'post',
    url: env.CREATE_MONITORING_API,
    data: monitorData,
  });
};

/*
 * @getMonitors - Fetches all monitors for the authenticated user.
 */
export const getMonitors = async () => {
  return apiRequest({ method: 'get', url: env.CREATE_MONITORING_API });
};

/*
 * @deleteMonitor - Deletes a monitor by its ID.
 * @param {string} monitorId - The ID of the monitor to delete.
 */
export const deleteMonitor = async (monitorId) => {
  return apiRequest({
    method: 'delete',
    url: `${env.CREATE_MONITORING_API}/${monitorId}`,
  });
};

/*
 * @getLogsByMonitorId - Fetches check logs for a specific monitor.
 * @param {string} monitorId - The ID of the monitor.
 */
export const getLogsByMonitorId = async (monitorId) => {
  return apiRequest({ method: 'get', url: `${env.LOGS_API}/${monitorId}` });
};
