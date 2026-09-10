import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentStep } from './PaymentStep';
import { ToastProvider } from '../common/ToastProvider';
import * as paymentApi from '../../api/paymentApi';
import * as razorpayCheckout from '../../api/razorpayCheckout';

vi.mock('../../api/paymentApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCheckout: vi.fn(),
    getPaymentForOrder: vi.fn(),
    verifyPayment: vi.fn(),
  };
});

vi.mock('../../api/razorpayCheckout', () => ({ openCheckout: vi.fn() }));

const order = { id: 412, totalAmount: 1499, shippingAddress: '12 Test Lane' };

/** What /api/payments/checkout/{id} returns once Razorpay knows about the order. */
const payableCheckout = {
  orderId: 412,
  status: 'PENDING',
  razorpayOrderId: 'order_TTvz8IOlsKejKW',
  razorpayKeyId: 'rzp_test_example',
  amountMinor: 149900,
  amount: 1499,
  currency: 'INR',
};

/** The signed triple Razorpay Checkout hands back through the browser. */
const signedResult = {
  razorpayOrderId: 'order_TTvz8IOlsKejKW',
  razorpayPaymentId: 'pay_TTw1abcdefghij',
  razorpaySignature: 'a'.repeat(64),
};

function renderStep() {
  return render(
    <ToastProvider>
      <PaymentStep order={order} user={{ username: 'b645963' }}
                   onViewOrders={() => {}} onContinueShopping={() => {}} />
    </ToastProvider>
  );
}

async function clickPay() {
  const payButton = await screen.findByRole('button', { name: /Pay ₹1499\.00/ });
  await act(async () => { fireEvent.click(payButton); });
}

