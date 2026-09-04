// src/api/axiosClient.js
//
// A single shared Axios instance so every API call in the app uses the same
// base URL and (in later phases) the same auth-header/interceptor setup,
// instead of every component constructing its own request config.

import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosClient;
