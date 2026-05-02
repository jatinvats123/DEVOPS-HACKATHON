import { Server } from 'socket.io'
import { config } from '../config/config.js';
import logger from '../config/logger.js';
import { handleSocketChat } from './chat.socket.js';

let io
export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: config.FRONTEND_URL,
            credentials: true
        }
    })

    logger.info(`socket io server is running`);
    io.on('connection', (socket) => {
        logger.info(`user is connected`, socket.id);
        handleSocketChat(socket);
        socket.on("disconnect", () => {
            logger.info("User disconnected:", socket.id);
        });
    })
}


export function getIO() {
    if (!io) {
        throw new Error("socket.io not initialized")
    }
    return io
}