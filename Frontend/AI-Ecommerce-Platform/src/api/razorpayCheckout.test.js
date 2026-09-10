import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openCheckout } from './razorpayCheckout';

/**
 * The customer's card details go to Razorpay, never through us. What comes
 * back is a signed triple that the server re-verifies - so the job here is
 * narrow: hand Razorpay the right order, and report faithfully what happened,
 * including telling a dismissal apart from a failure.
 */

const razorpayCheckoutData = {
  orderId: 412,
  status: 'PENDING',
  razorpayOrderId: 'order_TTvz8IOlsKejKW',
  razorpayKeyId: 'rzp_test_example',
  amountMinor: 149900,
  amount: 1499,
  currency: 'INR',
};

const signedTriple = {
  razorpay_order_id: 'order_TTvz8IOlsKejKW',
  razorpay_payment_id: 'pay_TTw1abcdefghij',
  razorpay_signature: 'a'.repeat(64),
};

/** The last options Razorpay's constructor was called with. */
let lastOptions;
let opened;

function stubRazorpayScript() {
  lastOptions = null;
  opened = false;
  const handlers = {};
  window.Razorpay = function Razorpay(options) {
    lastOptions = options;
    return {
      open: () => { opened = true; },
      on: (event, handler) => { handlers[event] = handler; },
    };
  };
  return handlers;
}

describe('openCheckout', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    delete window.Razorpay;
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // Before either implementation runs
  // ------------------------------------------------------------------

  it('refuses an order Razorpay does not know about yet', async () => {
    await expect(openCheckout({ ...razorpayCheckoutData, razorpayOrderId: null }))
      .rejects.toThrow(/not ready for payment/i);
    await expect(openCheckout(null)).rejects.toThrow(/not ready for payment/i);
    // Checkout was never even loaded, let alone opened.
    expect(document.querySelector('script[src*="checkout.razorpay.com"]')).toBeNull();
  });

  // ------------------------------------------------------------------
  // Real Razorpay
  // ------------------------------------------------------------------

  it('opens Razorpay with the public key and the order, never the secret', async () => {
    stubRazorpayScript();

    openCheckout(razorpayCheckoutData, { customerName: 'b645963' });
    await Promise.resolve();

    expect(opened).toBe(true);
    expect(lastOptions.key).toBe('rzp_test_example');
    expect(lastOptions.order_id).toBe('order_TTvz8IOlsKejKW');
    // Razorpay works in minor units; sending 1499 would charge ₹14.99.
    expect(lastOptions.amount).toBe(149900);
    expect(lastOptions.currency).toBe('INR');
    expect(lastOptions.prefill).toEqual({ name: 'b645963' });
    expect(JSON.stringify(lastOptions)).not.toMatch(/secret/i);
  });

  it('resolves with the signed triple Razorpay hands to its handler', async () => {
    stubRazorpayScript();

    const result = openCheckout(razorpayCheckoutData);
    await Promise.resolve();
    lastOptions.handler(signedTriple);

    await expect(result).resolves.toEqual({
      razorpayOrderId: signedTriple.razorpay_order_id,
      razorpayPaymentId: signedTriple.razorpay_payment_id,
      razorpaySignature: signedTriple.razorpay_signature,
    });
  });

  /** Closing the modal is not a failure - the order is untouched. */
  it('rejects with a dismissal, distinguishable from an error', async () => {
    stubRazorpayScript();

    const result = openCheckout(razorpayCheckoutData);
    await Promise.resolve();
    lastOptions.modal.ondismiss();

    await expect(result).rejects.toEqual({ dismissed: true });
  });

  it('rejects with the reason when Razorpay reports the payment failed', async () => {
    const handlers = stubRazorpayScript();

    const result = openCheckout(razorpayCheckoutData);
    await Promise.resolve();
    handlers['payment.failed']({ error: { description: 'Card declined by issuer' } });

    await expect(result).rejects.toThrow('Card declined by issuer');
  });

  it('omits the prefill when there is no name to prefill', async () => {
    stubRazorpayScript();

    openCheckout(razorpayCheckoutData);
    await Promise.resolve();

    expect(lastOptions.prefill).toBeUndefined();
  });

  it('reports a checkout script it could not load', async () => {
    // No window.Razorpay, so the script is actually injected.
    const result = openCheckout(razorpayCheckoutData);
    const script = document.querySelector('script[src*="checkout.razorpay.com"]');
    expect(script).not.toBeNull();
    script.onerror();

    await expect(result).rejects.toThrow('Could not load Razorpay Checkout');
  });

  /** The script is fetched once, however many payments a session makes. */
  it('loads Razorpay Checkout only once', async () => {
    stubRazorpayScript();

    openCheckout(razorpayCheckoutData);
    await Promise.resolve();
    openCheckout(razorpayCheckoutData);
    await Promise.resolve();

    expect(document.querySelectorAll('script[src*="checkout.razorpay.com"]'))
      .toHaveLength(0);   // already present on window, so never injected
  });
});
