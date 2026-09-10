import React from 'react';
import '../../styles/customer.css';
import { StarRating } from '../common/StarRating';

export function Storefront({ products, recommendations, onSelectProduct }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <p>No products available at the moment. Please check back later.</p>
      </div>
    );
  }

  // Map recommendation IDs back to full product objects
  let recommendedProducts = [];
  console.log('Storefront render - recommendations:', recommendations);
  console.log('Storefront render - products:', products);
  if (recommendations && recommendations.items) {
    recommendedProducts = recommendations.items
      .map(recItem => {
        const found = products.find(p => p.id === recItem.productId);
        console.log(`Mapping recItem ${recItem.productId} -> found:`, found);
        return found;
      })
      .filter(Boolean); // remove nulls
  }

  const renderProductCard = (product, isRecommended = false) => (
    <div key={product.id} className={`product-card ${isRecommended ? 'recommended-card' : ''}`} onClick={() => onSelectProduct(product.id)}>
      <div className="product-image-wrapper">
        {product.thumbnailUrl ? (
          <img src={product.thumbnailUrl} alt={product.name} />
        ) : (
          <div className="img-placeholder">No Image</div>
        )}
        {product.discountPercent > 0 && (
          <div className="discount-badge">Save {product.discountPercent}%</div>
        )}
        {isRecommended && (
          <div className="recommended-badge">⭐ Recommended</div>
        )}
      </div>
      <div className="product-info">
        <span className="product-brand">{product.brand || 'Generic'}</span>
        <h3 className="product-name">{product.name}</h3>
        <StarRating rating={product.averageRating} count={product.totalReviews} />
        <div className="product-price">
          ${product.price?.toFixed(2)}
        </div>
        <p className="seller-name">Sold by {product.sellerUsername}</p>
        {product.stockCount <= 0 && (
          <div className="stock-error">Out of Stock</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="storefront-container">
      {recommendedProducts.length > 0 && (
        <section className="recommendations-section">
          <div className="recommendations-header">
            <h2>{recommendations.strategy === 'personalized' ? 'Recommended for You' : 'Trending Now'}</h2>
            <p className="recommendations-reason">{recommendations.reason}</p>
          </div>
          <div className="recommendations-carousel storefront-grid">
            {recommendedProducts.map(p => renderProductCard(p, true))}
          </div>
          <hr className="section-divider" />
        </section>
      )}
      
      <section className="all-products-section">
        <h2>All Products</h2>
        <div className="storefront-grid">
          {products.map(p => renderProductCard(p, false))}
        </div>
      </section>
    </div>
  );
}
