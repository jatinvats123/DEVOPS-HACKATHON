import { useCallback, useEffect, useRef, useState } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  ConnectionState,
  isTerminalDisconnect,
} from './socket';

/**
 * Realtime connection lifecycle: state, reconnection, and resync.
 *
 * THE RESYNC IS THE POINT. While a socket is down, events are not queued — they
 * are lost. Reconnecting restores the pipe but not the missed events, so a
 * dashboard that only listens to the socket silently displays state frozen at
 * the moment the connection dropped, with no indication anything is stale. On a
 * status dashboard that means showing "all systems operational" through an
 * outage that started while the socket was disconnected.
 *
 * So every (re)connection triggers a full refetch, and the UI is told when the
 * data it is showing may be stale.
 *
 * @param {() => void|Promise<void>} onResync  refetch everything this view owns
 */
export function useRealtime(onResync) {
  const [state, setState] = useState(ConnectionState.CONNECTING);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Keep the callback in a ref so re-renders do not tear down and rebuild the
  // socket listeners on every parent render. Updated in an effect rather than
  // during render — mutating a ref while rendering breaks concurrent rendering,
  // where React may render a component without committing it.
  const resyncRef = useRef(onResync);
  useEffect(() => {
    resyncRef.current = onResync;
  }, [onResync]);

  // Distinguishes the FIRST connect from a re-connect: only the latter needs a
  // resync, because the initial page load has already fetched.
  const hasConnectedBefore = useRef(false);

  const resync = useCallback(async () => {
    try {
      await resyncRef.current?.();
    } catch (err) {
      // A failed resync must not break the connection indicator itself.
      console.error('[realtime] resync failed', err);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setState(ConnectionState.CONNECTED);
      setLastConnectedAt(new Date());
      setReconnectAttempt(0);

      if (hasConnectedBefore.current) {
        // Catch up on everything missed while the socket was down.
        resync();
      }
      hasConnectedBefore.current = true;
    };

    const handleDisconnect = (reason) => {
      setState(
        isTerminalDisconnect(reason)
          ? ConnectionState.DISCONNECTED
          : ConnectionState.RECONNECTING
      );
    };

    const handleConnectError = (err) => {
      // The server rejects the handshake when the JWT is missing or expired.
      // Retrying forever against a 401 is pointless and hammers the server —
      // the user needs to log in again, which is a different message entirely.
      const unauthorized = /unauthorized/i.test(err?.message || '');
      setState(
        unauthorized
          ? ConnectionState.UNAUTHORIZED
          : ConnectionState.RECONNECTING
      );
      if (unauthorized) socket.disconnect();
    };

    const handleReconnectAttempt = (attempt) => {
      setState(ConnectionState.RECONNECTING);
      setReconnectAttempt(attempt);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    connectSocket();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [resync]);

  /**
   * The browser suspends timers and sockets in background tabs. A tab restored
   * after hours can believe it is still connected while showing state that is
   * hours stale, so returning to visibility forces a resync regardless of what
   * the socket thinks.
   */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const socket = getSocket();
      if (socket.connected) resync();
      else connectSocket();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [resync]);

  /** Coming back online is a strong signal to reconnect immediately. */
  useEffect(() => {
    const handleOnline = () => connectSocket();
    const handleOffline = () => setState(ConnectionState.RECONNECTING);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const retryNow = useCallback(() => {
    setState(ConnectionState.CONNECTING);
    connectSocket();
  }, []);

  return {
    state,
    lastConnectedAt,
    reconnectAttempt,
    retryNow,
    disconnect: disconnectSocket,
    isConnected: state === ConnectionState.CONNECTED,
    isStale:
      state === ConnectionState.RECONNECTING ||
      state === ConnectionState.DISCONNECTED,
  };
}

export default useRealtime;
