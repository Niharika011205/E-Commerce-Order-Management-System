import React, { useState, useEffect } from 'react';
import { getProductById } from '../../api/productApi';
import { Button } from '../common/Button';
import { StarRating } from '../common/StarRating';
import { Loader } from '../common/Loader';
import { ReviewSection } from './ReviewSection';
import '../../styles/customer.css';

export function ProductDetail({ productId, onBack, onAddToCart, onBuyNow, user }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    fetchDetail();
  }, [productId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await getProductById(productId);
      setProduct(data);
    } catch (err) {
      setError(err.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="detail-loading-wrapper"><Loader text="Loading product details..." /></div>;
  if (error) return <div className="flash flash-error">{error}</div>;
  if (!product) return null;

  const images = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [];

  return (
    <div className="product-detail-container">
      <button className="back-link" onClick={onBack}>&larr; Back to Results</button>
      
      <div className="product-detail-top">
        {/* Left: Image Gallery */}
        <div className="product-gallery">
          {images.length > 0 ? (
            <>
              <div className="main-image">
                <img src={images[selectedImage]} alt={product.name} />
              </div>
              <div className="thumbnail-list">
                {images.map((url, idx) => (
                  <div 
                    key={idx} 
                    className={`thumbnail ${idx === selectedImage ? 'selected' : ''}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={url} alt={`Thumbnail ${idx+1}`} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="main-image img-placeholder-large">No Image Available</div>
          )}
        </div>

        {/* Center: Info */}
        <div className="product-info-panel">
          <span className="detail-brand">{product.brand || 'Generic'}</span>
          <h1 className="detail-title">{product.name}</h1>
          
          <div className="detail-rating-row">
            <StarRating rating={product.averageRating} count={product.totalReviews} />
          </div>

          <div className="divider"></div>

          <div className="detail-price-box">
            <span className="price-symbol">$</span>
            <span className="price-whole">{Math.floor(product.price)}</span>
            <span className="price-fraction">{(product.price % 1).toFixed(2).substring(2)}</span>
            {product.discountPercent > 0 && (
              <span className="discount-tag">-{product.discountPercent}%</span>
            )}
          </div>

          <p className="detail-short-desc">{product.shortDescription}</p>

          {Object.keys(product.specifications || {}).length > 0 && (
            <div className="specifications-box">
              <h3>Specifications</h3>
              <table className="specs-table">
                <tbody>
                  {Object.entries(product.specifications).map(([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Buy Box */}
        <div className="buy-box">
          <h3 className="buy-price">${product.price?.toFixed(2)}</h3>
          {product.stockCount > 0 ? (
            <p className="stock-status" style={{color: 'green'}}>In Stock. ({product.stockCount} available)</p>
          ) : (
            <p className="stock-status" style={{color: 'red'}}>Out of Stock.</p>
          )}
          <p className="sold-by">Sold by <strong>{product.sellerUsername}</strong></p>
          
          <div className="buy-actions">
            <Button onClick={() => onAddToCart(product)} className="full-width rounded-btn bg-yellow" disabled={product.stockCount <= 0}>Add to Cart</Button>
            <Button onClick={() => onBuyNow(product)} className="full-width rounded-btn bg-orange" disabled={product.stockCount <= 0}>Buy Now</Button>
          </div>
        </div>
      </div>

      <div className="divider" style={{ margin: '40px 0' }}></div>

      <div className="product-description-section">
        <h2>Product Description</h2>
        <div className="description-content">
          {product.detailedDescription ? (
             product.detailedDescription.split('\n').map((para, i) => <p key={i}>{para}</p>)
          ) : (
            <p>No detailed description available.</p>
          )}
        </div>
      </div>

      <div className="divider" style={{ margin: '40px 0' }}></div>

      <ReviewSection productId={productId} user={user} />
    </div>
  );
}
