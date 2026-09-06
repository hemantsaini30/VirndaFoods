import axiosClient from '../axiosClient';

function getMenu(restaurantId, { includeUnavailable } = {}) {
  return axiosClient.get(`/restaurants/${restaurantId}/menu`, {
    params: includeUnavailable ? { includeUnavailable: 'true' } : undefined,
  });
}

function createCategory(restaurantId, payload) {
  return axiosClient.post(`/restaurants/${restaurantId}/categories`, payload);
}

function updateCategory(categoryId, payload) {
  return axiosClient.patch(`/categories/${categoryId}`, payload);
}

function deleteCategory(categoryId) {
  return axiosClient.delete(`/categories/${categoryId}`);
}

function createItem(restaurantId, payload) {
  return axiosClient.post(`/restaurants/${restaurantId}/items`, payload);
}

// payload must include `version` (the item's last-known version) — see
// the optimistic-locking note in menuApi's consumers (RestaurantDashboard).
// A 409 response here means someone else updated the item first; the
// caller is responsible for surfacing that distinctly from other errors.
function updateItem(itemId, payload) {
  return axiosClient.patch(`/items/${itemId}`, payload);
}

function updateAvailability(itemId, { isAvailable, version }) {
  return axiosClient.patch(`/items/${itemId}/availability`, { isAvailable, version });
}

function deleteItem(itemId) {
  return axiosClient.delete(`/items/${itemId}`);
}

export default {
  getMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  updateAvailability,
  deleteItem,
};