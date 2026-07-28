import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import app from '../../src/app.js';
import {
  connectTestDb,
  disconnectTestDb,
  clearTestDb,
  syncIndexes,
} from '../helpers/db.js';
import { createTenant, createMonitor, as } from '../helpers/factories.js';
import monitorModel from '../../src/models/monitor.model.js';
import incidentModel from '../../src/models/incidents.model.js';
import logModel from '../../src/models/logs.model.js';
import request from 'supertest';

/**
 * REGRESSION SUITE for the data-exposure defect patched in commit e7c8494.
 *
 * That fix was applied without a test, which means nothing prevented it from
 * silently regressing. This suite is that test.
 *
 * Two tenants are created with IDENTICAL data shapes — each owns a monitor, an
 * incident and a log. That symmetry matters: if user B owned nothing, every
 * assertion would pass trivially whether or not the scope worked.
 *
 * The invariant under test: user A can never observe user B's data, by id, by
 * list, or by any filter A controls.
 */
describe('Multi-tenancy isolation (regression for the e7c8494 data leak)', () => {
  let alice;
  let bob;

  beforeAll(async () => {
    await connectTestDb();
    await syncIndexes(monitorModel, incidentModel, logModel);
  });

  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    alice = await createTenant({
      username: 'alice',
      email: 'alice@example.test',
    });
    bob = await createTenant({ username: 'bob', email: 'bob@example.test' });
  });

  describe('monitors', () => {
    it("list returns only the caller's own monitors", async () => {
      const res = await as(app, alice).get('/api/monitor').expect(200);

      const ids = res.body.data.map((m) => m._id);
      expect(ids).toContain(String(alice.monitor._id));
      expect(ids).not.toContain(String(bob.monitor._id));
      expect(res.body.data).toHaveLength(1);
    });

    it("does not expose another tenant's monitor via update-by-id", async () => {
      await as(app, alice)
        .put(`/api/monitor/${bob.monitor._id}`)
        .send({ title: 'pwned' })
        .expect(404);

      // The write must not have landed either — a 404 that still mutated would
      // be the worse of the two failures.
      const untouched = await monitorModel.findById(bob.monitor._id);
      expect(untouched.title).toBe(bob.monitor.title);
    });

    it("does not delete another tenant's monitor", async () => {
      await as(app, alice)
        .delete(`/api/monitor/${bob.monitor._id}`)
        .expect(404);
      expect(await monitorModel.findById(bob.monitor._id)).not.toBeNull();
    });

    it('cannot create a monitor owned by someone else', async () => {
      // userId in the body must be ignored — ownership is stamped by the DAO
      // from the authenticated session, never accepted from the request.
      const res = await as(app, alice)
        .post('/api/monitor')
        .send({ url: 'https://forged.example.test', userId: bob.id })
        .expect(201);

      expect(String(res.body.data.userId)).toBe(alice.id);
      expect(String(res.body.data.userId)).not.toBe(bob.id);
    });
  });

  describe('incidents', () => {
    it("list returns only incidents on the caller's own monitors", async () => {
      const res = await as(app, alice).get('/api/incidents').expect(200);

      const ids = res.body.data.map((i) => i._id);
      expect(ids).toContain(String(alice.incident._id));
      expect(ids).not.toContain(String(bob.incident._id));
    });

    it("does not expose another tenant's incident by id", async () => {
      await as(app, alice)
        .get(`/api/incidents/detail/${bob.incident._id}`)
        .expect(404);
    });

    it("returns 404 (not 403) so an id's existence is not confirmed", async () => {
      const real = await as(app, alice).get(
        `/api/incidents/detail/${bob.incident._id}`
      );
      const fabricated = await as(app, alice).get(
        '/api/incidents/detail/64b7f9f9f9f9f9f9f9f9f9f9'
      );

      // Identical responses: an attacker cannot use the API to distinguish
      // "exists but is not yours" from "does not exist".
      expect(real.status).toBe(fabricated.status);
      expect(real.body.message).toBe(fabricated.body.message);
    });

    it("does not expose incidents of another tenant's monitor", async () => {
      await as(app, alice).get(`/api/incidents/${bob.monitor._id}`).expect(404);
    });
  });

  describe('logs', () => {
    it("list returns only logs from the caller's own monitors", async () => {
      const res = await as(app, alice).get('/api/logs').expect(200);

      const ids = res.body.data.map((l) => l._id);
      expect(ids).toContain(String(alice.log._id));
      expect(ids).not.toContain(String(bob.log._id));
    });

    it("does not expose logs of another tenant's monitor", async () => {
      await as(app, alice).get(`/api/logs/${bob.monitor._id}`).expect(404);
    });
  });

  describe('metrics', () => {
    it("does not expose another tenant's uptime, latency or timeline", async () => {
      for (const path of ['uptime', 'latency', 'status-timeline']) {
        await as(app, alice)
          .get(`/api/metrics/${path}/${bob.monitor._id}`)
          .expect(404);
      }
    });
  });

  describe('authentication', () => {
    it('rejects every data route without a token', async () => {
      const routes = [
        '/api/monitor',
        '/api/incidents',
        '/api/logs',
        '/api/channels',
        `/api/metrics/uptime/${alice.monitor._id}`,
      ];

      for (const route of routes) {
        await request(app).get(route).expect(401);
      }
    });

    it('rejects a token signed with the wrong secret', async () => {
      // A forged token must fail signature verification, not merely fail to
      // match a user.
      const forged =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0YjdmOWY5ZjlmOWY5ZjlmOWY5ZjlmOSJ9.notavalidsignature';
      await request(app)
        .get('/api/monitor')
        .set('Cookie', `uptimeaitoken=${forged}`)
        .expect(401);
    });
  });

  describe('NoSQL operator injection', () => {
    it('strips $-operators so a filter cannot be smuggled through a query string', async () => {
      // Without express-mongo-sanitize this could turn an owner-scoped lookup
      // into an unbounded one.
      const res = await as(app, alice)
        .get('/api/monitor')
        .query({ 'userId[$ne]': null })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(String(res.body.data[0].userId)).toBe(alice.id);
    });

    it('strips $-operators from a login body', async () => {
      // {"email": {"$gt": ""}} would otherwise match the first user in the
      // collection and hand back a session for an account the caller does not own.
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $gt: '' }, password: { $gt: '' } });

      expect(res.status).not.toBe(200);
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('credential confidentiality', () => {
    it('never returns stored outbound credentials to a client', async () => {
      const res = await as(app, alice)
        .post('/api/monitor')
        .send({
          url: 'https://private-api.example.test',
          authHeaders: { Authorization: 'Bearer super-secret-token' },
        })
        .expect(201);

      expect(res.body.data.authHeaders).toBeUndefined();
      expect(res.body.data.hasAuthHeaders).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain('super-secret-token');

      // And it is genuinely encrypted at rest, not merely hidden from the API.
      const stored = await monitorModel
        .findById(res.body.data._id)
        .select('+authHeaders');
      expect(stored.authHeaders).toEqual(expect.stringMatching(/^v1:/));
      expect(stored.authHeaders).not.toContain('super-secret-token');
    });
  });

  describe('cross-tenant monitor ids in bulk paths', () => {
    it('a tenant with no monitors sees empty lists, never everything', async () => {
      // The classic failure mode: an empty id array degenerates into an
      // unfiltered query and returns the whole collection.
      const orphan = await createTenant({
        username: 'orphan',
        email: 'orphan@example.test',
      });
      await monitorModel.deleteMany({ userId: orphan.id });

      const incidents = await as(app, orphan).get('/api/incidents').expect(200);
      const logs = await as(app, orphan).get('/api/logs').expect(200);

      expect(incidents.body.data).toHaveLength(0);
      expect(logs.body.data).toHaveLength(0);
    });

    it('scopes correctly when a tenant owns several monitors', async () => {
      await createMonitor(alice.id, { url: 'https://second.example.test' });
      const res = await as(app, alice).get('/api/monitor').expect(200);

      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((m) => expect(String(m.userId)).toBe(alice.id));
    });
  });
});
