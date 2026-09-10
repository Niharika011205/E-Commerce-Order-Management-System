import React, { useState, useEffect } from 'react';
import { getProducts } from '../../api/productApi';
import { getRecommendations } from '../../api/recommendationApi';
import { getCart, addToCart, removeFromCart, updateCartItem, clearCart } from '../../api/cartApi';
import { placeOrder } from '../../api/orderApi';
import { Storefront } from './Storefront';
import { ProductDetail } from './ProductDetail';
import { CartDrawer } from './CartDrawer';
import { OrderHistory } from './OrderHistory';
import { CheckoutModal } from './CheckoutModal';
import { PaymentStep } from './PaymentStep';
import { UserProfile } from './UserProfile';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { useToast } from '../common/ToastProvider';
import '../../styles/customer.css';

export function CustomerApp({ user, onLogout }) {
  const toast = useToast();
  const [view, setView] = useState('store');
  const [selectedProductId, setSelectedProductId] = useState(null);
  
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [cartOpen, setCartOpen] = useState(false);
  const [cartData, setCartData] = useState({ items: [], subtotal: 0 });
  const [cartLoading, setCartLoading] = useState(false);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState(null);
  
  const [orderSuccessData, setOrderSuccessData] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCart();
  }, []);

  /*
   * The payment page sends the customer back to /orders. This app has no
   * router, so that path is translated into a view here and the URL tidied up
   * afterwards - otherwise a refresh would look like a broken deep link.
   */
  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, '') === '/orders') {
      setView('orders');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [data, recs] = await Promise.all([
        getProducts(),
        getRecommendations().catch(() => null) // fail gracefully if recommendation service is down
      ]);
      setProducts(data);
      setRecommendations(recs);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const data = await getCart();
      setCartData(data);
    } catch (err) {
      console.error('Failed to load cart:', err);
    }
  };

  const handleSelectProduct = (id) => {
    setSelectedProductId(id);
    setView('detail');
  };

  const handleBackToStore = () => {
    setView('store');
    setSelectedProductId(null);
    setOrderSuccessData(null);
  };

  const handleAddToCart = async (product) => {
    setCartLoading(true);
    try {
      const updatedCart = await addToCart(product.id, 1);
      setCartData(updatedCart);
      setCartOpen(true);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Failed to add item to cart');
    } finally {
      setCartLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      return handleRemoveFromCart(productId);
    }
    setCartLoading(true);
    try {
      const updatedCart = await updateCartItem(productId, quantity);
      setCartData(updatedCart);
    } catch (err) {
      toast.error(err.message || 'Failed to update quantity');
    } finally {
      setCartLoading(false);
    }
  };

  const handleRemoveFromCart = async (productId) => {
    setCartLoading(true);
    try {
      const updatedCart = await removeFromCart(productId);
      setCartData(updatedCart);
    } catch (err) {
      toast.error(err.message || 'Failed to remove item');
    } finally {
      setCartLoading(false);
    }
  };

  const handleClearCart = async () => {
    setCartLoading(true);
    try {
      await clearCart();
      fetchCart();
      toast.info('Cart cleared');
    } catch (err) {
      toast.error(err.message || 'Failed to clear cart');
    } finally {
      setCartLoading(false);
    }
  };

  const handleCheckoutInitiate = () => {
    setCheckoutPayload({ type: 'cart' });
    setCheckoutModalOpen(true);
  };

  const handleBuyNow = (product) => {
    setCheckoutPayload({ type: 'direct', productId: product.id, quantity: 1 });
    setCheckoutModalOpen(true);
  };

  const handleCheckoutConfirm = async (payload) => {
    setCartLoading(true);
    try {
      const order = await placeOrder(payload);
      setCheckoutModalOpen(false);
      setCartOpen(false);
      if (payload.type === 'cart') {
        setCartData({ items: [], subtotal: 0 });
      }
      setOrderSuccessData(order);
      setView('payment');
      // Deliberately not "order placed": nothing is confirmed until it is paid.
      toast.success('Order created — complete payment to confirm it');
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setCartLoading(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalItems = cartData.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  return (
    <div className="customer-app">
      <header className="customer-navbar">
        <div className="nav-logo" onClick={handleBackToStore} style={{cursor:'pointer'}}>
          <h2>IntelliCart</h2>
        </div>
        <div className="nav-search">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="search-btn">🔍</button>
        </div>
        <div className="nav-right">
          <div className="nav-item nav-link-btn" onClick={() => setView('orders')}>
            <span className="nav-line-1">Returns</span>
            <span className="nav-line-2">& Orders</span>
          </div>
          <div className="nav-item nav-link-btn" onClick={() => setView('profile')}>
            <span className="nav-line-1">Hello, {user.username}</span>
            <span className="nav-line-2">Account & Lists</span>
          </div>
          <div className="nav-item cart-btn" onClick={() => setCartOpen(true)}>
            <span className="cart-icon">🛒</span>
            <span className="cart-count">{totalItems}</span>
          </div>
          <Button variant="outline" onClick={onLogout} className="logout-btn-sm">Logout</Button>
        </div>
      </header>

      <main className="customer-main">
        {view === 'store' && (
          <>
            {error && <div className="flash flash-error">{error}</div>}
            {loading ? (
              <Loader text="Loading storefront..." />
            ) : (
              <Storefront 
                products={filteredProducts} 
                recommendations={recommendations}
                onSelectProduct={handleSelectProduct} 
              />
            )}
          </>
        )}

        {view === 'detail' && selectedProductId && (
          <ProductDetail 
            productId={selectedProductId} 
            onBack={handleBackToStore} 
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            user={user}
          />
        )}

        {view === 'orders' && (
          <OrderHistory onBack={handleBackToStore} />
        )}

        {view === 'profile' && (
          <UserProfile user={user} onBack={handleBackToStore} />
        )}

        {view === 'payment' && orderSuccessData && (
          <PaymentStep
            order={orderSuccessData}
            user={user}
            onContinueShopping={handleBackToStore}
            onViewOrders={() => setView('orders')}
          />
        )}
      </main>

      <CartDrawer 
        isOpen={cartOpen} 
        onClose={() => setCartOpen(false)} 
        cartData={cartData}
        loading={cartLoading}
        onRemove={handleRemoveFromCart}
        onUpdate={handleUpdateQuantity}
        onClear={handleClearCart}
        onCheckout={handleCheckoutInitiate}
      />

      <CheckoutModal 
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onConfirm={handleCheckoutConfirm}
        payload={checkoutPayload}
        loading={cartLoading}
      />
    </div>
  );
}
