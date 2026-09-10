import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrderHistory } from './OrderHistory';
import { ToastProvider } from '../common/ToastProvider';
import * as orderApi from '../../api/orderApi';
import * as paymentApi from '../../api/paymentApi';
import * as razorpayCheckout from '../../api/razorpayCheckout';

vi.mock('../../api/orderApi', () => ({
  getCustomerOrders: vi.fn(),
  cancelOrder: vi.fn(),
}));

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

const payableCheckout = {
  orderId: 412, status: 'PENDING', razorpayOrderId: 'order_TTvz8IOlsKejKW',
  razorpayKeyId: 'rzp_test_example', amountMinor: 149900, amount: 1499,
  currency: 'INR',
};

const signedResult = {
  razorpayOrderId: 'order_TTvz8IOlsKejKW',
  razorpayPaymentId: 'pay_TTw1abcdefghij',
  razorpaySignature: 'a'.repeat(64),
};

const item = {
  id: 1, productName: 'Aurora 14 Laptop', productPrice: 1499, quantity: 1,
  itemTotal: 1499, thumbnailUrl: null,
};

const makeOrder = (overrides) => ({
  id: 412, status: 'AWAITING_PAYMENT', totalAmount: 1499,
  shippingAddress: '12 Test Lane', createdAt: '2026-08-02T10:00:00Z',
  items: [item], ...overrides,
});

function renderHistory() {
  return render(
    <ToastProvider>
      <OrderHistory onBack={() => {}} />
    </ToastProvider>
  );
}

