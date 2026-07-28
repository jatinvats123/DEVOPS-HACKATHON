import { Server } from 'socket.io';
import { config } from './config.js';
let io;
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  });
  return io;
};
export const getIO = () => io;
