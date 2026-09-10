import { fetchClient } from './apiClient';

const BASE = '/product-service/api';

export async function getProducts() {
  return fetchClient(`${BASE}/products`, { method: 'GET' });
}

export async function getProductById(productId) {
  return fetchClient(`${BASE}/products/${productId}`, { method: 'GET' });
}

export async function getProductReviews(productId) {
  return fetchClient(`${BASE}/products/${productId}/reviews`, { method: 'GET' });
}

export async function addReview(productId, reviewData) {
  return fetchClient(`${BASE}/products/${productId}/reviews`, {
    method: 'POST',
    body: reviewData,
  });
}

export async function editReview(productId, reviewId, reviewData) {
  return fetchClient(`${BASE}/products/${productId}/reviews/${reviewId}`, {
    method: 'PUT',
    body: reviewData,
  });
}

export async function deleteReview(productId, reviewId) {
  return fetchClient(`${BASE}/products/${productId}/reviews/${reviewId}`, {
    method: 'DELETE',
  });
}

export async function getMyProducts() {
  return fetchClient(`${BASE}/products/my`, { method: 'GET' });
}

export async function createProduct(productData) {
  return fetchClient(`${BASE}/products`, {
    method: 'POST',
    body: productData,
  });
}

export async function updateProduct(productId, updateData) {
  return fetchClient(`${BASE}/products/${productId}`, {
    method: 'PUT',
    body: updateData,
  });
}

export async function deleteProduct(productId) {
  return fetchClient(`${BASE}/products/${productId}`, { method: 'DELETE' });
}
