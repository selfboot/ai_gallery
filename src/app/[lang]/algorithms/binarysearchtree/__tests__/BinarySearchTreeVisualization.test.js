import React from 'react';
import { render, screen } from '@/app/test_utils'; // 使用自定义的 render
import '@testing-library/jest-dom'; // 添加这行
import BinarySearchTreeVisualization from '../content';

describe('BinarySearchTreeVisualization', () => {
  test('renders without crashing', () => {
    const { debug } = render(<BinarySearchTreeVisualization />);
    expect(screen.getByText('Initialize Tree')).toBeInTheDocument();
  });
  // Add more tests for delete and search operations
});
