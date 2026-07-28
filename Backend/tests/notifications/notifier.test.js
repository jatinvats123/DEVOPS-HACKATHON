import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { createUser, createMonitor } from '../helpers/factories.js';
import {
  NotifierRegistry,
  IncidentEvent,
} from '../../src/notifications/notifier.js';
import notificationLogModel from '../../src/models/notificationLog.model.js';

/**
 * The pluggable notifier seam.
 *
 * The contract that matters: incident logic must never learn how a message is
 * delivered, and a broken channel must never be able to affect an incident.
 */
describe('Notifier registry', () => {
  let owner;
  let monitor;
  let registry;

  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    owner = await createUser();
    monitor = await createMonitor(owner.id);
    registry = new NotifierRegistry();
  });

  const payload = (overrides = {}) => ({
    event: IncidentEvent.OPENED,
    incident: { _id: '64b7f9f9f9f9f9f9f9f9f9f9', reason: 'HTTP 503' },
    monitor,
    user: owner.user,
    occurredAt: new Date(),
    ...overrides,
  });

  const stub = (name, impl) => ({
    name,
    supports: () => true,
    send: impl ?? jest.fn().mockResolvedValue({ status: 'Delivered' }),
  });

  describe('registration', () => {
    it('registers and lists notifiers', () => {
      registry.register(stub('Email')).register(stub('Webhook'));
      expect(registry.list()).toEqual(['Email', 'Webhook']);
    });

    it('rejects a notifier with no name or no send()', () => {
      expect(() => registry.register({ send: jest.fn() })).toThrow();
      expect(() => registry.register({ name: 'Broken' })).toThrow();
    });

    it('defaults supports() to accepting everything', async () => {
      const send = jest.fn().mockResolvedValue({ status: 'Delivered' });
      registry.register({ name: 'Minimal', send });

      await registry.dispatch(payload());
      expect(send).toHaveBeenCalled();
    });

    it('replaces rather than duplicates on re-registration', async () => {
      const first = jest.fn().mockResolvedValue({ status: 'Delivered' });
      const second = jest.fn().mockResolvedValue({ status: 'Delivered' });

      registry.register(stub('Email', first));
      registry.register(stub('Email', second));

      await registry.dispatch(payload());
      expect(registry.list()).toEqual(['Email']);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('unregisters and clears', () => {
      registry.register(stub('Email')).register(stub('Webhook'));
      registry.unregister('Email');
      expect(registry.list()).toEqual(['Webhook']);

      registry.clear();
      expect(registry.list()).toEqual([]);
    });
  });

  describe('dispatch', () => {
    it('fans out to every notifier that supports the event', async () => {
      const email = jest.fn().mockResolvedValue({ status: 'Delivered' });
      const webhook = jest.fn().mockResolvedValue({ status: 'Delivered' });

      registry
        .register(stub('Email', email))
        .register(stub('Webhook', webhook));
      await registry.dispatch(payload());

      expect(email).toHaveBeenCalledTimes(1);
      expect(webhook).toHaveBeenCalledTimes(1);
    });

    it('skips notifiers that do not support the event', async () => {
      const send = jest.fn().mockResolvedValue({ status: 'Delivered' });
      registry.register({
        name: 'ClosedOnly',
        supports: (event) => event === IncidentEvent.CLOSED,
        send,
      });

      await registry.dispatch(payload({ event: IncidentEvent.OPENED }));
      expect(send).not.toHaveBeenCalled();

      await registry.dispatch(payload({ event: IncidentEvent.CLOSED }));
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('NEVER throws when a notifier throws', async () => {
      registry.register(
        stub('Email', async () => {
          throw new Error('SMTP exploded');
        })
      );

      // The incident is the source of truth; delivery is best effort.
      const results = await registry.dispatch(payload());
      expect(results[0].status).toBe('Failed');
      expect(results[0].detail).toMatch(/exploded/);
    });

    it('isolates notifiers from each other', async () => {
      const healthy = jest.fn().mockResolvedValue({ status: 'Delivered' });
      registry
        .register(
          stub('Broken', async () => {
            throw new Error('down');
          })
        )
        .register(stub('Email', healthy));

      const results = await registry.dispatch(payload());

      // One dead channel must not suppress delivery on the others.
      expect(healthy).toHaveBeenCalledTimes(1);
      expect(results.map((r) => r.status).sort()).toEqual([
        'Delivered',
        'Failed',
      ]);
    });

    it('normalises a notifier that returns MANY results', async () => {
      registry.register(
        stub('Email', async () => [
          { status: 'Delivered', target: 'a@example.test' },
          { status: 'Failed', target: 'b@example.test' },
        ])
      );

      const results = await registry.dispatch(payload());
      expect(results).toHaveLength(2);
    });

    it('tolerates a notifier that returns nothing', async () => {
      registry.register(stub('Webhook', async () => undefined));
      await expect(registry.dispatch(payload())).resolves.toEqual([]);
    });

    it('does nothing when no notifiers are registered', async () => {
      await expect(registry.dispatch(payload())).resolves.toEqual([]);
    });
  });

  describe('user preferences', () => {
    it('short-circuits every channel when incident alerts are disabled', async () => {
      const send = jest.fn().mockResolvedValue({ status: 'Delivered' });
      registry.register(stub('Email', send));

      const optedOut = {
        ...owner.user.toObject(),
        preferences: { incidentAlerts: false },
      };
      const results = await registry.dispatch(payload({ user: optedOut }));

      expect(send).not.toHaveBeenCalled();
      expect(results[0].status).toBe('Skipped');
    });

    it('logs the opt-out so the silence is explainable', async () => {
      registry.register(stub('Email'));
      const optedOut = {
        ...owner.user.toObject(),
        preferences: { incidentAlerts: false },
      };

      await registry.dispatch(payload({ user: optedOut }));

      const rows = await notificationLogModel.find({});
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('Skipped');
      expect(rows[0].detail).toMatch(/disabled/i);
    });
  });

  describe('audit trail', () => {
    it('records one row per delivery attempt', async () => {
      registry.register(stub('Email')).register(
        stub('Webhook', async () => {
          throw new Error('receiver down');
        })
      );

      await registry.dispatch(payload());

      // "Did the customer actually get told?" must stay answerable.
      const rows = await notificationLogModel.find({ userId: owner.id });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.status).sort()).toEqual(['Delivered', 'Failed']);
    });

    it('maps internal events onto the labels the UI renders', async () => {
      registry.register(stub('Email'));

      await registry.dispatch(payload({ event: IncidentEvent.OPENED }));
      await registry.dispatch(payload({ event: IncidentEvent.CLOSED }));

      const labels = (await notificationLogModel.find({})).map((r) => r.event);
      expect(labels.sort()).toEqual(['CRITICAL_OUTAGE', 'HEALTH_RECOVERY']);
    });

    it('scopes audit rows to the owner and monitor', async () => {
      registry.register(stub('Email'));
      await registry.dispatch(payload());

      const row = await notificationLogModel.findOne({});
      expect(String(row.userId)).toBe(owner.id);
      expect(String(row.monitorId)).toBe(String(monitor._id));
    });

    it('still delivers when writing the audit row fails', async () => {
      const send = jest.fn().mockResolvedValue({ status: 'Delivered' });
      registry.register(stub('Email', send));

      const spy = jest
        .spyOn(notificationLogModel, 'create')
        .mockRejectedValue(new Error('audit collection unavailable'));

      // Losing an audit row must not escalate into losing the notification.
      await expect(registry.dispatch(payload())).resolves.toHaveLength(1);
      expect(send).toHaveBeenCalled();

      spy.mockRestore();
    });
  });
});
