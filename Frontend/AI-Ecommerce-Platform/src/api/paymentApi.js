import { fetchClient, ApiError } from './apiClient';

const BASE = '/payment-service/api/payments';

export const PaymentStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
};

const SETTLED = [
  PaymentStatus.SUCCEEDED,
  PaymentStatus.FAILED,
  PaymentStatus.EXPIRED,
  PaymentStatus.REFUNDED,
];

/** Nothing further will happen to this payment on its own. */
export function isSettled(status) {
  return SETTLED.includes(status);
}

/** The customer still has to do something. */
export function isPayable(status) {
  return status === PaymentStatus.CREATED || status === PaymentStatus.PENDING;
}

export const PAYMENT_LABELS = {
  [PaymentStatus.CREATED]: 'Awaiting payment',
  [PaymentStatus.PENDING]: 'Awaiting payment',
  [PaymentStatus.SUCCEEDED]: 'Paid',
  [PaymentStatus.FAILED]: 'Payment failed',
  [PaymentStatus.EXPIRED]: 'Payment window expired',
  [PaymentStatus.REFUND_PENDING]: 'Refund in progress',
  [PaymentStatus.REFUNDED]: 'Refunded',
};

export const PAYMENT_COLORS = {
  [PaymentStatus.CREATED]: '#f59e0b',
  [PaymentStatus.PENDING]: '#f59e0b',
  [PaymentStatus.SUCCEEDED]: '#10b981',
  [PaymentStatus.FAILED]: '#ef4444',
  [PaymentStatus.EXPIRED]: '#94a3b8',
  [PaymentStatus.REFUND_PENDING]: '#6366f1',
  [PaymentStatus.REFUNDED]: '#8b5cf6',
};

/**
 * What the browser needs to open Checkout.
 *
 * <p>Returns null while the payment does not exist yet. That is a normal
 * state, not an error: the order has to clear stock reservation before
 * Payment-Service is asked for anything, so the first few polls after
 * checkout legitimately 404. `razorpayOrderId` is null for a moment longer,
 * until the order has been registered with the provider.
 */
export async function getCheckout(orderId) {
  try {
    return await fetchClient(`${BASE}/checkout/${orderId}`, { method: 'GET' });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Full payment detail. Null while the payment does not exist yet. */
export async function getPaymentForOrder(orderId) {
  try {
    const raw = await fetchClient(`${BASE}/order/${orderId}`, { method: 'GET' });
    return raw ? { ...raw, cardLast4: raw.cardLast4 ?? null } : null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Hand the signed result of Checkout back to the server.
 *
 * <p>The server re-verifies the signature and asks the provider what the
 * payment's real status is - the browser is never trusted to declare an order
 * paid, it only relays what it was given.
 */
export async function verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  return fetchClient(`${BASE}/verify`, {
    method: 'POST',
    body: {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    },
  });
}

/**
 * Indian Rupees, which is what the provider actually charges in.
 * (The storefront used to render every price with a dollar sign while the
 * backend priced in INR - Checkout would have shown a different symbol for
 * the same order.)
 */
export function formatAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₹${number.toFixed(2)}` : '—';
}
