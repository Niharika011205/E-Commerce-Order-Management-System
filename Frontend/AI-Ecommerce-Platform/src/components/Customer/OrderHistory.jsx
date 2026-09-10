import React, { useState, useEffect, useCallback } from 'react';
import { getCustomerOrders, cancelOrder } from '../../api/orderApi';
import {
  getCheckout,
  getPaymentForOrder,
  verifyPayment,
  formatAmount,
  PAYMENT_LABELS,
  PAYMENT_COLORS,
  PaymentStatus,
} from '../../api/paymentApi';
import { openCheckout } from '../../api/razorpayCheckout';
import { Loader } from '../common/Loader';
import { Button } from '../common/Button';
import { useToast } from '../common/ToastProvider';
import '../../styles/customer.css';
import '../../styles/payment.css';

/** Stock is held for this order, but it has not been paid for yet. */
const AWAITING_PAYMENT = 'AWAITING_PAYMENT';

export function OrderHistory({ onBack }) {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Payment detail is fetched only for the order the customer opened, rather
  // than firing one request per row every time the list renders.
  const [payments, setPayments] = useState({});
  const [paymentLoading, setPaymentLoading] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getCustomerOrders();
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const loadPayment = useCallback(async (orderId) => {
    setPaymentLoading(orderId);
    try {
      const payment = await getPaymentForOrder(orderId);
      setPayments((current) => ({ ...current, [orderId]: payment }));
    } catch {
      // A missing payment panel must never break the order list.
      setPayments((current) => ({ ...current, [orderId]: null }));
    } finally {
      setPaymentLoading(null);
    }
  }, []);

  const toggleExpand = (orderId) => {
    const next = expandedOrderId === orderId ? null : orderId;
    setExpandedOrderId(next);
    if (next !== null && payments[next] === undefined) {
      loadPayment(next);
    }
  };

  const handlePayNow = async (e, orderId) => {
    e.stopPropagation();
    setBusyOrderId(orderId);
    try {
      const checkout = await getCheckout(orderId);
      if (!checkout?.razorpayOrderId) {
        toast.error('This order is not ready for payment yet. Please try again shortly.');
        return;
      }

      const result = await openCheckout(checkout);
      await verifyPayment(result);

      // The server decides the outcome, not the browser.
      await fetchOrders();
      const payment = await getPaymentForOrder(orderId);
      setPayments((current) => ({ ...current, [orderId]: payment }));

      if (payment?.status === PaymentStatus.SUCCEEDED) {
        toast.success(`Payment received for order #${orderId}`);
      } else {
        toast.error(payment?.failureReason || 'Payment was not completed');
      }
    } catch (err) {
      if (err?.dismissed) {
        toast.info('Payment cancelled. Your order is still waiting to be paid.');
      } else {
        toast.error(err.message || 'Could not start the payment');
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCancel = async (e, order) => {
    e.stopPropagation();
    const wasPaid = order.status === 'CONFIRMED';
    setBusyOrderId(order.id);
    try {
      await cancelOrder(order.id);
      await fetchOrders();
      if (payments[order.id] !== undefined) await loadPayment(order.id);
      toast.success(
        wasPaid
          ? 'Order cancelled. Your refund is on its way.'
          : 'Order cancelled successfully'
      );
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setBusyOrderId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#f0ad4e';
      case AWAITING_PAYMENT: return '#f59e0b';
      case 'CONFIRMED': return '#5bc0de';
      case 'SHIPPED': return '#337ab7';
      case 'DELIVERED': return '#5cb85c';
      case 'CANCELLED': return '#d9534f';
      case 'REFUNDED': return '#8b5cf6';
      case 'FAILED': return '#ef4444';
      default: return '#777';
    }
  };

  const getStatusLabel = (status) =>
    status === AWAITING_PAYMENT ? 'PAYMENT DUE' : status;

  const canCancel = (status) =>
    status === 'PENDING' || status === AWAITING_PAYMENT || status === 'CONFIRMED';

  if (loading) return <Loader text="Loading your orders..." />;
  if (error) return <div className="flash flash-error">{error}</div>;

  return (
    <div className="order-history">
      <div className="order-history-header">
        <button className="back-link" onClick={onBack}>← Back to Store</button>
        <h2>Your Orders</h2>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <p>You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => {
            const busy = busyOrderId === order.id;

            return (
              <div key={order.id} className="order-card" onClick={() => toggleExpand(order.id)}>
                <div className="order-card-header">
                  <div className="order-meta">
                    <span className="order-id">Order #{order.id}</span>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="order-summary-right">
                    {order.status === AWAITING_PAYMENT && (
                      <Button
                        className="pay-now-btn"
                        disabled={busy}
                        onClick={(e) => handlePayNow(e, order.id)}
                      >
                        {busy ? 'Opening…' : 'Complete Payment'}
                      </Button>
                    )}
                    <span
                      className="order-status"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="order-total">
                      {formatAmount(order.totalAmount)}
                    </span>
                    <span className="expand-icon">
                      {expandedOrderId === order.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {expandedOrderId === order.id && (
                  <div className="order-details" onClick={e => e.stopPropagation()}>
                    <div className="order-address">
                      <strong>Shipping to:</strong> {order.shippingAddress}
                    </div>

                    <table className="order-items-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Product</th>
                          <th>Price</th>
                          <th>Qty</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map(item => (
                          <tr key={item.id}>
                            <td className="item-thumb">
                              {item.thumbnailUrl
                                ? <img src={item.thumbnailUrl} alt={item.productName} />
                                : '—'}
                            </td>
                            <td>{item.productName}</td>
                            <td>{formatAmount(item.productPrice)}</td>
                            <td>{item.quantity}</td>
                            <td>{formatAmount(item.itemTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <PaymentPanel
                      payment={payments[order.id]}
                      loading={paymentLoading === order.id}
                    />

                    <div className="order-actions">
                      {order.status === AWAITING_PAYMENT && (
                        <Button
                          className="pay-now-btn"
                          disabled={busy}
                          onClick={(e) => handlePayNow(e, order.id)}
                        >
                          {busy ? 'Opening…' : `Pay ${formatAmount(order.totalAmount)}`}
                        </Button>
                      )}
                      {canCancel(order.status) && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={(e) => handleCancel(e, order)}
                          style={{ color: '#d9534f', borderColor: '#d9534f' }}
                        >
                          {busy ? 'Working…' : 'Cancel Order'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentPanel({ payment, loading }) {
  if (loading) {
    return (
      <div className="order-payment-panel">
        <div className="order-payment-loading">
          <span className="payment-spinner" aria-hidden="true" />
          <span>Loading payment details…</span>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="order-payment-panel">
        <div className="order-payment-row">
          <span>Payment</span>
          <strong>Not started yet</strong>
        </div>
      </div>
    );
  }

  const label = PAYMENT_LABELS[payment.status] || payment.status;
  const colour = PAYMENT_COLORS[payment.status] || '#777';

  return (
    <div className="order-payment-panel">
      <div className="order-payment-row">
        <span>Payment</span>
        <span className="payment-badge" style={{ backgroundColor: colour }}>{label}</span>
      </div>
      <div className="order-payment-row">
        <span>Amount</span>
        <strong>{formatAmount(payment.amount)}</strong>
      </div>
      {payment.cardLast4 && (
        <div className="order-payment-row">
          <span>Card</span>
          <strong>•••• {payment.cardLast4}</strong>
        </div>
      )}
      {payment.status === PaymentStatus.REFUND_PENDING && (
        <div className="order-payment-row">
          <span>Refund</span>
          <strong>Being processed — this can take a moment</strong>
        </div>
      )}
      {payment.failureReason && (
        <div className="order-payment-reason">{payment.failureReason}</div>
      )}
    </div>
  );
}
