import { apiRequest } from '../../../lib/api/apiRequest.js';
import { env } from '../../../config/env.js';

/**
 * @getAllIncidents - Fetches all incidents
 */
export const getAllIncidents = async () => {
  return apiRequest({
    method: 'get',
    url: env.INCIDENTS_API,
  });
};

/**
 * @getIncidentsByMonitorId - Fetches incidents for a specific monitor by its ID
 * @param {string} monitorId - The ID of the monitor for which to fetch incidents
 */
export const getIncidentsByMonitorId = async (monitorId) => {
  return apiRequest({
    method: 'get',
    url: `${env.INCIDENTS_API}/${monitorId}`,
  });
};

/**
 * @getIncidentById - Fetches a single incident by its own id (detail page)
 * @param {string} incidentId
 */
export const getIncidentById = async (incidentId) => {
  return apiRequest({
    method: 'get',
    url: `${env.INCIDENTS_API}/detail/${incidentId}`,
  });
};
