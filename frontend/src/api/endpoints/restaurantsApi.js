import axiosClient from '../axiosClient';

function list({ city, page, limit } = {}) {
  return axiosClient.get('/restaurants', { params: { city, page, limit } });
}

function listAdmin({ city, status, page, limit } = {}) {
  return axiosClient.get('/restaurants/admin', { params: { city, status, page, limit } });
}

// Resolves the logged-in RESTAURANT_OWNER's own restaurant. Backs
// RestaurantDashboard's initial load — added in Phase 4 once it became
// clear there was no existing way to make this lookup.
function getMine() {
  return axiosClient.get('/restaurants/mine');
}

function getById(id) {
  return axiosClient.get(`/restaurants/${id}`);
}

function updateProfile(id, payload) {
  return axiosClient.patch(`/restaurants/${id}`, payload);
}

function updateStatus(id, status) {
  return axiosClient.patch(`/restaurants/${id}/status`, { status });
}

export default { list, listAdmin, getMine, getById, updateProfile, updateStatus };