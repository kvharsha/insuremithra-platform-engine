import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders application title', () => {
  render(<App />);
  const titleElement = screen.getByRole('heading', { name: /InsureMithra/i });
  expect(titleElement).toBeInTheDocument();
});
