/**
 * Opening Razorpay Checkout.
 *
 * <p>Loads Razorpay's own checkout.js and opens their modal. The customer
 * never types card details into anything of ours - they go straight to
 * Razorpay, which is the entire point of using a provider.
 *
 * <p>What comes back is a signed triple. It is not proof of payment: the
 * server re-verifies the signature and asks Razorpay what the payment's real
 * status is before anything is settled.
 */

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Cleared so a later attempt can retry rather than reusing a rejection.
      scriptPromise = null;
      reject(new Error('Could not load Razorpay Checkout'));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * @returns {Promise<{razorpayOrderId, razorpayPaymentId, razorpaySignature}>}
 *          rejects with `{ dismissed: true }` if the customer closes Checkout
 */
export function openCheckout(checkout, { customerName } = {}) {
  if (!checkout?.razorpayOrderId) {
    return Promise.reject(new Error('This order is not ready for payment yet'));
  }

  return loadRazorpayScript().then(() => new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: checkout.razorpayKeyId,
      order_id: checkout.razorpayOrderId,
      amount: checkout.amountMinor,
      currency: checkout.currency,
      name: 'IntelliCart',
      description: `Order #${checkout.orderId}`,
      prefill: customerName ? { name: customerName } : undefined,
      theme: { color: '#f59e0b' },
      handler: (response) => resolve({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      }),
      modal: {
        // Closing the modal is not a failure - the order is untouched and can
        // still be paid later.
        ondismiss: () => reject({ dismissed: true }),
      },
    });
    razorpay.on('payment.failed', (event) =>
      reject(new Error(event?.error?.description || 'Payment failed')));
    razorpay.open();
  }));
}
