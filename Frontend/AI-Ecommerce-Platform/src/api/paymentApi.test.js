import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCheckout,
  getPaymentForOrder,
  verifyPayment,
  formatAmount,
  isSettled,
  isPayable,
  PaymentStatus,
  PAYMENT_LABELS,
  PAYMENT_COLORS,
} from './paymentApi';
import { ApiError } from './apiClient';

describe('paymentApi', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => vi.restoreAllMocks());

  const respond = (status, body) => {
    globalThis.fetch.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  };

  // ------------------------------------------------------------------
  // getCheckout
  // ------------------------------------------------------------------

  /**
   * The first polls after placing an order legitimately 404 - stock has to
   * clear before Payment-Service is asked for anything. Treating that as an
   * error would show "payment unavailable" on every successful checkout.
   */
  it('treats a missing payment as "not yet", not as a failure', async () => {
    respond(404, { message: 'Not Found' });

    await expect(getCheckout(412)).resolves.toBeNull();
  });

  it('passes a real failure through', async () => {
    respond(500, { message: 'Internal Server Error' });

    await expect(getCheckout(412)).rejects.toBeInstanceOf(ApiError);
  });

  it('asks the gateway for the right order', async () => {
    respond(200, { orderId: 412, razorpayOrderId: 'order_x' });

    await getCheckout(412);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8090/payment-service/api/payments/checkout/412',
      expect.objectContaining({ method: 'GET', credentials: 'include' }));
  });

  // ------------------------------------------------------------------
  // getPaymentForOrder
  // ------------------------------------------------------------------

  it('returns null for an order with no payment', async () => {
    respond(404, null);

    await expect(getPaymentForOrder(412)).resolves.toBeNull();
  });

  it('normalises a missing card to null rather than undefined', async () => {
    respond(200, { orderId: 412, status: 'PENDING' });

    await expect(getPaymentForOrder(412)).resolves.toMatchObject({ cardLast4: null });
  });

  // ------------------------------------------------------------------
  // verifyPayment
  // ------------------------------------------------------------------

  /** Razorpay's field names are snake_case; the server reads them verbatim. */
  it('sends the signed triple in the shape the server verifies', async () => {
    respond(200, { verified: true, applied: true });

    await verifyPayment({
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: 'sig',
    });

    const [url, config] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8090/payment-service/api/payments/verify');
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body)).toEqual({
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig',
    });
  });

  it('surfaces a refused verification instead of swallowing it', async () => {
    respond(401, { message: 'invalid signature' });

    await expect(verifyPayment({
      razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'bad',
    })).rejects.toMatchObject({ status: 401 });
  });

  // ------------------------------------------------------------------
  // Status helpers
  // ------------------------------------------------------------------

  it('knows which payments are finished with', () => {
    expect(isSettled(PaymentStatus.SUCCEEDED)).toBe(true);
    expect(isSettled(PaymentStatus.FAILED)).toBe(true);
    expect(isSettled(PaymentStatus.EXPIRED)).toBe(true);
    expect(isSettled(PaymentStatus.REFUNDED)).toBe(true);
    expect(isSettled(PaymentStatus.PENDING)).toBe(false);
    expect(isSettled(PaymentStatus.CREATED)).toBe(false);
    // A refund still in flight is not finished either.
    expect(isSettled(PaymentStatus.REFUND_PENDING)).toBe(false);
    expect(isSettled(undefined)).toBe(false);
  });

  it('knows which payments the customer can still act on', () => {
    expect(isPayable(PaymentStatus.CREATED)).toBe(true);
    expect(isPayable(PaymentStatus.PENDING)).toBe(true);
    expect(isPayable(PaymentStatus.SUCCEEDED)).toBe(false);
    expect(isPayable(PaymentStatus.EXPIRED)).toBe(false);
    expect(isPayable(null)).toBe(false);
  });

  it('has a label and a colour for every status', () => {
    Object.values(PaymentStatus).forEach((status) => {
      expect(PAYMENT_LABELS[status]).toBeTruthy();
      expect(PAYMENT_COLORS[status]).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  // ------------------------------------------------------------------
  // Money
  // ------------------------------------------------------------------

  /**
   * The storefront once rendered every price with a dollar sign while the
   * backend charged in INR - Checkout then showed a different symbol for the
   * same order.
   */
  it('renders rupees, because that is what is actually charged', () => {
    expect(formatAmount(1499)).toBe('₹1499.00');
    expect(formatAmount('1499.5')).toBe('₹1499.50');
    expect(formatAmount(0)).toBe('₹0.00');
  });

  it('does not print NaN at a customer', () => {
    expect(formatAmount(undefined)).toBe('—');
    expect(formatAmount(null)).toBe('₹0.00');
    expect(formatAmount('not a number')).toBe('—');
  });
});
