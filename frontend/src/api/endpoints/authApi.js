import axiosClient from '../axiosClient';

// Backfilled in Phase 4 to close the inconsistency flagged at the end of
// Phase 3: every other module's frontend API calls go through
// api/endpoints/<module>Api.js, but auth/users calls were still made
// directly from AuthContext.jsx via axiosClient. This file (and
// usersApi.js) bring auth/users in line with that convention. AuthContext
// now calls these functions instead of axiosClient directly — see the
// updated AuthContext.jsx.

function login(email, password) {
  return axiosClient.post('/auth/login', { email, password });
}

function register(payload) {
  return axiosClient.post('/auth/register', payload);
}

function refresh() {
  return axiosClient.post('/auth/refresh');
}

function logout() {
  return axiosClient.post('/auth/logout');
}

export default { login, register, refresh, logout };