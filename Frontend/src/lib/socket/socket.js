import { io } from 'socket.io-client';
import { env } from '../../config/env';

let socket = null;

/**
 * Lazily create the shared Socket.IO connection. Auth is cookie-based
 * (withCredentials), matching the REST API — the JWT auth cookie is sent
 * automatically on the handshake.
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(env.BACKEND_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};
