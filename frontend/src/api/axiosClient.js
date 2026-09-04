// src/api/axiosClient.js
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  withCredentials: true, // required for the httpOnly refresh-token cookie
});

// The access token lives in memory (set by AuthContext), never in
// localStorage. This function lets AuthContext push the current token in
// without axiosClient needing to import React.
let currentAccessToken = null;
export function setAccessToken(token) {
  currentAccessToken = token;
}

axiosClient.interceptors.request.use((config) => {
  if (currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

export default axiosClient;