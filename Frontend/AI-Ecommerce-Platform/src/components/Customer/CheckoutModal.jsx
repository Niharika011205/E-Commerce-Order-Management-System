import React, { useState } from 'react';
import { Button } from '../common/Button';

export function CheckoutModal({ isOpen, onClose, onConfirm, payload, loading }) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.trim()) return;
    onConfirm({ ...payload, shippingAddress: address.trim() });
  };

  const isDirect = payload?.type === 'direct';

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="order-success-card" style={{ maxWidth: '500px', borderTop: '6px solid #f0ad4e' }}>
        <div className="success-icon" style={{ fontSize: '2.5rem' }}>🚚</div>
        <h2>Checkout</h2>
        <p>
          {isDirect ? 'You are purchasing this item directly.' : 'You are purchasing all items in your cart.'}
          {' '}We'll reserve your items, then take you to payment.
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', marginTop: '24px' }}>
          <div className="form-group">
            <label style={{ fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '16px' }}>Shipping Address</label>
            <textarea
              required
              rows={4}
              placeholder="Enter your full shipping address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
            />
          </div>

          <div className="order-success-actions" style={{ marginTop: '32px' }}>
            <Button type="submit" className="full-width bg-yellow" disabled={loading}>
              {loading ? 'Processing...' : 'Continue to Payment'}
            </Button>
            <Button variant="outline" type="button" onClick={onClose} disabled={loading} className="full-width">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