describe('OrderHistory payment features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentApi.getPaymentForOrder.mockResolvedValue(null);
    paymentApi.verifyPayment.mockResolvedValue({ verified: true, applied: true });
  });

  afterEach(() => vi.clearAllMocks());

  it('labels an unpaid order as payment due and offers to pay', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder()]);

    renderHistory();

    expect(await screen.findByText('PAYMENT DUE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Payment/i })).toBeInTheDocument();
  });

  it('does not offer payment on an order already paid', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'CONFIRMED' })]);

    renderHistory();

    expect(await screen.findByText('CONFIRMED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Complete Payment/i })).not.toBeInTheDocument();
  });

  it('opens Checkout and settles the order on what the server says', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder()]);
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);
    razorpayCheckout.openCheckout.mockResolvedValue(signedResult);
    paymentApi.getPaymentForOrder.mockResolvedValue({ orderId: 412, status: 'SUCCEEDED' });

    renderHistory();
    const payButton = await screen.findByRole('button', { name: /Complete Payment/i });
    await act(async () => { fireEvent.click(payButton); });

    await waitFor(() =>
      expect(razorpayCheckout.openCheckout).toHaveBeenCalledWith(payableCheckout));
    expect(paymentApi.verifyPayment).toHaveBeenCalledWith(signedResult);
    expect(await screen.findByText(/Payment received for order #412/)).toBeInTheDocument();
  });

  /** A closed Checkout is not a failed payment; the order is untouched. */
  it('leaves the order alone when the customer closes Checkout', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder()]);
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);
    razorpayCheckout.openCheckout.mockRejectedValue({ dismissed: true });

    renderHistory();
    const payButton = await screen.findByRole('button', { name: /Complete Payment/i });
    await act(async () => { fireEvent.click(payButton); });

    expect(await screen.findByText(/still waiting to be paid/i)).toBeInTheDocument();
    expect(paymentApi.verifyPayment).not.toHaveBeenCalled();
  });

  it('does not open Checkout when Razorpay does not have the order yet', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder()]);
    paymentApi.getCheckout.mockResolvedValue(null);

    renderHistory();
    const payButton = await screen.findByRole('button', { name: /Complete Payment/i });
    await act(async () => { fireEvent.click(payButton); });

    expect(razorpayCheckout.openCheckout).not.toHaveBeenCalled();
    expect(await screen.findByText(/not ready for payment yet/i)).toBeInTheDocument();
  });

  it('reports the server-side reason when a payment does not go through', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder()]);
    paymentApi.getCheckout.mockResolvedValue(payableCheckout);
    razorpayCheckout.openCheckout.mockResolvedValue(signedResult);
    paymentApi.getPaymentForOrder.mockResolvedValue({
      orderId: 412, status: 'FAILED', failureReason: 'Card declined by issuer',
    });

    renderHistory();
    const payButton = await screen.findByRole('button', { name: /Complete Payment/i });
    await act(async () => { fireEvent.click(payButton); });

    expect(await screen.findByText(/Card declined by issuer/)).toBeInTheDocument();
  });

  it('shows the payment panel when an order is opened', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'CONFIRMED' })]);
    paymentApi.getPaymentForOrder.mockResolvedValue({
      paymentId: 9, orderId: 412, amount: 1499, currency: 'INR',
      status: 'SUCCEEDED', cardLast4: '1111',
    });

    renderHistory();
    const card = await screen.findByText('Order #412');
    await act(async () => { fireEvent.click(card); });

    expect(await screen.findByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('•••• 1111')).toBeInTheDocument();
  });

  it('surfaces why a payment failed', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'FAILED' })]);
    paymentApi.getPaymentForOrder.mockResolvedValue({
      paymentId: 9, orderId: 412, amount: 1499, status: 'FAILED',
      failureReason: 'Card declined by issuer (test card)',
    });

    renderHistory();
    const card = await screen.findByText('Order #412');
    await act(async () => { fireEvent.click(card); });

    expect(await screen.findByText(/Card declined by issuer/)).toBeInTheDocument();
  });

  it('shows a refund in progress', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'CANCELLED' })]);
    paymentApi.getPaymentForOrder.mockResolvedValue({
      paymentId: 9, orderId: 412, amount: 1499, status: 'REFUND_PENDING',
    });

    renderHistory();
    const card = await screen.findByText('Order #412');
    await act(async () => { fireEvent.click(card); });

    expect(await screen.findByText('Refund in progress')).toBeInTheDocument();
  });

  it('tells the customer a refund is coming when cancelling a paid order', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'CONFIRMED' })]);
    orderApi.cancelOrder.mockResolvedValue({});

    renderHistory();
    const card = await screen.findByText('Order #412');
    await act(async () => { fireEvent.click(card); });
    const cancel = await screen.findByRole('button', { name: /Cancel Order/i });
    await act(async () => { fireEvent.click(cancel); });

    expect(await screen.findByText(/refund is on its way/i)).toBeInTheDocument();
  });

  it('does not promise a refund when cancelling an unpaid order', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'AWAITING_PAYMENT' })]);
    orderApi.cancelOrder.mockResolvedValue({});

    renderHistory();
    const card = await screen.findByText('Order #412');
    await act(async () => { fireEvent.click(card); });
    const cancel = await screen.findByRole('button', { name: /Cancel Order/i });
    await act(async () => { fireEvent.click(cancel); });

    expect(await screen.findByText('Order cancelled successfully')).toBeInTheDocument();
    expect(screen.queryByText(/refund is on its way/i)).not.toBeInTheDocument();
  });

  it('cannot cancel an order that is already refunded', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'REFUNDED' })]);

    renderHistory();
    const card = await screen.findByText('Order #412');
    await act(async () => { fireEvent.click(card); });

    expect(screen.getByText('REFUNDED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel Order/i })).not.toBeInTheDocument();
  });

  it('shows a completed refund', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'REFUNDED' })]);
    paymentApi.getPaymentForOrder.mockResolvedValue({
      paymentId: 9, orderId: 412, amount: 1499, status: 'REFUNDED',
    });

    renderHistory();
    const card = await screen.findByText('Order #412');
    await act(async () => { fireEvent.click(card); });

    expect(await screen.findByText('Refunded')).toBeInTheDocument();
  });

  /** Opening an order asks once; collapsing and reopening must not re-ask. */
  it('loads a payment once per order', async () => {
    orderApi.getCustomerOrders.mockResolvedValue([makeOrder({ status: 'CONFIRMED' })]);
    paymentApi.getPaymentForOrder.mockResolvedValue({
      paymentId: 9, orderId: 412, amount: 1499, status: 'SUCCEEDED', cardLast4: '1111',
    });

    renderHistory();
    const card = await screen.findByText('Order #412');
    await act(async () => { fireEvent.click(card); });
    await screen.findByText('Paid');
    await act(async () => { fireEvent.click(card); });
    await act(async () => { fireEvent.click(card); });

    expect(paymentApi.getPaymentForOrder).toHaveBeenCalledTimes(1);
  });
});
