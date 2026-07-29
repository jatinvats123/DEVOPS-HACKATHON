import { io } from 'socket.io-client';
import { env } from '../../config/env';

/**
 * Shared Socket.IO connection.
 *
 * Auth is cookie-based (`withCredentials`), matching the REST API — the JWT
 * cookie rides along on the handshake, so there is no token to manage here.
 *
 * The previous version accepted socket.io-client's defaults, which reconnect
 * forever at a fixed-ish interval with no visibility. Two problems with that on
 * a monitoring dashboard: the user cannot tell whether "no incidents" means
 * "nothing is wrong" or "we stopped receiving updates twenty minutes ago", and
 * a backend restart produces a synchronised reconnect stampede from every open
 * tab at once.
 */

export const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
  UNAUTHORIZED: 'unauthorized',
};

let socket = null;

export const getSocket = () => {
  if (socket) return socket;

  socket = io(env.BACKEND_URL || undefined, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],

    // Exponential backoff with jitter. `randomizationFactor` is what stops
    // every tab reconnecting in lockstep after a deploy and hammering the
    // server at the exact moment it is coming back up.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,

    timeout: 10000,
  });

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

/**
 * A disconnect the client caused itself (logout, navigating away) must not be
 * retried — socket.io does not auto-reconnect from an explicit `disconnect`,
 * and a server-side `io server disconnect` means we were deliberately kicked,
 * usually because the token expired.
 */
export const isTerminalDisconnect = (reason) =>
  reason === 'io client disconnect' || reason === 'io server disconnect';

export default getSocket;
