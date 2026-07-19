import logger from '../config/logger.js';
import { streamAssistantReply } from '../services/ai.services.js';

/**
 * Real-time AI assistant chat over Socket.IO.
 *
 * Client emits:  chat:message  { message, history: [{role, content}] }
 * Server emits:  chat:typing (bool), chat:chunk { id, chunk },
 *                chat:reply { id, message }, chat:error (string)
 */
export const handleSocketChat = (socket) => {
  socket.on('chat:message', async (payload, ack) => {
    const text = String(payload?.message || '').trim();
    const history = Array.isArray(payload?.history)
      ? payload.history.slice(-10)
      : [];

    if (!text) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Empty message' });
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    socket.emit('chat:typing', true);

    try {
      let full = '';
      await streamAssistantReply({ message: text, history }, (chunk) => {
        full += chunk;
        socket.emit('chat:chunk', { id, chunk });
      });
      socket.emit('chat:reply', { id, message: full });
      if (typeof ack === 'function') ack({ ok: true, id });
    } catch (err) {
      logger.error('AI chat error:', err);
      socket.emit('chat:error', 'The assistant is unavailable right now.');
      if (typeof ack === 'function') ack({ ok: false, error: 'AI error' });
    } finally {
      socket.emit('chat:typing', false);
    }
  });
};
