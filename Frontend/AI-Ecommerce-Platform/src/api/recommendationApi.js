import { fetchClient } from './apiClient';

const BASE = '/recommendation-service/api';

export async function getRecommendations() {
  return fetchClient(`${BASE}/recommendations/me`, { method: 'GET' });
}
