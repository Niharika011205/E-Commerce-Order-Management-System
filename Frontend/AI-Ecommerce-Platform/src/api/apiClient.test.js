import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchClient, onSessionExpired, ApiError } from './apiClient';

/**
 * The access token lives 15 minutes and the refresh token lives 7 days.
 * Nothing used to spend the refresh token, so a customer who browsed for a
 * quarter of an hour found that adding to the cart, placing an order and
 * paying all failed at once.
 */

const REFRESH_URL = 'http://localhost:8090/auth-service/auth/refresh';

const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });
const unauthorized = () => ({
  ok: false,
  status: 401,
  json: () => Promise.resolve({ message: 'You must be logged in to access this resource.' }),
});
const forbidden = () => ({
  ok: false,
  status: 403,
  json: () => Promise.resolve({ message: 'You do not have the required role' }),
});

const callsTo = (url) => globalThis.fetch.mock.calls.filter(([u]) => u === url);

describe('apiClient session handling', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => vi.restoreAllMocks());

  it('passes a successful request straight through', async () => {
    globalThis.fetch.mockResolvedValue(ok({ cartId: 11 }));

    await expect(fetchClient('/cart-service/api/cart', { method: 'GET' }))
      .resolves.toEqual({ cartId: 11 });
    expect(callsTo(REFRESH_URL)).toHaveLength(0);
  });

  /** The whole point: the customer never sees the expiry. */
  it('refreshes an expired token and replays the request', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(unauthorized())        // access token expired
      .mockResolvedValueOnce(ok({ refreshed: true })) // POST /auth/refresh
      .mockResolvedValueOnce(ok({ cartId: 11 }));   // replayed request

    await expect(fetchClient('/cart-service/api/cart', { method: 'GET' }))
      .resolves.toEqual({ cartId: 11 });

    expect(callsTo(REFRESH_URL)).toHaveLength(1);
    expect(callsTo(REFRESH_URL)[0][1]).toMatchObject({
      method: 'POST', credentials: 'include',
    });
  });

  it('replays a write with its body and method intact', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce(ok({ cartId: 11 }));

    await fetchClient('/cart-service/api/cart/items', {
      method: 'POST',
      body: { productId: 47, quantity: 1 },
    });

    const attempts = callsTo('http://localhost:8090/cart-service/api/cart/items');
    expect(attempts).toHaveLength(2);
    // The retry must not send a half-built request.
    expect(attempts[1][1].method).toBe('POST');
    expect(JSON.parse(attempts[1][1].body)).toEqual({ productId: 47, quantity: 1 });
  });

  it('gives up after one refresh rather than looping', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce(unauthorized());   // still refused

    await expect(fetchClient('/cart-service/api/cart', { method: 'GET' }))
      .rejects.toBeInstanceOf(ApiError);

    expect(callsTo(REFRESH_URL)).toHaveLength(1);
  });

  it('announces an unrecoverable session instead of failing silently', async () => {
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);

    globalThis.fetch
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) });

    await expect(fetchClient('/cart-service/api/cart', { method: 'GET' }))
      .rejects.toMatchObject({ status: 401 });

    expect(expired).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('stops notifying once a listener unsubscribes', async () => {
    const expired = vi.fn();
    onSessionExpired(expired)();

    globalThis.fetch
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) });

    await expect(fetchClient('/cart-service/api/cart', { method: 'GET' })).rejects.toThrow();

    expect(expired).not.toHaveBeenCalled();
  });

  /** A failed login is a failed login, not a stale token. */
  it('never tries to refresh the auth endpoints themselves', async () => {
    globalThis.fetch.mockResolvedValue(unauthorized());

    await expect(fetchClient('/auth-service/auth/validate', { method: 'GET' }))
      .rejects.toMatchObject({ status: 401 });

    expect(callsTo(REFRESH_URL)).toHaveLength(0);
  });

  /** A wrong-role token is valid; refreshing it would return the same role. */
  it('does not refresh on a 403', async () => {
    globalThis.fetch.mockResolvedValue(forbidden());

    await expect(fetchClient('/order-service/api/orders', { method: 'GET' }))
      .rejects.toMatchObject({ status: 403 });

    expect(callsTo(REFRESH_URL)).toHaveLength(0);
  });

  /**
   * A page loads cart, orders and payment status together. Auth-Service
   * rotates the refresh token, so three parallel refreshes would leave two
   * holding an invalidated one.
   */
  it('refreshes once for several requests that expire together', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url === REFRESH_URL) return Promise.resolve(ok({}));
      const attempts = callsTo(url).length;
      return Promise.resolve(attempts <= 1 ? unauthorized() : ok({ url }));
    });

    await Promise.all([
      fetchClient('/cart-service/api/cart', { method: 'GET' }),
      fetchClient('/order-service/api/orders', { method: 'GET' }),
      fetchClient('/payment-service/api/payments/order/1', { method: 'GET' }),
    ]);

    expect(callsTo(REFRESH_URL)).toHaveLength(1);
  });

  it('reports an unreachable server rather than hanging', async () => {
    globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchClient('/cart-service/api/cart', { method: 'GET' }))
      .rejects.toMatchObject({ status: 0 });
  });

  it('returns null for 204 No Content', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(null) });

    await expect(fetchClient('/cart-service/api/cart', { method: 'DELETE' }))
      .resolves.toBeNull();
  });
});
