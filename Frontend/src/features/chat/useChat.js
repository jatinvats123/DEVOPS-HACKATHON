import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket, getSocket } from '../../lib/socket/socket';

/**
 * Manages the real-time AI assistant conversation over Socket.IO.
 * Handles streaming chunks, typing state, and connection status.
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesRef = useRef(messages);

  // Keep the ref in sync without writing to it during render
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const upsertAssistant = (id, updater) =>
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) {
          return [...prev, { id, role: 'assistant', content: updater('') }];
        }
        const copy = [...prev];
        copy[idx] = { ...copy[idx], content: updater(copy[idx].content) };
        return copy;
      });

    const onChunk = ({ id, chunk }) =>
      upsertAssistant(id, (prev) => prev + chunk);
    const onReply = ({ id, message }) => upsertAssistant(id, () => message);
    const onTyping = (v) => setTyping(Boolean(v));
    const onError = (msg) => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: msg, error: true },
      ]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:chunk', onChunk);
    socket.on('chat:reply', onReply);
    socket.on('chat:typing', onTyping);
    socket.on('chat:error', onError);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:chunk', onChunk);
      socket.off('chat:reply', onReply);
      socket.off('chat:typing', onTyping);
      socket.off('chat:error', onError);
    };
  }, []);

  const send = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const history = messagesRef.current
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: trimmed },
    ]);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('chat:message', { message: trimmed, history });
  }, []);

  return { messages, typing, connected, send };
}
