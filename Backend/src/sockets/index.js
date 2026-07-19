import { Server } from 'socket.io';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import logger from '../config/logger.js';
import { registerChatHandlers } from './chat.handler.js';

let io = null;

/**
 * Initialize Socket.IO on the given HTTP server.
 * Authenticates each connection via the same JWT accessToken cookie the REST
 * API uses, then joins the socket to a per-user room so we can push targeted
 * real-time updates (live monitor status, new incidents, AI chat).
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.CORS_ORIGINS,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers?.cookie || '';
      const token =
        parse(rawCookie).accessToken || socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      socket.user = jwt.verify(token, config.JWT_SECRET);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) socket.join(`user:${userId}`);
    logger.info(`socket connected: ${socket.id} (user ${userId})`);

    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/** Emit an event to every socket belonging to a given user (no-op if offline). */
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
}
