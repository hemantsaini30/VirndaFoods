import axiosClient from '../axiosClient';

function getCart() {
  return axiosClient.get('/cart');
}

function addItem(foodItemId, quantity = 1) {
  return axiosClient.post('/cart/items', { foodItemId, quantity });
}

function updateItemQuantity(cartItemId, quantity) {
  return axiosClient.patch(`/cart/items/${cartItemId}`, { quantity });
}

function removeItem(cartItemId) {
  return axiosClient.delete(`/cart/items/${cartItemId}`);
}

function clearCart() {
  return axiosClient.delete('/cart');
}

export default { getCart, addItem, updateItemQuantity, removeItem, clearCart };