import React from 'react';
import '../../styles/components.css';

export function StarRating({ rating = 0, count = null, onRate = null }) {
  const roundedRating = Math.round(rating * 10) / 10;
  
  return (
    <div className="star-rating">
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span 
            key={star} 
            className={`star ${star <= rating ? 'filled' : ''} ${onRate ? 'interactive' : ''}`}
            onClick={() => onRate && onRate(star)}
          >
            ★
          </span>
        ))}
      </div>
      {count !== null && (
        <span className="rating-count">
          {roundedRating} ({count} reviews)
        </span>
      )}
    </div>
  );
}
