import axios from "axios";
import { env } from "../../config/env";

export const API = axios.create({
    baseURL: env.BACKEND_URL,
    withCredentials: true,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        throw error;
    }
);

