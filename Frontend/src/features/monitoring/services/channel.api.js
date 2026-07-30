import { apiRequest } from '../../../lib/api/apiRequest';

const BASE = '/api/channels';

export const getChannels = () => apiRequest({ method: 'get', url: BASE });

export const createChannel = (data) =>
  apiRequest({ method: 'post', url: BASE, data });

export const updateChannel = (channelId, data) =>
  apiRequest({ method: 'patch', url: `${BASE}/${channelId}`, data });

export const deleteChannel = (channelId) =>
  apiRequest({ method: 'delete', url: `${BASE}/${channelId}` });

/**
 * Sends a REAL message, so it waits on a third-party SMTP server rather than on
 * our own database. The server bounds itself below this (8s connect, 15s
 * socket) and answers with a real error on a stall; this budget only has to be
 * wider than that, so the browser is never the first to give up.
 */
export const testChannel = (channelId) =>
  apiRequest({
    method: 'post',
    url: `${BASE}/${channelId}/test`,
    timeout: 30000,
  });

export const getNotificationLogs = () =>
  apiRequest({ method: 'get', url: `${BASE}/logs` });
