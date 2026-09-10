import React from 'react';
import { Button } from '../common/Button';

export function OrderSuccessCard({ order, onContinueShopping, onViewOrders }) {
  if (!order) return null;

  return (
    <div className="order-success-container">
      <div className="order-success-card">
        <div className="success-icon">🎉</div>
        <h2>Order Placed Successfully!</h2>
        <p>Thank you for your purchase.</p>
        
        <div className="order-success-details">
          <div className="detail-row">
            <span>Order Number:</span>
            <strong>#{order.id}</strong>
          </div>
          <div className="detail-row">
            <span>Total Amount:</span>
            <strong>${order.totalAmount.toFixed(2)}</strong>
          </div>
          <div className="detail-row">
            <span>Shipping To:</span>
            <strong>{order.shippingAddress}</strong>
          </div>
        </div>

        <div className="order-success-actions">
          <Button onClick={onViewOrders} variant="outline" className="full-width">View Your Orders</Button>
          <Button onClick={onContinueShopping} className="full-width bg-yellow">Continue Shopping</Button>
        </div>
      </div>
    </div>
  );
}
