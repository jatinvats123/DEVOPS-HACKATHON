import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';

/**
 * Email notifier.
 *
 * Lives in its own file because it needs the SMTP transport replaced, and under
 * native ESM a module's exports are read-only bindings — `jest.spyOn` on a
 * module namespace throws. `jest.unstable_mockModule` is the supported route,
 * and it requires the mock to be registered BEFORE the module under test is
 * imported, hence the dynamic imports below.
 */
const sendEmail = jest.fn();
jest.unstable_mockModule('../../src/services/sendEmail.js', () => ({
  sendEmail,
}));

const { emailNotifier } =
  await import('../../src/notifications/email.notifier.js');
const { IncidentEvent } = await import('../../src/notifications/notifier.js');
const { default: channelModel } =
  await import('../../src/models/channel.model.js');
const { connectTestDb, disconnectTestDb, clearTestDb } =
  await import('../helpers/db.js');
const { createUser, createMonitor } = await import('../helpers/factories.js');

describe('Email notifier', () => {
  let owner;
  let monitor;

  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    sendEmail.mockReset();
    sendEmail.mockResolvedValue(undefined);
    owner = await createUser({ email: 'owner@example.test' });
    monitor = await createMonitor(owner.id, { title: 'Checkout API' });
  });

  const payload = (overrides = {}) => ({
    event: IncidentEvent.OPENED,
    incident: {
      _id: '64b7f9f9f9f9f9f9f9f9f9f9',
      reason: 'HTTP 503',
      startTime: new Date(),
      duration: 42,
    },
    monitor,
    user: owner.user,
    occurredAt: new Date(),
    ...overrides,
  });

  it('supports both incident transitions and nothing else', () => {
    expect(emailNotifier.supports(IncidentEvent.OPENED)).toBe(true);
    expect(emailNotifier.supports(IncidentEvent.CLOSED)).toBe(true);
    expect(emailNotifier.supports('chat:message')).toBe(false);
  });

  it('delivers to the account address', async () => {
    const results = await emailNotifier.send(payload());

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].email).toBe('owner@example.test');
    expect(results[0].status).toBe('Delivered');
  });

  it('sends the OPENED template for an opening transition', async () => {
    await emailNotifier.send(payload({ event: IncidentEvent.OPENED }));
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/DOWN/);
  });

  it('sends the CLOSED template for a closing transition', async () => {
    await emailNotifier.send(payload({ event: IncidentEvent.CLOSED }));
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/Resolved|back UP/);
  });

  it('also delivers to configured email channels', async () => {
    await channelModel.create({
      userId: owner.id,
      type: 'Email',
      target: 'oncall@example.test',
      active: true,
    });

    const results = await emailNotifier.send(payload());

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
  });

  it('DE-DUPLICATES a channel that repeats the account address', async () => {
    await channelModel.create({
      userId: owner.id,
      type: 'Email',
      target: 'owner@example.test',
      active: true,
    });

    // Nobody should be emailed twice for one transition.
    await emailNotifier.send(payload());
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('ignores inactive channels', async () => {
    await channelModel.create({
      userId: owner.id,
      type: 'Email',
      target: 'muted@example.test',
      active: false,
    });

    await emailNotifier.send(payload());
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('ignores channels belonging to another tenant', async () => {
    const other = await createUser({ email: 'other@example.test' });
    await channelModel.create({
      userId: other.id,
      type: 'Email',
      target: 'stranger@example.test',
      active: true,
    });

    await emailNotifier.send(payload());
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].email).toBe('owner@example.test');
  });

  it('ignores non-email channel types', async () => {
    await channelModel.create({
      userId: owner.id,
      type: 'Webhook',
      target: 'https://hooks.test/x',
      active: true,
    });

    await emailNotifier.send(payload());
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('reports a per-recipient failure without suppressing the others', async () => {
    await channelModel.create({
      userId: owner.id,
      type: 'Email',
      target: 'oncall@example.test',
      active: true,
    });

    sendEmail
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('mailbox full'));

    const results = await emailNotifier.send(payload());

    // One bad address degrades to a Failed audit row, it does not suppress
    // delivery to everyone else.
    expect(results.map((r) => r.status).sort()).toEqual([
      'Delivered',
      'Failed',
    ]);
  });

  it('never throws when SMTP is entirely unavailable', async () => {
    sendEmail.mockRejectedValue(new Error('SMTP unreachable'));

    const results = await emailNotifier.send(payload());
    expect(results[0].status).toBe('Failed');
  });

  it('skips when the account has no address on file', async () => {
    const results = await emailNotifier.send(
      payload({ user: { _id: owner.id } })
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(results[0].status).toBe('Skipped');
  });

  it('still emails the account when the channel lookup fails', async () => {
    const spy = jest
      .spyOn(channelModel, 'find')
      .mockRejectedValue(new Error('collection unavailable'));

    // Extra channels are a bonus; the account address is the guarantee.
    const results = await emailNotifier.send(payload());
    expect(results[0].status).toBe('Delivered');

    spy.mockRestore();
  });
});
