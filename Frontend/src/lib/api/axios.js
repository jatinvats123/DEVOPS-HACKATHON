import axios from "axios";
import { env } from "../../config/env";

export const API = axios.create({
    baseURL: env.BACKEND_URL,
    withCredentials: true,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
});

// Add request interceptor to include auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;


