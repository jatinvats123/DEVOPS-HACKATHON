import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { createTenant, createMonitor } from '../helpers/factories.js';
import {
  monitorDao,
  incidentDao,
  logDao,
  channelDao,
  notificationLogDao,
  assertMonitorOwned,
  ownedMonitorIds,
  UnscopedQueryError,
} from '../../src/dao/index.js';

/**
 * The DAO is the structural guarantee behind Phase 3: tenancy stops being a
 * thing each controller must remember and becomes something the data layer
 * enforces. These tests prove the enforcement is real — specifically that an
 * unscoped query is REFUSED rather than silently returning everything.
 */
describe('ScopedDao', () => {
  let alice;
  let bob;

  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    alice = await createTenant({
      username: 'alice',
      email: 'alice@example.test',
    });
    bob = await createTenant({ username: 'bob', email: 'bob@example.test' });
  });

  describe('refuses unscoped queries', () => {
    // The core requirement: a missing owner must be an error, never a
    // full-collection read.
    const daos = [
      ['monitorDao', monitorDao],
      ['incidentDao', incidentDao],
      ['logDao', logDao],
      ['channelDao', channelDao],
    ];

    it.each(daos)('%s.find() throws without an owner', async (_name, dao) => {
      await expect(dao.find(undefined)).rejects.toThrow(UnscopedQueryError);
      await expect(dao.find(null)).rejects.toThrow(UnscopedQueryError);
      await expect(dao.find('')).rejects.toThrow(UnscopedQueryError);
    });

    it.each(daos)(
      '%s.findOne() throws without an owner',
      async (_name, dao) => {
        await expect(dao.findOne(undefined, {})).rejects.toThrow(
          UnscopedQueryError
        );
      }
    );

    it.each(daos)('%s.count() throws without an owner', async (_name, dao) => {
      await expect(dao.count(undefined)).rejects.toThrow(UnscopedQueryError);
    });

    it('findById throws without an owner', async () => {
      await expect(
        monitorDao.findById(undefined, alice.monitor._id)
      ).rejects.toThrow(UnscopedQueryError);
    });

    it('updateById and deleteById throw without an owner', async () => {
      await expect(
        monitorDao.updateById(undefined, alice.monitor._id, { title: 'x' })
      ).rejects.toThrow(UnscopedQueryError);
      await expect(
        monitorDao.deleteById(undefined, alice.monitor._id)
      ).rejects.toThrow(UnscopedQueryError);
    });

    it('aggregate throws without an owner', async () => {
      await expect(monitorDao.aggregate(undefined, [])).rejects.toThrow(
        UnscopedQueryError
      );
    });

    it('rejects a malformed owner id rather than coercing it', async () => {
      // `{ userId: 'not-an-id' }` would throw a CastError deep in the driver;
      // worse, some shapes cause the key to be dropped entirely, which matches
      // every document. Reject at the boundary instead.
      await expect(monitorDao.find('not-an-object-id')).rejects.toThrow(
        UnscopedQueryError
      );
      await expect(monitorDao.find({})).rejects.toThrow(UnscopedQueryError);
    });
  });

  describe('enforces the scope on results', () => {
    it("find returns only the owner's documents", async () => {
      const mine = await monitorDao.find(alice.id);
      expect(mine).toHaveLength(1);
      expect(String(mine[0]._id)).toBe(String(alice.monitor._id));
    });

    it('findById cannot reach across tenants', async () => {
      expect(await monitorDao.findById(alice.id, bob.monitor._id)).toBeNull();
      expect(await monitorDao.findById(bob.id, alice.monitor._id)).toBeNull();
    });

    it('a caller-supplied owner filter cannot widen the scope', async () => {
      // The scope intersects rather than being overwritten, so this asks for
      // "bob's monitors AND alice's monitors" — which is empty. Fails closed.
      const leaked = await monitorDao.find(alice.id, { userId: bob.id });
      expect(leaked).toHaveLength(0);
    });

    it('a $ne trick in a caller filter cannot widen the scope', async () => {
      const leaked = await monitorDao.find(alice.id, {
        userId: { $ne: alice.id },
      });
      expect(leaked).toHaveLength(0);
    });

    it('narrowing within your own tenant still works', async () => {
      const second = await createMonitor(alice.id, {
        url: 'https://second.example.test',
      });
      const found = await monitorDao.find(alice.id, { _id: second._id });
      expect(found).toHaveLength(1);
      expect(String(found[0]._id)).toBe(String(second._id));
    });

    it('create stamps ownership and ignores a body-supplied userId', async () => {
      const created = await monitorDao.create(alice.id, {
        type: 'website',
        url: 'https://stamped.example.test',
        userId: bob.id, // hostile
      });
      expect(String(created.userId)).toBe(alice.id);
    });

    it("updateById cannot touch another tenant's document", async () => {
      const result = await monitorDao.updateById(alice.id, bob.monitor._id, {
        title: 'pwned',
      });
      expect(result).toBeNull();
    });

    it('aggregate forces the owner match into the first stage', async () => {
      const rows = await monitorDao.aggregate(alice.id, [
        { $group: { _id: '$userId', n: { $sum: 1 } } },
      ]);
      expect(rows).toHaveLength(1);
      expect(String(rows[0]._id)).toBe(alice.id);
      expect(rows[0].n).toBe(1);
    });
  });

  describe('derived scoping (logs and incidents, via monitor ownership)', () => {
    it("returns only rows belonging to the owner's monitors", async () => {
      const logs = await logDao.find(alice.id);
      const incidents = await incidentDao.find(alice.id);

      expect(logs).toHaveLength(1);
      expect(incidents).toHaveLength(1);
      expect(String(logs[0].monitorId)).toBe(String(alice.monitor._id));
      expect(String(incidents[0].monitorId)).toBe(String(alice.monitor._id));
    });

    it("filtering by another tenant's monitorId yields nothing", async () => {
      const logs = await logDao.find(alice.id, { monitorId: bob.monitor._id });
      const incidents = await incidentDao.find(alice.id, {
        monitorId: bob.monitor._id,
      });

      expect(logs).toHaveLength(0);
      expect(incidents).toHaveLength(0);
    });

    it("findById cannot reach another tenant's incident", async () => {
      expect(await incidentDao.findById(alice.id, bob.incident._id)).toBeNull();
    });

    it('notification logs are scoped to their owner', async () => {
      await notificationLogDao.create(alice.id, {
        event: 'CRITICAL_OUTAGE',
        channel: 'Email',
        target: 'alice@example.test',
        status: 'Delivered',
      });
      await notificationLogDao.create(bob.id, {
        event: 'CRITICAL_OUTAGE',
        channel: 'Email',
        target: 'bob@example.test',
        status: 'Delivered',
      });

      const mine = await notificationLogDao.find(alice.id);
      expect(mine).toHaveLength(1);
      expect(mine[0].target).toBe('alice@example.test');
    });

    it("ownedMonitorIds returns only the owner's monitor ids", async () => {
      const ids = (await ownedMonitorIds(alice.id)).map(String);
      expect(ids).toEqual([String(alice.monitor._id)]);
    });
  });

  describe('assertMonitorOwned', () => {
    it('returns the monitor for its owner', async () => {
      const monitor = await assertMonitorOwned(alice.id, alice.monitor._id);
      expect(String(monitor._id)).toBe(String(alice.monitor._id));
    });

    it("throws 404 for another tenant's monitor", async () => {
      await expect(
        assertMonitorOwned(alice.id, bob.monitor._id)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 for a well-formed but nonexistent id', async () => {
      await expect(
        assertMonitorOwned(alice.id, '64b7f9f9f9f9f9f9f9f9f9f9')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 (not a CastError) for a malformed id', async () => {
      // A raw findById on a malformed id throws a driver CastError, which
      // surfaces as a 500 and tells the caller their input reached the database.
      await expect(
        assertMonitorOwned(alice.id, 'not-an-object-id')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('refuses entirely when the owner is missing', async () => {
      await expect(
        assertMonitorOwned(undefined, alice.monitor._id)
      ).rejects.toThrow(UnscopedQueryError);
    });
  });
});
