import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { SchedulerLock } from '../../src/services/lock.service.js';
import schedulerLockModel from '../../src/models/schedulerLock.model.js';

/**
 * Leader election.
 *
 * The single highest-impact correctness defect the audit found: with no
 * coordination, every instance checked every monitor. Any horizontal scale — or
 * simply the overlap window of a rolling deploy — meant duplicate HTTP checks,
 * duplicate log rows, duplicate incidents and duplicate alert emails to
 * customers.
 */
describe('Scheduler lock (leader election)', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  const lockFor = (owner, ttlMs = 1000) =>
    new SchedulerLock({ owner, ttlMs, lockId: 'test-scheduler' });

  it('grants leadership to the first claimant', async () => {
    const a = lockFor('instance-A');
    expect(await a.acquire()).toBe(true);
    expect(a.isLeader).toBe(true);
  });

  it('refuses a second instance while the lease is live', async () => {
    const a = lockFor('instance-A');
    const b = lockFor('instance-B');

    expect(await a.acquire()).toBe(true);
    expect(await b.acquire()).toBe(false);
    expect(b.isLeader).toBe(false);
  });

  it('lets the holder renew its own lease repeatedly', async () => {
    const a = lockFor('instance-A');

    expect(await a.acquire()).toBe(true);
    expect(await a.acquire()).toBe(true);
    expect(await a.acquire()).toBe(true);
  });

  it('extends the expiry on renewal', async () => {
    const a = lockFor('instance-A', 5000);
    await a.acquire();
    const first = (await schedulerLockModel.findById('test-scheduler'))
      .expiresAt;

    await new Promise((resolve) => setTimeout(resolve, 30));
    await a.acquire();
    const second = (await schedulerLockModel.findById('test-scheduler'))
      .expiresAt;

    expect(second.getTime()).toBeGreaterThan(first.getTime());
  });

  it('fails over once the lease expires', async () => {
    const a = lockFor('instance-A', 200);
    const b = lockFor('instance-B', 200);

    expect(await a.acquire()).toBe(true);
    expect(await b.acquire()).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 250));

    // Correctness comes from comparing expiresAt inside the query — NOT from
    // MongoDB's TTL sweeper, which only runs about once a minute and would
    // stall failover for that long.
    expect(await b.acquire()).toBe(true);
  });

  it('stops the old leader from reclaiming a live lease after failover', async () => {
    const a = lockFor('instance-A', 200);
    const b = lockFor('instance-B', 5000);

    await a.acquire();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await b.acquire();

    expect(await a.acquire()).toBe(false);
    expect(a.isLeader).toBe(false);
  });

  it('hands over immediately on explicit release', async () => {
    const a = lockFor('instance-A', 60_000);
    const b = lockFor('instance-B', 60_000);

    await a.acquire();
    expect(await b.acquire()).toBe(false);

    await a.release();

    // Graceful shutdown must not leave monitoring paused for a full TTL.
    expect(await b.acquire()).toBe(true);
  });

  it('release is scoped by owner and cannot steal from the current leader', async () => {
    const a = lockFor('instance-A', 200);
    const b = lockFor('instance-B', 60_000);

    await a.acquire();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await b.acquire();

    // A stale leader that already lost its lease must never delete the new
    // leader's document.
    a.isLeader = true; // simulate a stale belief
    await a.release();

    const doc = await schedulerLockModel.findById('test-scheduler');
    expect(doc).not.toBeNull();
    expect(doc.owner).toBe('instance-B');
  });

  it('release is a no-op when leadership is not held', async () => {
    const b = lockFor('instance-B');
    await expect(b.release()).resolves.toBeUndefined();
  });

  it('elects exactly one leader under a concurrent race', async () => {
    const contenders = Array.from({ length: 8 }, (_, i) =>
      lockFor(`instance-${i}`, 5000)
    );

    const results = await Promise.all(contenders.map((c) => c.acquire()));

    // The unique _id index is what makes this atomic: racing upserts cannot
    // both win, and the loser's duplicate-key error is treated as "not leader".
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await schedulerLockModel.countDocuments({})).toBe(1);
  });

  it('keeps exactly one leader across repeated contention rounds', async () => {
    const a = lockFor('instance-A', 5000);
    const b = lockFor('instance-B', 5000);

    for (let round = 0; round < 5; round += 1) {
      const [gotA, gotB] = await Promise.all([a.acquire(), b.acquire()]);
      expect([gotA, gotB].filter(Boolean).length).toBeLessThanOrEqual(1);
    }
  });

  it('reports not-leader when the database is unreachable', async () => {
    // A lock we cannot prove we hold must be treated as not held: the failure
    // mode has to be "nobody checks", never "everybody checks".
    const broken = new SchedulerLock({
      owner: 'instance-A',
      lockId: 'test-scheduler',
      model: {
        findOneAndUpdate: async () => {
          throw new Error('connection lost');
        },
      },
    });

    expect(await broken.acquire()).toBe(false);
    expect(broken.isLeader).toBe(false);
  });
});
