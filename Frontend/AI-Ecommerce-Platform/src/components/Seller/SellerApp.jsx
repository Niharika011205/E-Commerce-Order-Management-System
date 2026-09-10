import React, { useState, useEffect } from 'react';
import { getMyProducts, deleteProduct } from '../../api/productApi';
import { ProductList } from './ProductList';
import { ProductFormModal } from './ProductFormModal';
import { SellerOrders } from './SellerOrders';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { useToast } from '../common/ToastProvider';
import '../../styles/seller.css';

export function SellerApp({ user, onLogout }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message || 'Failed to load your products');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const handleEdit = (id) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      fetchProducts();
      toast.success('Product deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    fetchProducts();
  };

  return (
    <div className="seller-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Seller Dashboard</h1>
          <p>Manage your products and sales</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span>
            <span>{user.username}</span>
          </div>
          <Button variant="outline" onClick={onLogout}>Logout</Button>
        </div>
      </header>

      <nav className="seller-tabs">
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📦 My Products
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          💰 Sales History
        </button>
      </nav>

      <main className="dashboard-main">
        {activeTab === 'products' && (
          <>
            <div className="toolbar">
              <h2>My Products ({products.length})</h2>
              <Button onClick={handleAdd}>+ Add New Product</Button>
            </div>

            {error && <div className="flash flash-error">{error}</div>}

            {loading ? (
              <Loader text="Loading your catalog..." />
            ) : (
              <ProductList 
                products={products} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
              />
            )}
          </>
        )}

        {activeTab === 'sales' && (
          <SellerOrders />
        )}
      </main>

      <ProductFormModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        productId={editingId}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
