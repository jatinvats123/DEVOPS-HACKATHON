import { useDispatch, useSelector } from "react-redux";
import { getAllLogs, getLogsByMonitorId } from "../services/logs.api";
import {
  setLogsLoading,
  setLogsError,
  setLogs,
  setSelectedLogs,
} from "../state/log.slice";

export const useLogs = () => {
  const dispatch = useDispatch();

  const logs = useSelector((state) => state.log.logs);
  const selectedLogs = useSelector((state) => state.log.selectedLogs);
  const loading = useSelector((state) => state.log.loading);
  const error = useSelector((state) => state.log.error);
  const lastFetched = useSelector((state) => state.log.lastFetched);

  const handleGetAllLogs = async (forceRefetch = false) => {
    const CACHE_TIME = 2 * 60 * 1000;
    const isFresh = lastFetched && (Date.now() - lastFetched < CACHE_TIME);

    if (logs.length > 0 && isFresh && !forceRefetch) {
      return;
    }

    try {
      dispatch(setLogsLoading(true));
      const response = await getAllLogs();
      
      const logsList = response?.data?.data || response?.data || (Array.isArray(response) ? response : []);
      
      // Keep logs sorted (latest first)
      const sortedLogs = [...logsList].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return dateB - dateA;
      });

      dispatch(setLogs(sortedLogs));
    } catch (err) {
      dispatch(setLogsError(err.message));
    } finally {
      dispatch(setLogsLoading(false));
    }
  };

  const handleGetLogsByMonitorId = async (monitorId) => {
    try {
      dispatch(setLogsLoading(true));
      const response = await getLogsByMonitorId(monitorId);
      
      const logsList = response?.data?.data || response?.data || (Array.isArray(response) ? response : []);
      
      const sortedLogs = [...logsList].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return dateB - dateA;
      });

      dispatch(setSelectedLogs(sortedLogs));
    } catch (err) {
      dispatch(setLogsError(err.message));
    } finally {
      dispatch(setLogsLoading(false));
    }
  };

  return {
    logs,
    selectedLogs,
    loading,
    error,
    handleGetAllLogs,
    handleGetLogsByMonitorId,
  };
};
