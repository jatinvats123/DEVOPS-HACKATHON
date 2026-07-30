import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { createUser, createMonitor, createLog } from '../helpers/factories.js';
import { resetRateLimits } from '../../src/app.middleware.js';
import statusPageModel from '../../src/models/statusPage.model.js';

/**
 * Status pages: management and the public read path.
 *
 * The public endpoint is the only route in the product an unauthenticated
 * caller can reach, so most of what is asserted here is about what it does NOT
 * return.
 */
describe('Status pages', () => {
  let alice;
  let bob;
  let aliceMonitor;
  let bobMonitor;

  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    resetRateLimits();
    alice = await createUser({
      username: 'alice',
      email: 'alice@example.test',
    });
    bob = await createUser({ username: 'bob', email: 'bob@example.test' });
    aliceMonitor = await createMonitor(alice.id, {
      title: 'Alice API',
      url: 'https://internal.alice.test/secret-path',
    });
    bobMonitor = await createMonitor(bob.id, { title: 'Bob API' });
  });

  const create = (tenant, body) =>
    request(app)
      .post('/api/status-pages')
      .set('Cookie', tenant.cookie)
      .send(body);

  describe('creating', () => {
    it('creates a page and derives a slug from the name', async () => {
      const res = await create(alice, { name: 'Acme API Status' }).expect(201);

      expect(res.body.data.slug).toBe('acme-api-status');
      expect(res.body.data.name).toBe('Acme API Status');
      expect(res.body.data.isPublic).toBe(true);
    });

    it('requires a name', async () => {
      await create(alice, {}).expect(400);
      await create(alice, { name: '   ' }).expect(400);
    });

    it('rejects a name with nothing to build a URL from', async () => {
      // "!!!" slugifies to the empty string; without this check the page would
      // be created with an unreachable address.
      await create(alice, { name: '!!!' }).expect(400);
    });

    it('refuses a slug that collides with an application route', async () => {
      await create(alice, { name: 'api' }).expect(400);
      await create(alice, { name: 'Login' }).expect(400);
    });

    it('refuses a slug already taken by ANOTHER tenant', async () => {
      await create(alice, { name: 'Shared Name' }).expect(201);

      // Slugs are global because they are public URLs. Scoping this check to
      // the owner would let two tenants both claim /status/shared-name, and
      // whichever document the index happened to return would win.
      await create(bob, { name: 'Shared Name' }).expect(409);
    });

    it('accepts the caller‘s own monitors', async () => {
      const res = await create(alice, {
        name: 'With Monitors',
        monitors: [String(aliceMonitor._id)],
      }).expect(201);

      expect(res.body.data.monitors).toHaveLength(1);
    });

    it('refuses a monitor belonging to someone else', async () => {
      // The core tenancy guarantee for this feature: a public page must not be
      // usable to publish another tenant's monitor state.
      await create(alice, {
        name: 'Borrowed',
        monitors: [String(bobMonitor._id)],
      }).expect(404);

      expect(await statusPageModel.countDocuments({})).toBe(0);
    });

    it('refuses a malformed monitor id', async () => {
      await create(alice, {
        name: 'Bad Id',
        monitors: ['not-an-object-id'],
      }).expect(400);
    });

    it('rejects monitors that is not an array', async () => {
      await create(alice, { name: 'Wrong Shape', monitors: 'nope' }).expect(
        400
      );
    });

    it('requires authentication', async () => {
      await request(app)
        .post('/api/status-pages')
        .send({ name: 'Anonymous' })
        .expect(401);
    });
  });

  describe('listing, updating and deleting', () => {
    it('lists only the caller‘s own pages', async () => {
      await create(alice, { name: 'Alice Page' }).expect(201);
      await create(bob, { name: 'Bob Page' }).expect(201);

      const res = await request(app)
        .get('/api/status-pages')
        .set('Cookie', alice.cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alice Page');
    });

    it('does not let one tenant update another‘s page', async () => {
      const created = await create(alice, { name: 'Alice Page' }).expect(201);

      await request(app)
        .patch(`/api/status-pages/${created.body.data._id}`)
        .set('Cookie', bob.cookie)
        .send({ name: 'Hijacked' })
        .expect(404); // 404 not 403 — a 403 would confirm the id is real
    });

    it('does not let one tenant delete another‘s page', async () => {
      const created = await create(alice, { name: 'Alice Page' }).expect(201);

      await request(app)
        .delete(`/api/status-pages/${created.body.data._id}`)
        .set('Cookie', bob.cookie)
        .expect(404);

      expect(await statusPageModel.countDocuments({})).toBe(1);
    });

    it('keeps the public address stable when the page is renamed', async () => {
      const created = await create(alice, { name: 'Original Name' }).expect(
        201
      );

      const updated = await request(app)
        .patch(`/api/status-pages/${created.body.data._id}`)
        .set('Cookie', alice.cookie)
        .send({ name: 'Completely Different' })
        .expect(200);

      // Renaming must not move the URL — links already handed to customers
      // would break, silently, at the worst possible time.
      expect(updated.body.data.slug).toBe('original-name');
      expect(updated.body.data.name).toBe('Completely Different');
    });

    it('moves the address only when the slug is set explicitly', async () => {
      const created = await create(alice, { name: 'Original Name' }).expect(
        201
      );

      const updated = await request(app)
        .patch(`/api/status-pages/${created.body.data._id}`)
        .set('Cookie', alice.cookie)
        .send({ slug: 'new-address' })
        .expect(200);

      expect(updated.body.data.slug).toBe('new-address');
    });

    it('refuses to move onto a taken address', async () => {
      await create(alice, { name: 'Taken' }).expect(201);
      const other = await create(alice, { name: 'Mover' }).expect(201);

      await request(app)
        .patch(`/api/status-pages/${other.body.data._id}`)
        .set('Cookie', alice.cookie)
        .send({ slug: 'taken' })
        .expect(409);
    });

    it('deletes a page it owns', async () => {
      const created = await create(alice, { name: 'Doomed' }).expect(201);

      await request(app)
        .delete(`/api/status-pages/${created.body.data._id}`)
        .set('Cookie', alice.cookie)
        .expect(200);

      expect(await statusPageModel.countDocuments({})).toBe(0);
    });
  });

  describe('the public page', () => {
    beforeEach(async () => {
      // Give the monitor some history so uptime is a real number.
      await createLog(aliceMonitor, { status: 'UP', latency: 120 });
      await createLog(aliceMonitor, { status: 'UP', latency: 130 });
    });

    const publish = async (overrides = {}) => {
      const res = await create(alice, {
        name: 'Acme Status',
        description: 'Live availability',
        monitors: [String(aliceMonitor._id)],
        ...overrides,
      }).expect(201);
      return res.body.data;
    };

    it('is readable with no authentication at all', async () => {
      const page = await publish();

      const res = await request(app)
        .get(`/api/status/${page.slug}`)
        .expect(200);

      expect(res.body.data.name).toBe('Acme Status');
      expect(res.body.data.services).toHaveLength(1);
      expect(res.body.data.services[0].name).toBe('Alice API');
    });

    it('never exposes the monitored URL or internal identifiers', async () => {
      const page = await publish();

      const res = await request(app)
        .get(`/api/status/${page.slug}`)
        .expect(200);

      // Asserted against the whole serialised payload rather than field by
      // field, so a future field that happens to carry any of this is caught
      // even if nobody thinks to write a test for it.
      const body = JSON.stringify(res.body);

      expect(body).not.toContain('internal.alice.test');
      expect(body).not.toContain('secret-path');
      expect(body).not.toContain(String(aliceMonitor._id));
      expect(body).not.toContain(String(alice.id));
      expect(body).not.toMatch(/userId|ownerId|headers|authorization/i);
    });

    it('reports uptime and overall state', async () => {
      const page = await publish();

      const res = await request(app)
        .get(`/api/status/${page.slug}`)
        .expect(200);

      expect(res.body.data.overall).toBe('OPERATIONAL');
      expect(res.body.data.services[0].uptime['24h']).toBe(100);
    });

    it('reports DEGRADED when a listed monitor is down', async () => {
      const down = await createMonitor(alice.id, {
        title: 'Broken Service',
        status: 'DOWN',
      });
      const page = await publish({ monitors: [String(down._id)] });

      const res = await request(app)
        .get(`/api/status/${page.slug}`)
        .expect(200);

      expect(res.body.data.overall).toBe('DEGRADED');
      expect(res.body.data.services[0].status).toBe('DOWN');
    });

    it('shows a paused monitor as PAUSED rather than claiming it is up', async () => {
      const paused = await createMonitor(alice.id, {
        title: 'Paused Service',
        active: false,
        status: 'UP',
      });
      const page = await publish({ monitors: [String(paused._id)] });

      const res = await request(app)
        .get(`/api/status/${page.slug}`)
        .expect(200);

      // "We stopped checking" is not "it is healthy", and a status page that
      // conflates them is lying on the one surface that must not.
      expect(res.body.data.services[0].status).toBe('PAUSED');
    });

    it('reports null uptime for a monitor with no checks yet', async () => {
      const fresh = await createMonitor(alice.id, { title: 'Brand New' });
      const page = await publish({ monitors: [String(fresh._id)] });

      const res = await request(app)
        .get(`/api/status/${page.slug}`)
        .expect(200);

      expect(res.body.data.services[0].uptime['30d']).toBeNull();
    });

    it('404s for an unpublished page', async () => {
      const page = await publish({ isPublic: false });
      await request(app).get(`/api/status/${page.slug}`).expect(404);
    });

    it('404s for an unknown slug', async () => {
      await request(app).get('/api/status/no-such-page').expect(404);
    });

    it('is not reachable through the management path', async () => {
      const page = await publish();

      // The two surfaces must not share a prefix, or a management route could
      // one day be served to anonymous callers by accident. The management
      // router has no by-slug read at all, so this is a plain 404 — and
      // crucially not the page.
      const res = await request(app).get(`/api/status-pages/${page.slug}`);

      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain('Alice API');
    });

    it('keeps the management list behind authentication', async () => {
      await publish();
      await request(app).get('/api/status-pages').expect(401);
    });
  });
});
