import axiosClient from '../axiosClient';

function getOwnProfile() {
  return axiosClient.get('/users/me');
}

function updateOwnProfile(payload) {
  return axiosClient.patch('/users/me', payload);
}

export default { getOwnProfile, updateOwnProfile };