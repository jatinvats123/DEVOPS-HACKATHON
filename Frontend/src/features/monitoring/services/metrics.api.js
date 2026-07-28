import { apiRequest } from '../../../lib/api/apiRequest.js';
import { env } from '../../../config/env.js';

/**
 * @getUptimeMetrics - Real uptime for a monitor, aggregated server-side over
 *   rolling 24h / 7d / 30d windows.
 *   Response shape: { uptime, totalChecks, upChecks, windows: { '24h', '7d', '30d' } }
 *   A window's `uptime` is null when no checks fall inside it.
 * @param {string} monitorId
 */
export const getUptimeMetrics = async (monitorId) => {
  return apiRequest({
    method: 'get',
    url: `${env.METRICS_API}/uptime/${monitorId}`,
  });
};

/**
 * @getLatencyMetrics - Recent latency samples including the connection-phase
 *   breakdown (dns / tcp / tls / ttfb / total).
 * @param {string} monitorId
 */
export const getLatencyMetrics = async (monitorId) => {
  return apiRequest({
    method: 'get',
    url: `${env.METRICS_API}/latency/${monitorId}`,
  });
};

/**
 * @getStatusTimeline - Recent up/down samples for a monitor.
 * @param {string} monitorId
 */
export const getStatusTimeline = async (monitorId) => {
  return apiRequest({
    method: 'get',
    url: `${env.METRICS_API}/status-timeline/${monitorId}`,
  });
};
