import { apiRequest } from '../../../lib/api/apiRequest';

const BASE = '/api/channels';

export const getChannels = () => apiRequest({ method: 'get', url: BASE });

export const createChannel = (data) =>
  apiRequest({ method: 'post', url: BASE, data });

export const updateChannel = (channelId, data) =>
  apiRequest({ method: 'patch', url: `${BASE}/${channelId}`, data });

export const deleteChannel = (channelId) =>
  apiRequest({ method: 'delete', url: `${BASE}/${channelId}` });

export const testChannel = (channelId) =>
  apiRequest({ method: 'post', url: `${BASE}/${channelId}/test` });

export const getNotificationLogs = () =>
  apiRequest({ method: 'get', url: `${BASE}/logs` });
