import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../common/Button';
import { useToast } from '../common/ToastProvider';
import {
  getCheckout,
  getPaymentForOrder,
  verifyPayment,
  isPayable,
  isSettled,
  formatAmount,
  PaymentStatus,
} from '../../api/paymentApi';
import { openCheckout } from '../../api/razorpayCheckout';
import '../../styles/payment.css';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 24; // ~36s, comfortably past stock reservation

/**
 * The step between placing an order and paying for it.
 *
 * <p>An order is not paid when it is created: stock has to be reserved and the
 * order registered with the payment provider before there is anything to pay
 * against. So this polls until a provider order exists, rather than assuming
 * one is ready the instant the order comes back.
 */
export function PaymentStep({ order, user, onViewOrders, onContinueShopping }) {
  const toast = useToast();
  const [phase, setPhase] = useState('preparing');
  const [checkout, setCheckout] = useState(null);
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    let timer = null;
    let attempts = 0;

    const poll = async () => {
      if (cancelled.current) return;
      attempts += 1;

      try {
        const result = await getCheckout(order.id);
        if (cancelled.current) return;

        if (result) {
          setCheckout(result);
          if (isSettled(result.status)) {
            setPhase(result.status === PaymentStatus.SUCCEEDED ? 'paid' : 'closed');
            return;
          }
          // Registered with the provider, so there is something to pay.
          if (isPayable(result.status) && result.razorpayOrderId) {
            setPhase('ready');
            return;
          }
        }
      } catch (err) {
        if (cancelled.current) return;
        setMessage(err.message || 'Could not reach the payment service');
        setPhase('error');
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        setPhase('timeout');
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [order.id]);

  /**
   * Checkout closing is not proof of anything. The server verifies the
   * signature and asks the provider what really happened; this only reports
   * what the server concluded.
   */
  const handlePay = useCallback(async () => {
    if (!checkout?.razorpayOrderId) return;
    setPaying(true);
    try {
      const result = await openCheckout(checkout, { customerName: user?.username });
      await verifyPayment(result);

      const payment = await getPaymentForOrder(order.id);
      if (payment?.status === PaymentStatus.SUCCEEDED) {
        setPhase('paid');
        toast.success(`Payment received for order #${order.id}`);
      } else {
        setPhase('closed');
        toast.error(payment?.failureReason || 'Payment was not completed');
      }
    } catch (err) {
      if (err?.dismissed) {
        // Closing the sheet leaves the order exactly as it was.
        toast.info('Payment cancelled. Your order is still waiting to be paid.');
      } else {
        toast.error(err.message || 'Payment could not be completed');
      }
    } finally {
      setPaying(false);
    }
  }, [checkout, order.id, toast, user]);

  if (!order) return null;

  const amount = formatAmount(order.totalAmount);

  return (
    <div className="order-success-container">
      <div className="order-success-card payment-step-card">
        <div className="success-icon">{phase === 'paid' ? '✅' : '🔒'}</div>

        <h2>{titleFor(phase)}</h2>
        <p>{subtitleFor(phase, message)}</p>

        <div className="order-success-details">
          <div className="detail-row">
            <span>Order Number:</span>
            <strong>#{order.id}</strong>
          </div>
          <div className="detail-row">
            <span>Amount Due:</span>
            <strong>{amount}</strong>
          </div>
          <div className="detail-row">
            <span>Shipping To:</span>
            <strong>{order.shippingAddress}</strong>
          </div>
        </div>

        {phase === 'preparing' && (
          <div className="payment-waiting" role="status" aria-live="polite">
            <span className="payment-spinner" aria-hidden="true" />
            <span>Reserving your items…</span>
          </div>
        )}

        <div className="order-success-actions">
          {phase === 'ready' && (
            <Button onClick={handlePay} disabled={paying} className="full-width bg-yellow">
              {paying ? 'Opening payment…' : `Pay ${amount}`}
            </Button>
          )}

          <Button onClick={onViewOrders} variant="outline" className="full-width">
            View Your Orders
          </Button>
          <Button onClick={onContinueShopping} variant="outline" className="full-width">
            Continue Shopping
          </Button>
        </div>

      </div>
    </div>
  );
}

function titleFor(phase) {
  switch (phase) {
    case 'preparing': return 'Order Created';
    case 'ready': return 'Complete Your Payment';
    case 'paid': return 'Payment Received';
    case 'closed': return 'Payment Not Completed';
    case 'timeout': return 'Still Preparing Your Order';
    case 'error': return 'Payment Service Unavailable';
    default: return 'Order Created';
  }
}

function subtitleFor(phase, message) {
  switch (phase) {
    case 'preparing':
      return 'We are confirming your items are in stock before taking payment.';
    case 'ready':
      return 'Your items are reserved. Your order is confirmed once payment goes through.';
    case 'paid':
      return 'Thank you — your order is confirmed.';
    case 'closed':
      return 'This order was not paid for. You can try again from Your Orders.';
    case 'timeout':
      return 'This is taking longer than usual. Your order is safe — open Your Orders to pay when it is ready.';
    case 'error':
      return message || 'We could not reach the payment service. Your order is safe.';
    default:
      return '';
  }
}
