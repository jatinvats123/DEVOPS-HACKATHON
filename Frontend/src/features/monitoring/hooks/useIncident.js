import { useDispatch, useSelector } from "react-redux";
import { getAllIncidents } from "../services/incident.api";
import {
  setIncidentLoading,
  setIncidents,
  setIncidentError,
} from "../state/incident.slice";

export const useIncident = () => {
  const dispatch = useDispatch();
  
  // Need to get state to check if we should refetch
  const incidents = useSelector((state) => state.incident.incidents);
  const loading = useSelector((state) => state.incident.loading);
  const error = useSelector((state) => state.incident.error);
  const lastFetched = useSelector((state) => state.incident.lastFetched);

  const handleGetAllIncidents = async (forceRefetch = false) => {
    // If incidents exist and recently fetched (within 2 mins) and no forceRefetch, do NOT refetch
    const CACHE_TIME = 2 * 60 * 1000; 
    const isFresh = lastFetched && (Date.now() - lastFetched < CACHE_TIME);
    
    if (incidents.length > 0 && isFresh && !forceRefetch) {
      console.log("Incidents recently fetched, skipping API call.");
      return;
    }

    try {
      dispatch(setIncidentLoading(true));
      const response = await getAllIncidents();
      console.log("Get All Incidents Response:", response);
      
      // Safely extract data depending on backend structure
      const incidentsList = response?.data?.data || response?.data || (Array.isArray(response) ? response : []);
      
      // Sort by createdAt DESC to ensure latest appear first (if not already sorted by backend)
      const sortedIncidents = [...incidentsList].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.startTime).getTime();
        const dateB = new Date(b.createdAt || b.startTime).getTime();
        return dateB - dateA;
      });

      dispatch(setIncidents(sortedIncidents));
    } catch (err) {
      dispatch(setIncidentError(err.message));
    } finally {
      dispatch(setIncidentLoading(false));
    }
  };

  return {
    incidents,
    loading,
    error,
    handleGetAllIncidents,
  };
};
