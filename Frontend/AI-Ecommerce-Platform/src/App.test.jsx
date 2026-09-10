import { render } from '@testing-library/react';
import App from './App';
import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('renders successfully', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });
});
