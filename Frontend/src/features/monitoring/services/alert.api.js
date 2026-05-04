import axios from "axios";
import { env } from "../../../config/env";

const API_URL = `${env.BACKEND_URL}/alerts`;

export const getAlerts = async () => {
  return await axios.get(API_URL, { withCredentials: true });
};

export const createAlert = async (alertData) => {
  return await axios.post(API_URL, alertData, { withCredentials: true });
};

export const toggleAlertStatus = async (alertId) => {
  return await axios.patch(`${API_URL}/${alertId}`, {}, { withCredentials: true });
};

export const deleteAlert = async (alertId) => {
  return await axios.delete(`${API_URL}/${alertId}`, { withCredentials: true });
};

export const getAlertHistory = async () => {
  return await axios.get(`${API_URL}/history`, { withCredentials: true });
};
