import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { getProductById, createProduct, updateProduct } from '../../api/productApi';
import { Loader } from '../common/Loader';

const emptyForm = {
  name: '',
  shortDescription: '',
  detailedDescription: '',
  price: '',
  discountPercent: '',
  brand: '',
  category: 'Electronics',
  stockCount: 1,
  imageUrls: '',
  specifications: ''
};

export function ProductFormModal({ isOpen, onClose, productId, onSuccess }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (productId) {
        fetchProductDetails();
      } else {
        setForm(emptyForm);
      }
    }
  }, [isOpen, productId]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const data = await getProductById(productId);
      
      // Convert map to multiline string for textarea
      const specsStr = Object.entries(data.specifications || {})
        .map(([k, v]) => `${k}:${v}`)
        .join('\n');
      
      setForm({
        name: data.name,
        shortDescription: data.shortDescription,
        detailedDescription: data.detailedDescription || '',
        price: data.price,
        discountPercent: data.discountPercent || '',
        brand: data.brand || '',
        category: data.category || 'Electronics',
        imageUrls: (data.imageUrls || []).join('\n'),
        specifications: specsStr
      });
    } catch (err) {
      setError(err.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse multi-line texts back to arrays/maps
      const urls = form.imageUrls.split('\n').map(s => s.trim()).filter(Boolean);
      const specsObj = {};
      form.specifications.split('\n').forEach(line => {
        const [k, v] = line.split(':');
        if (k && v) specsObj[k.trim()] = v.trim();
      });

      const payload = {
        name: form.name.trim(),
        shortDescription: form.shortDescription.trim(),
        detailedDescription: form.detailedDescription.trim(),
        price: parseFloat(form.price),
        discountPercent: form.discountPercent ? parseFloat(form.discountPercent) : null,
        brand: form.brand.trim(),
        category: form.category,
        imageUrls: urls,
        specifications: specsObj
      };

      if (!productId) {
        payload.stockCount = parseInt(form.stockCount);
      }

      if (productId) {
        await updateProduct(productId, payload);
      } else {
        await createProduct(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={productId ? 'Edit Product' : 'Add New Product'}
      maxWidth="700px"
    >
      {loading && !productId ? (
        <Loader text="Saving..." />
      ) : (
        <form onSubmit={handleSubmit} className="product-form">
          {error && <div className="flash flash-error">{error}</div>}
          
          <div className="form-grid">
            <label>
              Product Name *
              <input type="text" name="name" value={form.name} onChange={handleChange} required minLength={2} maxLength={200} />
            </label>
            <label>
              Category *
              <select name="category" value={form.category} onChange={handleChange} required>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Books">Books</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Sports">Sports</option>
                <option value="Toys">Toys</option>
                <option value="Automotive">Automotive</option>
                <option value="Health & Beauty">Health & Beauty</option>
                <option value="Grocery">Grocery</option>
                <option value="Pet Supplies">Pet Supplies</option>
              </select>
            </label>
            <label>
              Price ($) *
              <input type="number" step="0.01" min="0.01" name="price" value={form.price} onChange={handleChange} required />
            </label>
            <label>
              Discount (%)
              <input type="number" step="0.01" min="0" max="100" name="discountPercent" value={form.discountPercent} onChange={handleChange} />
            </label>
            <label>
              Brand
              <input type="text" name="brand" value={form.brand} onChange={handleChange} />
            </label>
            {!productId && (
              <label>
                Initial Stock Count *
                <input type="number" min="1" name="stockCount" value={form.stockCount} onChange={handleChange} required />
              </label>
            )}
            <label className="full-width">
              Short Description * (Max 500 chars)
              <textarea name="shortDescription" value={form.shortDescription} onChange={handleChange} required maxLength={500} rows={2} />
            </label>
            <label className="full-width">
              Detailed Description
              <textarea name="detailedDescription" value={form.detailedDescription} onChange={handleChange} rows={4} />
            </label>
            <label className="full-width">
              Image URLs (One per line)
              <textarea name="imageUrls" value={form.imageUrls} onChange={handleChange} rows={3} placeholder="https://example.com/img1.jpg&#10;https://example.com/img2.jpg" />
            </label>
            <label className="full-width">
              Specifications (Format: Key:Value, one per line)
              <textarea name="specifications" value={form.specifications} onChange={handleChange} rows={3} placeholder="Color:Red&#10;Weight:2kg" />
            </label>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
