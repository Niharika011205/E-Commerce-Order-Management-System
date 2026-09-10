import React from 'react';
import '../../styles/components.css';

export function Loader({ text = 'Loading...' }) {
  return (
    <div className="loader-container">
      <div className="spinner"></div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
}
