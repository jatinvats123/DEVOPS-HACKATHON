import axios from 'axios';
import { env } from '../../config/env';

export const API = axios.create({
  baseURL: env.BACKEND_URL,
  withCredentials: true,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Cookie-based authentication is handled automatically by the browser
// due to withCredentials: true. No need to manually set Authorization header.

export default API;
