import React from 'react';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import '../../styles/customer.css';

export function CartDrawer({ isOpen, onClose, cartData, loading, onRemove, onUpdate, onClear, onCheckout }) {
  if (!isOpen) return null;

  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || 0;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <div className="cart-drawer">
        <div className="drawer-header">
          <h2>Shopping Cart</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>&times;</button>
        </div>
        
        {loading && <div className="cart-loader-bar"></div>}

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty.</p>
              <Button variant="outline" onClick={onClose}>Continue Shopping</Button>
            </div>
          ) : (
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.name} /> : 'No Img'}
                  </div>
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <span className="cart-item-price">${item.price?.toFixed(2)}</span>
                    <div className="cart-item-actions">
                      <div className="qty-controls">
                        <button onClick={() => onUpdate(item.productId, item.quantity - 1)} disabled={loading}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => onUpdate(item.productId, item.quantity + 1)} disabled={loading}>+</button>
                      </div>
                      <button className="text-btn danger" onClick={() => onRemove(item.productId)} disabled={loading}>Delete</button>
                    </div>
                    <div className="item-subtotal">
                      Total: ${item.itemTotal?.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-footer">
            <button className="text-btn clear-cart-btn" onClick={onClear} disabled={loading}>Clear Cart</button>
            <div className="subtotal-row">
              <span>Subtotal</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <Button className="full-width rounded-btn bg-yellow" disabled={loading} onClick={onCheckout}>Proceed to Checkout</Button>
          </div>
        )}
      </div>
    </>
  );
}
