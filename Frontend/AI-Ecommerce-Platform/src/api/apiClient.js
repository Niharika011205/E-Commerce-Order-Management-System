export const API_BASE_URL = 'http://localhost:8090';

const REFRESH_URL = `${API_BASE_URL}/auth-service/auth/refresh`;

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * In-flight refresh, shared by every caller.
 *
 * A page typically fires several requests at once (cart, orders, payment
 * status). If the access token has just expired they would each start their
 * own refresh, and because Auth-Service rotates the refresh token, the first
 * one to land invalidates the rest - turning one expired token into a storm
 * of failures. One shared promise means one refresh.
 */
let refreshInFlight = null;

function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        // Cleared as soon as it settles. Everyone who joined this refresh is
        // already holding the promise, so they still observe its result; the
        // next expiry, minutes later, starts a fresh one.
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Listeners notified when the session is over and cannot be recovered. */
const sessionExpiredHandlers = new Set();

export function onSessionExpired(handler) {
  sessionExpiredHandlers.add(handler);
  return () => sessionExpiredHandlers.delete(handler);
}

function notifySessionExpired() {
  sessionExpiredHandlers.forEach((handler) => {
    try {
      handler();
    } catch {
      // A broken listener must not stop the others.
    }
  });
}

/**
 * Centralized fetch wrapper to handle JSON parsing, credentials, and error throwing.
 *
 * <p>The access token lives 15 minutes; the refresh token lives 7 days. Until
 * now nothing ever spent the refresh token, so a customer who browsed for a
 * quarter of an hour found that adding to the cart, placing an order and
 * paying all failed - with an authorization error rather than anything that
 * suggested "log in again". A 401 now buys a new access token and replays the
 * request once, which is invisible to the caller.
 */
export async function fetchClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const send = () => {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // essential for cookie-based JWT
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    return fetch(url, config);
  };

  let response;
  try {
    response = await send();
  } catch {
    throw new ApiError('Network error: Unable to reach the server', 0, null);
  }

  // An expired access token is recoverable, so try exactly once. Refreshing is
  // pointless for the auth endpoints themselves - a failed login is a failed
  // login, not a stale token.
  if (response.status === 401 && !endpoint.startsWith('/auth-service/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        response = await send();
      } catch {
        throw new ApiError('Network error: Unable to reach the server', 0, null);
      }
    } else {
      // The refresh token is gone or rejected too - the session is genuinely
      // over. Tell the app so it can send the customer to login instead of
      // showing an authorization error for every action they attempt.
      notifySessionExpired();
    }
  }

  // Handle No Content
  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    if (data) {
      errorMessage = data.message || data.error || errorMessage;
    }
    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
}
