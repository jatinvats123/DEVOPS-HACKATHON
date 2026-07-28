import request from 'supertest';
import { User } from '../../src/models/user.model.js';
import monitorModel from '../../src/models/monitor.model.js';
import incidentModel from '../../src/models/incidents.model.js';
import logModel from '../../src/models/logs.model.js';
import { config } from '../../src/config/config.js';

/**
 * Fixtures for building two fully-populated, mutually-isolated tenants.
 *
 * The tenancy suite depends on both tenants owning the SAME shapes of data, so
 * that a failure means "the scope leaked" rather than "user B happened to have
 * nothing to leak".
 */

let counter = 0;

/**
 * A verified user plus a signed auth cookie.
 *
 * The token is minted by the model's own generateAccessToken() rather than
 * hand-rolled, so the tests exercise the real claim shape the middleware reads.
 */
export async function createUser(overrides = {}) {
  counter += 1;
  const user = await User.create({
    username: overrides.username || `tenant${counter}`,
    fullname: overrides.fullname || `Tenant ${counter}`,
    email: overrides.email || `tenant${counter}@example.test`,
    password: overrides.password || 'correct-horse-battery',
    isVerified: true,
    ...overrides,
  });

  const token = user.generateAccessToken();
  return {
    user,
    token,
    cookie: `${config.AUTH_COOKIE}=${token}`,
    id: String(user._id),
  };
}

export async function createMonitor(userId, overrides = {}) {
  counter += 1;
  return monitorModel.create({
    userId,
    type: 'website',
    title: overrides.title || `Monitor ${counter}`,
    url: overrides.url || `https://target-${counter}.example.test/`,
    interval: 60,
    timeout: 5,
    nextCheckAt: new Date(),
    ...overrides,
  });
}

export async function createIncident(monitor, overrides = {}) {
  return incidentModel.create({
    monitorId: monitor._id,
    userId: monitor.userId,
    status: 'ONGOING',
    startTime: new Date(),
    reason: 'HTTP 503',
    ...overrides,
  });
}

export async function createLog(monitor, overrides = {}) {
  return logModel.create({
    monitorId: monitor._id,
    status: 'DOWN',
    latency: 1234,
    statusCode: 503,
    timestamp: new Date(),
    ...overrides,
  });
}

/** A tenant with one monitor, one incident and one log — a full data footprint. */
export async function createTenant(overrides = {}) {
  const account = await createUser(overrides);
  const monitor = await createMonitor(account.id);
  const incident = await createIncident(monitor);
  const log = await createLog(monitor);
  return { ...account, monitor, incident, log };
}

/** Authenticated supertest agent for a tenant. */
export function as(app, tenant) {
  const authed = (method, url) =>
    request(app)[method](url).set('Cookie', tenant.cookie);
  return {
    get: (url) => authed('get', url),
    post: (url) => authed('post', url),
    put: (url) => authed('put', url),
    patch: (url) => authed('patch', url),
    delete: (url) => authed('delete', url),
  };
}
