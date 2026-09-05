// src/api/endpoints/restaurantApplicationsApi.js
import axiosClient from '../axiosClient';

export function submitRestaurantApplication(payload) {
  return axiosClient.post('/restaurant-applications', payload).then((res) => res.data);
}

export function getMyRestaurantApplication() {
  return axiosClient.get('/restaurant-applications/me').then((res) => res.data);
}

export function listRestaurantApplications(status) {
  return axiosClient
    .get('/restaurant-applications', { params: status ? { status } : {} })
    .then((res) => res.data);
}

export function updateRestaurantApplicationStatus(id, payload) {
  return axiosClient
    .patch(`/restaurant-applications/${id}/status`, payload)
    .then((res) => res.data);
}