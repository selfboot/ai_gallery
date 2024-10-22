import React from 'react';
import { render, fireEvent, waitFor, screen } from '@/app/test_utils'
import '@testing-library/jest-dom';
import AStarPathFind from '../content';

describe('AStarPathFind', () => {
  test('renders the grid and controls', () => {
    render(<AStarPathFind />);
    expect(screen.getByTestId('grid')).toBeInTheDocument();
    expect(screen.getByTestId('find-path-button')).toBeInTheDocument();
    expect(screen.getByTestId('reset-grid-button')).toBeInTheDocument();
  });

  test('allows setting start and end points', async () => {
    render(<AStarPathFind />);
    fireEvent.click(screen.getByText('Set Start Point'));
    fireEvent.click(screen.getByTestId('cell-1-1'));
    fireEvent.click(screen.getByText('Set End Point'));
    fireEvent.click(screen.getByTestId('cell-8-8'));
  });

  test('finds a path when possible', async () => {
    render(<AStarPathFind />);
    fireEvent.change(screen.getByTestId('grid-width-input'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('grid-height-input'), { target: { value: '10' } });
    await waitFor(() => expect(screen.getAllByTestId(/^cell-/)).toHaveLength(100));
    fireEvent.click(screen.getByTestId('reset-grid-button'));
    fireEvent.click(screen.getByText('Set Start Point'));
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByText('Set End Point'));
    fireEvent.click(screen.getByTestId('cell-4-1'));
    fireEvent.click(screen.getByText('Set Obstacles'));
    fireEvent.click(screen.getByTestId('cell-1-1'));
    fireEvent.change(screen.getByTestId('search-speed-slider'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('find-path-button'));

    const pathFoundMessage = await screen.findByText('Path Found', {}, { timeout: 10000 });
    expect(pathFoundMessage).toBeInTheDocument();
   
    const path = screen.getAllByTestId(/cell-\d-\d/).filter(cell => cell.classList.contains('bg-green-300'));
    expect(path.length).toBeGreaterThan(0);
  });

  test('shows a modal when no path is found', async () => {
    render(<AStarPathFind />);
    fireEvent.change(screen.getByTestId('grid-width-input'), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId('grid-height-input'), { target: { value: '5' } });
    await waitFor(() => expect(screen.getAllByTestId(/^cell-/)).toHaveLength(25));

    fireEvent.click(screen.getByTestId('reset-grid-button'));
    fireEvent.click(screen.getByText('Set Start Point'));
    fireEvent.click(screen.getByTestId('cell-0-0'));
    fireEvent.click(screen.getByText('Set End Point'));
    fireEvent.click(screen.getByTestId('cell-4-4'));
    fireEvent.click(screen.getByText('Set Obstacles'));

    ['cell-1-0', 'cell-0-1', 'cell-1-1'].forEach(cellId => {
      fireEvent.click(screen.getByTestId(cellId));
    });

    fireEvent.change(screen.getByTestId('search-speed-slider'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('find-path-button'));

    const noPathFoundMessage = await screen.findByText('No Path Found', {}, { timeout: 5000 });
    expect(noPathFoundMessage).toBeInTheDocument();
  });

  test('resets the grid when reset button is clicked', async () => {
    render(<AStarPathFind />);
    fireEvent.click(screen.getByTestId('reset-grid-button'));

    screen.getAllByTestId(/cell-\d-\d/).forEach(cell => {
      expect(cell).not.toHaveClass('bg-green-300');
      expect(cell).not.toHaveClass('bg-green-100');
      expect(cell).not.toHaveClass('bg-red-100');
    });
  });
});
