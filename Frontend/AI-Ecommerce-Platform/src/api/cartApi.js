import { fetchClient } from './apiClient';

const BASE = '/cart-service/api';

export async function getCart() {
  return fetchClient(`${BASE}/cart`, { method: 'GET' });
}

export async function addToCart(productId, quantity = 1) {
  return fetchClient(`${BASE}/cart/items`, {
    method: 'POST',
    body: { productId, quantity },
  });
}

export async function updateCartItem(productId, quantity) {
  return fetchClient(`${BASE}/cart/items/${productId}`, {
    method: 'PUT',
    body: { quantity },
  });
}

export async function removeFromCart(productId) {
  return fetchClient(`${BASE}/cart/items/${productId}`, { method: 'DELETE' });
}

export async function clearCart() {
  return fetchClient(`${BASE}/cart`, { method: 'DELETE' });
}
