import { useEffect } from 'react';
import { connectSocket, getSocket } from '../../lib/socket/socket';

/**
 * Subscribe to real-time monitor/incident events pushed by the backend.
 * @param {{ onMonitorUpdate?: Function, onIncidentNew?: Function, onIncidentResolved?: Function }} handlers
 */
export function useMonitorEvents({
  onMonitorUpdate,
  onIncidentNew,
  onIncidentResolved,
} = {}) {
  useEffect(() => {
    const socket = connectSocket();

    const mu = (p) => onMonitorUpdate?.(p);
    const inew = (p) => onIncidentNew?.(p);
    const ires = (p) => onIncidentResolved?.(p);

    socket.on('monitor:update', mu);
    socket.on('incident:new', inew);
    socket.on('incident:resolved', ires);

    return () => {
      const s = getSocket();
      s.off('monitor:update', mu);
      s.off('incident:new', inew);
      s.off('incident:resolved', ires);
    };
  }, [onMonitorUpdate, onIncidentNew, onIncidentResolved]);
}
