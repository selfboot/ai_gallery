import React from 'react';
import { render, screen } from '@/app/test_utils'; 
import '@testing-library/jest-dom'; 
import BinarySearchTreeVisualization from '../content';

describe('BinarySearchTreeVisualization', () => {
  test('renders without crashing', () => {
    const { debug } = render(<BinarySearchTreeVisualization />);
    expect(screen.getByText('Initialize Tree')).toBeInTheDocument();
  });
  // Add more tests for delete and search operations
});
