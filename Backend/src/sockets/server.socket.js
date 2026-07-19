import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import logger from '../config/logger.js';
import { handleSocketChat } from './chat.socket.js';

let io;

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
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  });

  // Authenticate each socket with the same JWT accessToken cookie as the REST API
  io.use((socket, next) => {
    try {
      const token =
        getCookie(socket.handshake.headers?.cookie, 'accessToken') ||
        socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      socket.user = jwt.verify(token, config.JWT_SECRET);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) socket.join(`user:${userId}`); // per-user room for targeted pushes
    logger.info(`socket connected: ${socket.id} (user ${userId})`);

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

/** Emit an event to every socket belonging to a user (no-op if offline). */
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
}
