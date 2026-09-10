import { fetchClient } from './apiClient';

const BASE = '/user-service/api';

export async function getUserProfile() {
  return fetchClient(`${BASE}/users/profile`, { method: 'GET' });
}

export async function updateUserProfile(profileData) {
  return fetchClient(`${BASE}/users/profile`, {
    method: 'PUT',
    body: profileData,
  });
}

export async function updatePassword(passwordData) {
  return fetchClient(`${BASE}/users/profile/password`, {
    method: 'PUT',
    body: passwordData,
  });
}

export async function deleteUserAccount() {
  return fetchClient(`${BASE}/users/profile`, { method: 'DELETE' });
}

export async function getUserAddresses() {
  return fetchClient(`${BASE}/users/addresses`, { method: 'GET' });
}

export async function addAddress(addressData) {
  return fetchClient(`${BASE}/users/addresses`, {
    method: 'POST',
    body: addressData,
  });
}

export async function updateAddress(addressId, addressData) {
  return fetchClient(`${BASE}/users/addresses/${addressId}`, {
    method: 'PUT',
    body: addressData,
  });
}

export async function deleteAddress(addressId) {
  return fetchClient(`${BASE}/users/addresses/${addressId}`, { method: 'DELETE' });
}

export async function setDefaultAddress(addressId) {
  return fetchClient(`${BASE}/users/addresses/${addressId}/default`, { method: 'PUT' });
}
