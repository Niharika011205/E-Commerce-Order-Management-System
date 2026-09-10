import React, { useState } from 'react';
import '../../styles/seller.css';
import { Button } from '../common/Button';

export function ProductList({ products, onEdit, onDelete }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <p>You haven't listed any products yet.</p>
      </div>
    );
  }

  return (
    <div className="product-table-wrapper">
      <table className="product-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock Count</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="table-img">
                  {product.thumbnailUrl ? (
                    <img src={product.thumbnailUrl} alt={product.name} />
                  ) : (
                    <div className="img-placeholder">No Img</div>
                  )}
                </div>
              </td>
              <td className="font-medium">{product.name}</td>
              <td>{product.category}</td>
              <td>${product.price?.toFixed(2)}</td>
              <td>
                <span className={`status-badge ${product.stockCount > 0 ? 'active' : 'inactive'}`}>
                  {product.stockCount > 0 ? `${product.stockCount} in stock` : 'Out of Stock'}
                </span>
              </td>
              <td>
                <div className="action-cell">
                  <Button variant="outline" onClick={() => onEdit(product.id)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => onDelete(product.id)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
