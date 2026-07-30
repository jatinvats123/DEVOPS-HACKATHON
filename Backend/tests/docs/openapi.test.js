import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { connectTestDb, disconnectTestDb } from '../helpers/db.js';
import { openApiSpec } from '../../src/routes/docs.route.js';

/**
 * Keeps the OpenAPI document honest.
 *
 * A hand-authored spec can drift from the implementation, and a spec that
 * documents routes which no longer exist is worse than none — it sends
 * integrators down dead ends and makes every other statement in the document
 * suspect. These tests do not prove the spec is complete, but they do fail when
 * it becomes structurally invalid or loses coverage of the real route surface.
 */
describe('OpenAPI specification', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  it('loads and parses', () => {
    expect(openApiSpec).toBeTruthy();
    expect(openApiSpec.openapi).toBe('3.1.0');
  });

  it('is served as JSON', async () => {
    const res = await request(app).get('/api/docs.json').expect(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.info.title).toBe('WatchTower API');
  });

  it('serves Swagger UI', async () => {
    const res = await request(app).get('/api/docs/').expect(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/swagger/i);
  });

  it('does not require authentication to read', async () => {
    // Publishing the shape of an API is not a disclosure. Every documented
    // route still enforces its own auth; relying on nobody knowing the paths
    // would not be security.
    await request(app).get('/api/docs.json').expect(200);
  });

  it('documents every route the application actually mounts', () => {
    // The list is maintained by hand deliberately: adding a route should be a
    // conscious decision to document it, and this test is where that decision
    // is enforced.
    const mounted = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/verify/{id}',
      '/api/auth/forgot-password',
      '/api/auth/reset-password/{token}',
      '/api/auth/change-password',
      '/api/auth/profile',
      '/api/monitor',
      '/api/monitor/{monitorId}',
      '/api/incidents',
      '/api/incidents/detail/{incidentId}',
      '/api/incidents/{monitorId}',
      '/api/logs',
      '/api/logs/{monitorId}',
      '/api/metrics/uptime/{monitorId}',
      '/api/metrics/latency/{monitorId}',
      '/api/metrics/status-timeline/{monitorId}',
      '/api/channels',
      '/api/channels/{channelId}',
      '/api/channels/{channelId}/test',
      '/api/channels/logs',
      '/api/health',
      '/api/health/ready',
      '/metrics',
    ];

    const documented = Object.keys(openApiSpec.paths);
    const missing = mounted.filter((p) => !documented.includes(p));

    expect(missing).toEqual([]);
  });

  it('declares cookie auth and applies it by default', () => {
    expect(openApiSpec.components.securitySchemes.cookieAuth).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'uptimeaitoken',
    });
    // Secure by default: individual public routes opt OUT with `security: []`,
    // so forgetting to annotate a route leaves it documented as protected
    // rather than accidentally advertised as open.
    expect(openApiSpec.security).toEqual([{ cookieAuth: [] }]);
  });

  it('marks exactly the genuinely public routes as unauthenticated', () => {
    const publicPaths = [];
    for (const [route, ops] of Object.entries(openApiSpec.paths)) {
      for (const op of Object.values(ops)) {
        if (op?.security?.length === 0) publicPaths.push(route);
      }
    }

    expect(publicPaths.sort()).toEqual(
      [
        '/api/auth/forgot-password',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/reset-password/{token}',
        '/api/auth/verify/{id}',
        '/api/health',
        '/api/health/ready',
        '/metrics',
      ].sort()
    );
  });

  it('every operation has a summary and at least one response', () => {
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    const problems = [];

    for (const [route, ops] of Object.entries(openApiSpec.paths)) {
      for (const method of methods) {
        const op = ops[method];
        if (!op) continue;
        if (!op.summary)
          problems.push(`${method.toUpperCase()} ${route}: no summary`);
        if (!op.responses || Object.keys(op.responses).length === 0) {
          problems.push(`${method.toUpperCase()} ${route}: no responses`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it('resolves every internal $ref', () => {
    // A typo in a $ref produces a document that loads fine and renders broken.
    const refs = new Set();
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.$ref === 'string') refs.add(node.$ref);
      Object.values(node).forEach(walk);
    };
    walk(openApiSpec);

    const unresolved = [...refs].filter((ref) => {
      const target = ref
        .replace(/^#\//, '')
        .split('/')
        .reduce((acc, key) => acc?.[key], openApiSpec);
      return target === undefined;
    });

    expect(unresolved).toEqual([]);
  });
});
