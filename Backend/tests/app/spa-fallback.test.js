import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';

/**
 * Behaviour when the SPA bundle is missing.
 *
 * This is not hypothetical. The compiled bundle is deliberately not committed
 * to git, so a deployment whose build step does not run `npm run build` serves
 * an empty `public/dist`. That happened on Render, and the symptom was Express's
 * default `Cannot GET /` — which reads like a routing bug and says nothing about
 * the actual cause. Someone then spends an hour in the router.
 *
 * `node:fs` is mocked before app.js is imported, because the existence check
 * runs at module scope. jest.unstable_mockModule is the ESM-safe way to do that.
 */
const existsSync = jest.fn().mockReturnValue(false);

// Only existsSync is replaced. The rest of node:fs passes through, because the
// docs route reads openapi.yaml with readFileSync — a mock that returned just
// the one function would break /api/docs.json and make the "API is unaffected"
// assertion below prove nothing.
const actualFs = await import('node:fs');

jest.unstable_mockModule('node:fs', () => ({
  ...actualFs,
  default: { ...actualFs.default, existsSync },
  existsSync,
}));

const { default: app } = await import('../../src/app.js');
const { connectTestDb, disconnectTestDb } = await import('../helpers/db.js');

/**
 * Probed via a client-side route rather than `/`.
 *
 * Mocking existsSync changes what app.js believes, but express.static stats the
 * filesystem itself and cannot be reached by that mock. So on a machine where
 * someone has run `npm run build`, `/` is served the real index.html by static
 * before the fallback handler ever runs, and the assertion depends on whether
 * the developer happens to have a bundle lying around.
 *
 * `/dashboard` has no file behind it in any case, so it always reaches the
 * fallback — which is the code under test. In the real failure this covers,
 * public/dist is genuinely empty, so static serves nothing and `/` lands on the
 * exact same handler.
 */
const PAGE_ROUTE = '/dashboard';

describe('SPA fallback when the bundle is missing', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  it('returns 503, not 404, for a page route', async () => {
    // 503 says "the server cannot serve this yet". 404 says "your URL is
    // wrong", which sends the reader looking in entirely the wrong place.
    const res = await request(app).get(PAGE_ROUTE).expect(503);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('explains the cause and the exact fix', async () => {
    const res = await request(app).get(PAGE_ROUTE).expect(503);

    expect(res.text).toMatch(/frontend has not been built/i);
    expect(res.text).toContain('npm run install:all &amp;&amp; npm run build');
    expect(res.text).toMatch(/render\.yaml/);
  });

  it('never says "Cannot GET"', async () => {
    // The exact string that made this hard to diagnose in the first place.
    const res = await request(app).get(PAGE_ROUTE);
    expect(res.text).not.toMatch(/Cannot GET/);
  });

  it('applies to every client-side route', async () => {
    for (const route of ['/dashboard', '/incidents', '/settings', '/login']) {
      const res = await request(app).get(route).expect(503);
      expect(res.text).toMatch(/frontend has not been built/i);
    }
  });

  it('is never cached, so a redeploy fixes it immediately', async () => {
    const res = await request(app).get(PAGE_ROUTE).expect(503);
    expect(res.headers['cache-control']).toMatch(/no-store/);
  });

  it('leaves the API completely unaffected', async () => {
    // The whole point of the message: the backend is fine, only the bundle is
    // absent. If the API were also broken the advice would be wrong.
    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/docs.json').expect(200);
  });

  it('still returns JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
