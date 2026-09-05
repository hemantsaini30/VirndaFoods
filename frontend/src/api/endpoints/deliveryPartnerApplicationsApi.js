// src/api/endpoints/deliveryPartnerApplicationsApi.js
import axiosClient from '../axiosClient';

export function submitDeliveryPartnerApplication(payload) {
  return axiosClient.post('/delivery-partner-applications', payload).then((res) => res.data);
}

export function getMyDeliveryPartnerApplication() {
  return axiosClient.get('/delivery-partner-applications/me').then((res) => res.data);
}

export function listDeliveryPartnerApplications(status) {
  return axiosClient
    .get('/delivery-partner-applications', { params: status ? { status } : {} })
    .then((res) => res.data);
}

export function updateDeliveryPartnerApplicationStatus(id, payload) {
  return axiosClient
    .patch(`/delivery-partner-applications/${id}/status`, payload)
    .then((res) => res.data);
}