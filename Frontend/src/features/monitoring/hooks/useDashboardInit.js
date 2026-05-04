import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useMonitors } from "./useMonitor";
import { useIncident } from "./useIncident";
import { useLogs } from "./useLogs";
import { selectMonitors } from "../state/monitor.slice";
import { selectIncidents } from "../state/incident.slice";
import { selectLogs } from "../state/log.slice";

export const useDashboardInit = () => {
  const { handleGetMonitors } = useMonitors();
  const { handleGetAllIncidents } = useIncident();
  const { handleGetAllLogs } = useLogs();

  const monitors = useSelector(selectMonitors) || [];
  const incidents = useSelector(selectIncidents) || [];
  const logs = useSelector(selectLogs) || [];

  useEffect(() => {
    // The individual hooks will check their own `lastFetched` timestamps
    // to avoid duplicate API calls if the data is already fresh, so we 
    // can safely invoke them here on mount.
    handleGetMonitors();
    handleGetAllIncidents();
    handleGetAllLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    monitors,
    incidents,
    logs,
  };
};