describe('PaymentStep', () => {
  beforeEach(() => {
    paymentApi.verifyPayment.mockResolvedValue({ verified: true, applied: true });
    paymentApi.getPaymentForOrder.mockResolvedValue(null);
  });

  afterEach(() => vi.clearAllMocks());

  // ------------------------------------------------------------------
  // Waiting for the order to become payable
  // ------------------------------------------------------------------

  it('waits while stock is still being reserved', async () => {
    // No payment exists yet - the order has not cleared inventory.
    paymentApi.getCheckout.mockResolvedValue(null);

    renderStep();

    expect(await screen.findByText(/Reserving your items/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay /i })).not.toBeInTheDocument();
  });

  /**
   * The payment can exist before Razorpay knows about it - the row is written
   * first so a failed registration is retried rather than lost. There is
   * nothing to pay against until the provider order id arrives.
   */
  it('keeps waiting when the payment exists but Razorpay does not know it yet', async () => {
    paymentApi.getCheckout.mockResolvedValue({
      ...payableCheckout, status: 'CREATED', razorpayOrderId: null,
    });

    renderStep();

    expect(await screen.findByText(/Reserving your items/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay /i })).not.toBeInTheDocument();
  });

  it('offers payment once Razorpay has the order', async () => {
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);

    renderStep();

    expect(await screen.findByText('Complete Your Payment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay ₹1499\.00/ })).toBeInTheDocument();
  });

  // ------------------------------------------------------------------
  // Paying
  // ------------------------------------------------------------------

  it('opens Checkout with what the server supplied, not with anything of its own', async () => {
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);
    razorpayCheckout.openCheckout.mockResolvedValue(signedResult);
    paymentApi.getPaymentForOrder.mockResolvedValue({ orderId: 412, status: 'SUCCEEDED' });

    renderStep();
    await clickPay();

    expect(razorpayCheckout.openCheckout).toHaveBeenCalledWith(
      payableCheckout, { customerName: 'b645963' });
  });

  it('hands the signed result back to the server and reports what it decided', async () => {
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);
    razorpayCheckout.openCheckout.mockResolvedValue(signedResult);
    paymentApi.getPaymentForOrder.mockResolvedValue({
      orderId: 412, status: 'SUCCEEDED', cardLast4: '1111',
    });

    renderStep();
    await clickPay();

    expect(paymentApi.verifyPayment).toHaveBeenCalledWith(signedResult);
    expect(await screen.findByText('Payment Received')).toBeInTheDocument();
    expect(await screen.findByText(/Payment received for order #412/)).toBeInTheDocument();
  });

  /**
   * The heart of it: Checkout closing is not proof the money moved. The status
   * shown is the one the server settled on, never the browser's.
   */
  it('does not claim the order is paid just because Checkout closed', async () => {
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);
    razorpayCheckout.openCheckout.mockResolvedValue(signedResult);
    paymentApi.getPaymentForOrder.mockResolvedValue({
      orderId: 412, status: 'FAILED', failureReason: 'Card declined by issuer',
    });

    renderStep();
    await clickPay();

    expect(await screen.findByText('Payment Not Completed')).toBeInTheDocument();
    expect(await screen.findByText(/Card declined by issuer/)).toBeInTheDocument();
  });

  it('leaves the order payable when the customer closes Checkout', async () => {
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);
    razorpayCheckout.openCheckout.mockRejectedValue({ dismissed: true });

    renderStep();
    await clickPay();

    expect(await screen.findByText(/still waiting to be paid/i)).toBeInTheDocument();
    expect(paymentApi.verifyPayment).not.toHaveBeenCalled();
    // Still offered, because nothing happened to the order.
    expect(screen.getByRole('button', { name: /Pay ₹1499\.00/ })).toBeInTheDocument();
  });

  it('surfaces a rejected verification rather than silently succeeding', async () => {
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);
    razorpayCheckout.openCheckout.mockResolvedValue(signedResult);
    paymentApi.verifyPayment.mockRejectedValue(new Error('invalid signature'));

    renderStep();
    await clickPay();

    expect(await screen.findByText(/invalid signature/)).toBeInTheDocument();
    expect(paymentApi.getPaymentForOrder).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Payments that are already over
  // ------------------------------------------------------------------

  it('recognises a payment that already succeeded', async () => {
    paymentApi.getCheckout.mockResolvedValue({ ...payableCheckout, status: 'SUCCEEDED' });

    renderStep();

    expect(await screen.findByText('Payment Received')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay /i })).not.toBeInTheDocument();
  });

  it('does not offer payment for an expired one', async () => {
    paymentApi.getCheckout.mockResolvedValue({
      ...payableCheckout, status: 'EXPIRED', razorpayOrderId: null,
    });

    renderStep();

    expect(await screen.findByText('Payment Not Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay /i })).not.toBeInTheDocument();
  });

  it('does not offer payment for a refunded one', async () => {
    paymentApi.getCheckout.mockResolvedValue({ ...payableCheckout, status: 'REFUNDED' });

    renderStep();

    expect(await screen.findByText('Payment Not Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay /i })).not.toBeInTheDocument();
  });

  // ------------------------------------------------------------------
  // When things go wrong before the customer can pay
  // ------------------------------------------------------------------

  it('keeps the order safe when the payment service is unreachable', async () => {
    paymentApi.getCheckout.mockRejectedValue(new Error('Network error'));

    renderStep();

    expect(await screen.findByText('Payment Service Unavailable')).toBeInTheDocument();
    // The reason is shown rather than a generic message, and the order is
    // never presented as cancelled - it is still there to be paid.
    expect(await screen.findByText('Network error')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /View Your Orders/i })).toBeInTheDocument()
    );
  });

  // ------------------------------------------------------------------
  // What the customer is told
  // ------------------------------------------------------------------

  it('shows the amount and address it is about to charge, in rupees', async () => {
    paymentApi.getCheckout.mockResolvedValue(null);

    renderStep();

    expect(await screen.findByText('#412')).toBeInTheDocument();
    // The backend prices in INR; a dollar sign here would be a different order.
    expect(screen.getByText('₹1499.00')).toBeInTheDocument();
    expect(screen.getByText('12 Test Lane')).toBeInTheDocument();
  });

});
