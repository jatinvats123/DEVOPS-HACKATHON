import { useDispatch, useSelector } from "react-redux";

import {
  setLoading,
  setMonitors,
  addMonitor,
  setIncidents,
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
dispatch(addMonitor(response.data.data));
  }catch(error){
    dispatch(setError(error.message));
  }finally{
    dispatch(setLoading(false));
  }
} 


return {
  handleCreateMonitor,
}
}