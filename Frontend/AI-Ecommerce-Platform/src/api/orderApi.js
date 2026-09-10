import { fetchClient } from './apiClient';

const BASE = '/order-service/api';

export async function placeOrder(payload) {
  return fetchClient(`${BASE}/orders`, {
    method: 'POST',
    body: payload,
  });
}

export async function getCustomerOrders() {
  return fetchClient(`${BASE}/orders`, { method: 'GET' });
}

export async function getOrderById(orderId) {
  return fetchClient(`${BASE}/orders/${orderId}`, { method: 'GET' });
}

export async function getSellerOrders() {
  return fetchClient(`${BASE}/orders/seller`, { method: 'GET' });
}

export async function cancelOrder(orderId) {
  return fetchClient(`${BASE}/orders/${orderId}/cancel`, { method: 'PUT' });
}
