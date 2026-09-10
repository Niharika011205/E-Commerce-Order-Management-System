import React from 'react';
import '../../styles/components.css';

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  // Forwarded so callers can pass style, title, aria-* and the like.
  // Several already passed `style`, which was being dropped silently.
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
