import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import logger from '../config/logger.js';
import { handleSocketChat } from './chat.socket.js';

let io;

/** The single room a socket may occupy. One tenant, one room, server-decided. */
export const roomFor = (userId) => `user:${String(userId)}`;

/** Tenant-scoped realtime events. Every one of these is room-addressed. */
export const SocketEvent = {
  MONITOR_STATUS: 'monitor:status',
  INCIDENT_OPENED: 'incident:opened',
  INCIDENT_CLOSED: 'incident:closed',
};

// Small dependency-free cookie reader for the handshake header
function getCookie(header, name) {
  if (!header) return null;
  const found = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // Same env-driven allow-list the REST API uses. Socket.IO enforces CORS
      // independently of Express, so pointing it at a single FRONTEND_URL while
      // the API allowed several was an inconsistency waiting to become a bug.
      origin: config.CORS_ORIGINS,
      credentials: true,
    },
  });

  // Authenticate every socket at handshake with the same auth cookie the REST
  // API uses. A connection that cannot present a valid JWT is refused outright
  // — there is no anonymous/read-only socket tier.
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie;
      const token =
        getCookie(cookieHeader, config.AUTH_COOKIE) ||
        getCookie(cookieHeader, 'accessToken') || // legacy name
        socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      const claims = jwt.verify(token, config.JWT_SECRET);
      // A token that verifies but carries no subject cannot be scoped to a
      // room, and an unscopeable socket must never be allowed to connect.
      if (!claims?.id) return next(new Error('Unauthorized'));

      socket.user = claims;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user.id);

    // Every socket lives in exactly one tenant room, joined from the VERIFIED
    // token — never from a client-supplied value. All tenant data is emitted
    // into rooms (see emitToUser), so a socket cannot receive another tenant's
    // events even if it guesses ids.
    socket.join(roomFor(userId));
    logger.info(`socket connected: ${socket.id} (user ${userId})`);

    // Deliberately no client-controlled `join`/`subscribe` handler: room
    // membership is decided by the server at handshake and cannot be widened
    // afterwards by anything the client sends.

    handleSocketChat(socket);

    socket.on('disconnect', () => {
      logger.info(`socket disconnected: ${socket.id}`);
    });
  });

  logger.info('socket.io server is running');
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('socket.io not initialized');
  }
  return io;
}

/**
 * Emit an event to every socket belonging to ONE user (no-op if offline).
 *
 * This is the only sanctioned way to push tenant data. Nothing in the codebase
 * calls `io.emit` — a broadcast would reach every connected tenant, which for a
 * monitoring product means leaking one customer's outage to all the others.
 *
 * A falsy userId is a no-op rather than a broadcast: the failure mode of a bug
 * here must be "nobody is notified", never "everybody is".
 */
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(roomFor(userId)).emit(event, payload);
}
