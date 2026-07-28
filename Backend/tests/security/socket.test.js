import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { createTenant } from '../helpers/factories.js';
import {
  initSocket,
  emitToUser,
  SocketEvent,
  roomFor,
} from '../../src/sockets/server.socket.js';
import { config } from '../../src/config/config.js';

/**
 * Socket.IO authorisation and tenant isolation.
 *
 * The realtime channel is the easiest place to leak tenant data, because rooms
 * are invisible in the HTTP surface and a stray `io.emit` reaches every
 * connected customer at once. These tests assert both halves of the contract:
 * an unauthenticated socket cannot connect at all, and an authenticated one
 * receives strictly its own tenant's events.
 */
describe('Socket.IO authorisation and tenant rooms', () => {
  let server;
  let url;
  let ioServer;
  const clients = [];

  const connect = (options) =>
    new Promise((resolve, reject) => {
      const socket = ioClient(url, {
        transports: ['websocket'],
        reconnection: false,
        ...options,
      });
      clients.push(socket);
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });

  /** Collect events for a short window — long enough to catch a leak. */
  const collect = (socket, event, ms = 250) =>
    new Promise((resolve) => {
      const received = [];
      socket.on(event, (payload) => received.push(payload));
      setTimeout(() => resolve(received), ms);
    });

  beforeAll(async () => {
    await connectTestDb();
    server = http.createServer();
    ioServer = initSocket(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    clients.forEach((c) => c.close());
    ioServer?.close();
    await new Promise((resolve) => server.close(resolve));
    await disconnectTestDb();
  });

  beforeEach(clearTestDb);

  describe('handshake authentication', () => {
    it('refuses a connection with no token', async () => {
      await expect(connect({})).rejects.toThrow(/unauthorized/i);
    });

    it('refuses a token signed with the wrong secret', async () => {
      const forged =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0YjdmOWY5ZjlmOWY5ZjlmOWY5ZjlmOSJ9.bad';
      await expect(connect({ auth: { token: forged } })).rejects.toThrow(
        /unauthorized/i
      );
    });

    it('accepts a valid token via the auth cookie', async () => {
      const alice = await createTenant({
        username: 'alice',
        email: 'alice@example.test',
      });
      const socket = await connect({
        extraHeaders: { Cookie: alice.cookie },
      });
      expect(socket.connected).toBe(true);
    });

    it('accepts a valid token via the auth payload', async () => {
      const alice = await createTenant({
        username: 'alice2',
        email: 'alice2@example.test',
      });
      const socket = await connect({ auth: { token: alice.token } });
      expect(socket.connected).toBe(true);
    });
  });

  describe('room scoping', () => {
    it('joins each socket to its own tenant room, taken from the verified token', async () => {
      const alice = await createTenant({
        username: 'alice3',
        email: 'alice3@example.test',
      });
      const socket = await connect({ auth: { token: alice.token } });

      const room = ioServer.sockets.adapter.rooms.get(roomFor(alice.id));
      expect(room).toBeDefined();
      expect(room.has(socket.id)).toBe(true);
    });

    it("does NOT deliver another tenant's events", async () => {
      const alice = await createTenant({
        username: 'alice4',
        email: 'alice4@example.test',
      });
      const bob = await createTenant({
        username: 'bob4',
        email: 'bob4@example.test',
      });

      const aliceSocket = await connect({ auth: { token: alice.token } });
      const bobSocket = await connect({ auth: { token: bob.token } });

      const aliceEvents = collect(aliceSocket, SocketEvent.MONITOR_STATUS);
      const bobEvents = collect(bobSocket, SocketEvent.MONITOR_STATUS);

      // An event that belongs exclusively to Alice.
      emitToUser(alice.id, SocketEvent.MONITOR_STATUS, {
        monitorId: String(alice.monitor._id),
        status: 'DOWN',
        secret: 'alice-only',
      });

      expect(await aliceEvents).toHaveLength(1);
      // The assertion that matters: Bob's socket saw nothing.
      expect(await bobEvents).toHaveLength(0);
    });

    it('delivers incident events only to the owning tenant', async () => {
      const alice = await createTenant({
        username: 'alice5',
        email: 'alice5@example.test',
      });
      const bob = await createTenant({
        username: 'bob5',
        email: 'bob5@example.test',
      });

      const aliceSocket = await connect({ auth: { token: alice.token } });
      const bobSocket = await connect({ auth: { token: bob.token } });

      const aliceOpened = collect(aliceSocket, SocketEvent.INCIDENT_OPENED);
      const bobOpened = collect(bobSocket, SocketEvent.INCIDENT_OPENED);

      emitToUser(bob.id, SocketEvent.INCIDENT_OPENED, {
        monitorId: String(bob.monitor._id),
        reason: 'bob-only outage',
      });

      expect(await bobOpened).toHaveLength(1);
      expect(await aliceOpened).toHaveLength(0);
    });

    it("a client cannot join another tenant's room by asking", async () => {
      const alice = await createTenant({
        username: 'alice6',
        email: 'alice6@example.test',
      });
      const bob = await createTenant({
        username: 'bob6',
        email: 'bob6@example.test',
      });

      const aliceSocket = await connect({ auth: { token: alice.token } });

      // There is no server-side join/subscribe handler, so these are inert.
      aliceSocket.emit('join', roomFor(bob.id));
      aliceSocket.emit('subscribe', { room: roomFor(bob.id) });
      await new Promise((r) => setTimeout(r, 100));

      const leaked = collect(aliceSocket, SocketEvent.MONITOR_STATUS);
      emitToUser(bob.id, SocketEvent.MONITOR_STATUS, { secret: 'bob-only' });
      expect(await leaked).toHaveLength(0);

      const bobRoom = ioServer.sockets.adapter.rooms.get(roomFor(bob.id));
      expect(bobRoom?.has(aliceSocket.id) ?? false).toBe(false);
    });

    it('emitToUser with a falsy id is a no-op, never a broadcast', async () => {
      const alice = await createTenant({
        username: 'alice7',
        email: 'alice7@example.test',
      });
      const socket = await connect({ auth: { token: alice.token } });

      const received = collect(socket, SocketEvent.MONITOR_STATUS);
      emitToUser(undefined, SocketEvent.MONITOR_STATUS, { secret: 'nobody' });
      emitToUser(null, SocketEvent.MONITOR_STATUS, { secret: 'nobody' });

      // The failure mode of a bug here must be "nobody is notified", never
      // "everybody is".
      expect(await received).toHaveLength(0);
    });
  });

  it('uses the same auth cookie name as the REST API', () => {
    // A drift between these two would silently disable socket auth.
    expect(config.AUTH_COOKIE).toBe('uptimeaitoken');
  });
});
