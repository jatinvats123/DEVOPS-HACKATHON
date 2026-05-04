import { useDispatch } from "react-redux";

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

const handleCreateMonitor = async (monitorData) => {
  try{
    dispatch(setLoading(true));
    const response = await createMonitoring(monitorData);
    console.log("Create Monitor Response:", response);
    
    // Safely extract data depending on backend structure
    const newMonitor = response?.data?.data || response?.data || response;
    dispatch(addMonitor(newMonitor));
  }catch(error){
    dispatch(setError(error.message));
  }finally{
    dispatch(setLoading(false));
  }
} 


const handleGetMonitors = async () => {
  try {
    dispatch(setLoading(true));
    const response = await getMonitors();
    console.log("Get Monitors Response:", response);
    
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
    await deleteMonitor(monitorId);
    dispatch(removeMonitor(monitorId));
  } catch (error) {
    dispatch(setError(error.message));
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