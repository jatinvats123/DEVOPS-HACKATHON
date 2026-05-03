import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
  setLoading,
  setMonitors,
  addMonitor,
  removeMonitor,
  setError,
} from '../state/monitor.slice';
import {
  getMonitors as fetchMonitorsApi,
  createMonitoring as createMonitoringApi,
  deleteMonitor as deleteMonitorApi,
} from '../services/monitor.api';

export const useMonitors = () => {
  const dispatch = useDispatch();
  const { monitors, loading, error } = useSelector((state) => state.monitor);

  const fetchMonitors = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      const response = await fetchMonitorsApi();
      // Adjust according to the actual response shape. 
      // Assuming response is the array of monitors or contains a data array
      const data = response?.data || response;
      dispatch(setMonitors(data));
    } catch (err) {
      dispatch(setError(err?.response?.data?.message || err.message || 'Failed to fetch monitors'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const createMonitor = useCallback(async (monitorData) => {
    try {
      dispatch(setLoading(true));
      const response = await createMonitoringApi(monitorData);
      // Adjust according to the actual response shape. 
      // Assuming response is the created monitor object or contains data
      const data = response?.data || response;
      dispatch(addMonitor(data));
      return { success: true, data };
    } catch (err) {
      dispatch(setError(err?.response?.data?.message || err.message || 'Failed to create monitor'));
      return { success: false, error: err };
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const removeMonitorById = useCallback(async (id) => {
    try {
      dispatch(setLoading(true));
      await deleteMonitorApi(id);
      // Dispatch ID to reducer to remove it locally based on backend success
      dispatch(removeMonitor(id));
      return { success: true };
    } catch (err) {
      dispatch(setError(err?.response?.data?.message || err.message || 'Failed to delete monitor'));
      return { success: false, error: err };
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  return {
    monitors,
    loading,
    error,
    fetchMonitors,
    addMonitor: createMonitor,
    removeMonitor: removeMonitorById,
  };
};
