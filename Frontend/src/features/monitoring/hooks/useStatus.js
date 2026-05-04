import { useDispatch, useSelector } from "react-redux";
import { getLogsByMonitorId } from "../services/logs.api";
import {
  setStatusLoading,
  setStatusError,
  setMonitorStatus,
  selectStatusData,
  selectStatusLoading,
  selectStatusError,
} from "../state/status.slice";

export const useStatus = () => {
  const dispatch = useDispatch();

  const statusData = useSelector(selectStatusData);
  const loading = useSelector(selectStatusLoading);
  const error = useSelector(selectStatusError);

  const handleGetMonitorStatus = async (monitorId, forceRefetch = false) => {
    // Basic caching: avoid fetching if we already have status for this monitor
    // and aren't forcing a refetch
    if (statusData[monitorId] && !forceRefetch) {
      return;
    }

    try {
      dispatch(setStatusLoading(true));
      const response = await getLogsByMonitorId(monitorId);

      const logsList =
        response?.data?.data ||
        response?.data ||
        (Array.isArray(response) ? response : []);

      // Sort logs by createdAt descending
      const sortedLogs = [...logsList].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return dateB - dateA;
      });

      let status = "UP"; // default to UP
      let lastChecked = null;

      if (sortedLogs.length > 0) {
        const latestLog = sortedLogs[0];
        lastChecked = latestLog.createdAt || latestLog.timestamp;

        const logStatus = (latestLog.status || "").toUpperCase();
        const logMessage = (latestLog.message || latestLog.reason || "").toUpperCase();

        if (
          logStatus === "DOWN" ||
          logStatus === "ERROR" ||
          logStatus === "FAILING" ||
          logMessage.includes("FAIL") ||
          logMessage.includes("ERROR") ||
          logMessage.includes("DOWN") ||
          logMessage.includes("TIMEOUT")
        ) {
          status = "DOWN";
        }
      } else {
        // If there are no logs, we assume it's pending or hasn't run yet
        status = "PENDING";
      }

      dispatch(
        setMonitorStatus({
          monitorId,
          status,
          lastChecked,
          logs: sortedLogs,
        })
      );
    } catch (err) {
      dispatch(setStatusError(err.message || "Failed to fetch monitor status"));
    } finally {
      dispatch(setStatusLoading(false));
    }
  };

  return {
    statusData,
    loading,
    error,
    handleGetMonitorStatus,
  };
};
