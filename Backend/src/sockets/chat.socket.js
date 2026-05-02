import logger from "../config/logger.js";

export const handleSocketChat = (socket) => {
    socket.on("send_message", async (data, callback) => {
        try {
            const { message } = data;


            socket.emit("typing", true);

            socket.emit("typing", false);
            socket.emit("receive_message", { chat, aimesg });

        } catch (err) {
            logger.error(err);
            socket.emit("error", "Something went wrong");
        }
    });
};