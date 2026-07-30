import { apiRequest } from '../../../lib/api/apiRequest';

const BASE = '/api/status-pages';

/** Management API — requires an authenticated session. */

export const getStatusPages = () => apiRequest({ method: 'get', url: BASE });

export const createStatusPage = (data) =>
  apiRequest({ method: 'post', url: BASE, data });

export const updateStatusPage = (pageId, data) =>
  apiRequest({ method: 'patch', url: `${BASE}/${pageId}`, data });

export const deleteStatusPage = (pageId) =>
  apiRequest({ method: 'delete', url: `${BASE}/${pageId}` });

/**
 * Public API — deliberately unauthenticated.
 *
 * Separate base path from the management routes so it is impossible to add an
 * endpoint to one and have it served by the other.
 */
export const getPublicStatusPage = (slug) =>
  apiRequest({ method: 'get', url: `/api/status/${encodeURIComponent(slug)}` });
