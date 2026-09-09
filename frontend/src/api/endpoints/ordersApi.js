import axiosClient from '../axiosClient';

// idempotencyKey is REQUIRED and always passed explicitly by the caller
// (CheckoutPage generates it once and reuses it across retries of the
// same attempt) — this function never generates one itself, so there is
// exactly one place in the whole frontend responsible for that decision.
function createOrder(deliveryAddress, idempotencyKey) {
  return axiosClient.post(
    '/orders',
    { deliveryAddress },
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
}

function listMyOrders(page = 1, limit = 10) {
  return axiosClient.get('/orders/me', { params: { page, limit } });
}

function getOrder(orderId) {
  return axiosClient.get(`/orders/${orderId}`);
}

function cancelOrder(orderId) {
  return axiosClient.post(`/orders/${orderId}/cancel`);
}

export default { createOrder, listMyOrders, getOrder, cancelOrder };