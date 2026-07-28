import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import {
  connectTestDb,
  disconnectTestDb,
  clearTestDb,
  syncIndexes,
} from '../helpers/db.js';
import { createUser, createMonitor } from '../helpers/factories.js';
import {
  openIncident,
  closeIncident,
} from '../../src/services/incident.service.js';
import incidentModel from '../../src/models/incidents.model.js';
import monitorModel from '../../src/models/monitor.model.js';
import { notifierRegistry } from '../../src/notifications/index.js';
import notificationLogModel from '../../src/models/notificationLog.model.js';

/**
 * Incident open/close semantics.
 *
 * Two properties this module owes the rest of the system:
 *  1. transitions are EXACTLY ONCE — an outage must not email a customer on
 *     every failing check;
 *  2. a delivery failure never rolls back the transition — the incident is the
 *     source of truth, notification is best effort.
 */
describe('Incident lifecycle', () => {
  let owner;
  let monitor;
  let dispatched;

  beforeAll(async () => {
    await connectTestDb();
    await syncIndexes(incidentModel, monitorModel);
  });

  afterAll(async () => {
    notifierRegistry.clear();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    owner = await createUser();
    monitor = await createMonitor(owner.id);

    dispatched = [];
    notifierRegistry.clear().register({
      name: 'Email',
      supports: () => true,
      send: async (payload) => {
        dispatched.push(payload);
        return { status: 'Delivered', target: 'recorder@example.test' };
      },
    });
  });

  const events = (name) => dispatched.filter((d) => d.event === name);

  describe('opening', () => {
    it('creates an ongoing incident and reports that it opened', async () => {
      const { incident, opened } = await openIncident(monitor, 'HTTP 503');

      expect(opened).toBe(true);
      expect(incident.status).toBe('ONGOING');
      expect(incident.reason).toBe('HTTP 503');
      expect(incident.startTime).toBeInstanceOf(Date);
    });

    it('denormalises the owner onto the incident', async () => {
      const { incident } = await openIncident(monitor, 'HTTP 503');
      // Lets incidents be listed per tenant without a join through monitors.
      expect(String(incident.userId)).toBe(owner.id);
    });

    it('notifies exactly once on the opening transition', async () => {
      await openIncident(monitor, 'HTTP 503');
      expect(events('incident.opened')).toHaveLength(1);
    });

    it('is IDEMPOTENT — a second call neither duplicates nor re-notifies', async () => {
      await openIncident(monitor, 'HTTP 503');
      const second = await openIncident(monitor, 'HTTP 503 again');

      expect(second.opened).toBe(false);
      expect(events('incident.opened')).toHaveLength(1);
      expect(await incidentModel.countDocuments({ status: 'ONGOING' })).toBe(1);
    });

    it('preserves the ORIGINAL reason and start time on a repeat call', async () => {
      const { incident: first } = await openIncident(monitor, 'original cause');
      await new Promise((resolve) => setTimeout(resolve, 20));
      const { incident: second } = await openIncident(monitor, 'later cause');

      // Restarting the clock on an outage in progress would understate its
      // duration and corrupt the incident record.
      expect(second.reason).toBe('original cause');
      expect(second.startTime.getTime()).toBe(first.startTime.getTime());
    });

    it('opens separate incidents for separate monitors', async () => {
      const other = await createMonitor(owner.id, {
        url: 'https://other.example.test/',
      });

      await openIncident(monitor, 'HTTP 503');
      await openIncident(other, 'HTTP 500');

      expect(await incidentModel.countDocuments({ status: 'ONGOING' })).toBe(2);
      expect(events('incident.opened')).toHaveLength(2);
    });

    it('survives concurrent opens without duplicating', async () => {
      // Two instances can briefly both believe they lead during a failover.
      const results = await Promise.all([
        openIncident(monitor, 'race A'),
        openIncident(monitor, 'race B'),
        openIncident(monitor, 'race C'),
      ]);

      expect(results.filter((r) => r.opened)).toHaveLength(1);
      expect(await incidentModel.countDocuments({ status: 'ONGOING' })).toBe(1);
      expect(events('incident.opened')).toHaveLength(1);
    });
  });

  describe('closing', () => {
    it('resolves the ongoing incident and reports that it closed', async () => {
      await openIncident(monitor, 'HTTP 503');
      const { incident, closed } = await closeIncident(monitor);

      expect(closed).toBe(true);
      expect(incident.status).toBe('RESOLVED');
      expect(incident.endTime).toBeInstanceOf(Date);
    });

    it('computes the duration in seconds', async () => {
      const { incident: opened } = await openIncident(monitor, 'HTTP 503');
      // Backdate the start so the duration is unambiguously non-zero.
      await incidentModel.updateOne(
        { _id: opened._id },
        { $set: { startTime: new Date(Date.now() - 5000) } }
      );

      const { incident } = await closeIncident(monitor);
      expect(incident.duration).toBeGreaterThanOrEqual(4);
      expect(incident.duration).toBeLessThan(10);
    });

    it('notifies exactly once on the closing transition', async () => {
      await openIncident(monitor, 'HTTP 503');
      await closeIncident(monitor);

      expect(events('incident.closed')).toHaveLength(1);
    });

    it('is a no-op when there is nothing open', async () => {
      const { incident, closed } = await closeIncident(monitor);

      expect(closed).toBe(false);
      expect(incident).toBeNull();
      expect(events('incident.closed')).toHaveLength(0);
    });

    it('does not re-notify on a second close', async () => {
      await openIncident(monitor, 'HTTP 503');
      await closeIncident(monitor);
      await closeIncident(monitor);

      expect(events('incident.closed')).toHaveLength(1);
    });

    it('survives concurrent closes without double-notifying', async () => {
      await openIncident(monitor, 'HTTP 503');

      const results = await Promise.all([
        closeIncident(monitor),
        closeIncident(monitor),
        closeIncident(monitor),
      ]);

      // The atomic ONGOING→RESOLVED update is what makes this hold: only one
      // caller's update matches.
      expect(results.filter((r) => r.closed)).toHaveLength(1);
      expect(events('incident.closed')).toHaveLength(1);
    });

    it('allows a NEW incident after the previous one closed', async () => {
      await openIncident(monitor, 'first outage');
      await closeIncident(monitor);

      const { opened } = await openIncident(monitor, 'second outage');
      expect(opened).toBe(true);
      expect(await incidentModel.countDocuments({})).toBe(2);
      expect(await incidentModel.countDocuments({ status: 'ONGOING' })).toBe(1);
    });
  });

  describe('a full open → close → reopen cycle', () => {
    it('notifies once per transition and never in between', async () => {
      await openIncident(monitor, 'outage 1');
      await openIncident(monitor, 'still down');
      await openIncident(monitor, 'still down');
      await closeIncident(monitor);
      await closeIncident(monitor);
      await openIncident(monitor, 'outage 2');
      await closeIncident(monitor);

      expect(events('incident.opened')).toHaveLength(2);
      expect(events('incident.closed')).toHaveLength(2);
    });
  });

  describe('notification isolation', () => {
    it('still opens the incident when a notifier throws', async () => {
      notifierRegistry.clear().register({
        name: 'Email',
        supports: () => true,
        send: async () => {
          throw new Error('SMTP unreachable');
        },
      });

      const { opened, incident } = await openIncident(monitor, 'HTTP 503');

      // A broken channel must not roll back an incident transition.
      expect(opened).toBe(true);
      expect(incident.status).toBe('ONGOING');
    });

    it('still closes the incident when a notifier throws', async () => {
      await openIncident(monitor, 'HTTP 503');

      notifierRegistry.clear().register({
        name: 'Email',
        supports: () => true,
        send: async () => {
          throw new Error('SMTP unreachable');
        },
      });

      const { closed } = await closeIncident(monitor);
      expect(closed).toBe(true);
    });

    it('records a Failed audit row so silence is explainable', async () => {
      notifierRegistry.clear().register({
        name: 'Email',
        supports: () => true,
        send: async () => {
          throw new Error('SMTP unreachable');
        },
      });

      await openIncident(monitor, 'HTTP 503');

      const rows = await notificationLogModel.find({ userId: owner.id });
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('Failed');
    });

    it('opens the incident even when the owner cannot be loaded', async () => {
      const orphan = await createMonitor(owner.id, {
        url: 'https://orphan.example.test/',
      });
      // Ownership pointing at a user who no longer exists.
      orphan.userId = '64b7f9f9f9f9f9f9f9f9f9f9';

      const { opened } = await openIncident(orphan, 'HTTP 503');
      expect(opened).toBe(true);
      expect(dispatched).toHaveLength(0);
    });
  });

  describe('AI enrichment', () => {
    it('does not block the incident when AI is unavailable', async () => {
      // MISTRAL_API_KEY is empty in tests, so analyzeIncident returns null.
      const { incident, opened } = await openIncident(monitor, 'HTTP 503');

      expect(opened).toBe(true);
      // Null rather than an apology string written into the customer's record.
      expect(incident.aiSummary ?? null).toBeNull();
    });
  });

  describe('pre-save hook', () => {
    it('does not hang on create (regression for the kareem defect)', async () => {
      // The hook declared `next` and never called it, so Mongoose's middleware
      // engine waited forever — every incident write hung, wedging the tick
      // that awaited it.
      const raced = await Promise.race([
        incidentModel
          .create({
            monitorId: monitor._id,
            userId: owner.id,
            status: 'RESOLVED',
            startTime: new Date(Date.now() - 9000),
            endTime: new Date(),
          })
          .then(() => 'completed'),
        new Promise((resolve) => setTimeout(() => resolve('HUNG'), 3000)),
      ]);

      expect(raced).toBe('completed');
    });

    it('derives duration on save', async () => {
      const incident = await incidentModel.create({
        monitorId: monitor._id,
        userId: owner.id,
        status: 'RESOLVED',
        startTime: new Date(Date.now() - 9000),
        endTime: new Date(),
      });

      expect(incident.duration).toBeGreaterThanOrEqual(8);
    });
  });

  describe('database-level duplicate guard', () => {
    it('rejects a second ONGOING incident for the same monitor', async () => {
      await incidentModel.create({
        monitorId: monitor._id,
        userId: owner.id,
        status: 'ONGOING',
        startTime: new Date(),
      });

      // The partial unique index makes a duplicate open impossible rather than
      // merely improbable.
      await expect(
        incidentModel.create({
          monitorId: monitor._id,
          userId: owner.id,
          status: 'ONGOING',
          startTime: new Date(),
        })
      ).rejects.toMatchObject({ code: 11000 });
    });

    it('permits many RESOLVED incidents for the same monitor', async () => {
      for (let i = 0; i < 3; i += 1) {
        await incidentModel.create({
          monitorId: monitor._id,
          userId: owner.id,
          status: 'RESOLVED',
          startTime: new Date(Date.now() - 1000),
          endTime: new Date(),
        });
      }

      expect(await incidentModel.countDocuments({})).toBe(3);
    });
  });
});
