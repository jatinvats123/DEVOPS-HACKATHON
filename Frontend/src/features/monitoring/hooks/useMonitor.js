import { useDispatch, useSelector } from "react-redux";

import {
  setLoading,
  setMonitors,
  addMonitor,

  removeMonitor,
  setError,
} from "../state/monitor.slice";
import {
createMonitoring,getMonitors,deleteMonitor
} from "../services/monitor.api";


export const useMonitors = ()=>{
    const dispatch = useDispatch();
    const monitors = useSelector((state) => state.monitor.monitors);
    const lastFetched = useSelector((state) => state.monitor.lastFetched);

const handleCreateMonitor = async (monitorData) => {
  try{
    dispatch(setLoading(true));
    const response = await createMonitoring(monitorData);
    
    // Safely extract data depending on backend structure
    const newMonitor = response?.data?.data || response?.data || response;
    dispatch(addMonitor(newMonitor));
  }catch(error){
    dispatch(setError(error.message));
  }finally{
    dispatch(setLoading(false));
  }
} 


const handleGetMonitors = async (forceRefetch = false) => {
  const CACHE_TIME = 2 * 60 * 1000;
  const isFresh = lastFetched && (Date.now() - lastFetched < CACHE_TIME);

  if (monitors.length > 0 && isFresh && !forceRefetch) {
    return;
  }

  try {
    dispatch(setLoading(true));
    const response = await getMonitors();
    
    // Safely extract data depending on backend structure
    const monitorsList = response?.data?.data || response?.data || (Array.isArray(response) ? response : []);
    dispatch(setMonitors(monitorsList));
  } catch (error) {
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
}

const handleDeleteMonitor = async (monitorId) => {
  try {
    dispatch(setLoading(true));
    const response = await deleteMonitor(monitorId);
    
    // If apiRequest didn't throw an error, it was a 2xx success
    dispatch(removeMonitor(monitorId));
    return { success: true, message: response?.message || 'Monitor deleted successfully' };
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || 'Failed to delete monitor';
    console.error("Delete Monitor Error:", errorMessage);
    dispatch(setError(errorMessage));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
}


return {
  handleCreateMonitor,
  handleGetMonitors,
  handleDeleteMonitor,
}
}