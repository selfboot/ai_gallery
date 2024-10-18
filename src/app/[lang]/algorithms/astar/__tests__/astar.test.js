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
    
    // Set start point
    const startModeButton = screen.getByText('Set Start Point');
    fireEvent.click(startModeButton);
    const startCell = screen.getByTestId('cell-1-1');
    fireEvent.click(startCell);

    // Set end point
    const endModeButton = screen.getByText('Set End Point');
    fireEvent.click(endModeButton);
    const endCell = screen.getByTestId('cell-8-8');
    fireEvent.click(endCell);

  });

  test('finds a path when possible', async () => {
    render(<AStarPathFind />);
    
    // Set start point
    const startModeButton = screen.getByText('Set Start Point');
    fireEvent.click(startModeButton);
    const startCell = screen.getByTestId('cell-0-0');
    fireEvent.click(startCell);

    // Set end point
    const endModeButton = screen.getByText('Set End Point');
    fireEvent.click(endModeButton);
    const endCell = screen.getByTestId('cell-3-1');
    fireEvent.click(endCell);

    // Set obstacles
    const obstacleModeButton = screen.getByText('Set Obstacles');
    fireEvent.click(obstacleModeButton);
    const obstacle1 = screen.getByTestId('cell-1-1');
    fireEvent.click(obstacle1);
    const obstacle2 = screen.getByTestId('cell-2-1');
    fireEvent.click(obstacle2);

    // Find path
    const findPathButton = screen.getByTestId('find-path-button');
    fireEvent.click(findPathButton);

    // Wait for path to be found
    await waitFor(() => {
        expect(screen.getByText('Path Found')).toBeInTheDocument();
    });

    // Verify path exists and connects start to end
    // const pathCells = screen.getAllByTestId(/cell-\d-\d/);
    // const path = pathCells.filter(cell => cell.classList.contains('bg-green-300'));
    // expect(path.length).toBeGreaterThan(0);
    
    // // Check if path starts at start point and ends at end point
    // const pathStart = path[0];
    // const pathEnd = path[path.length - 1];
    // expect(pathStart).toBe(startCell);
    // expect(pathEnd).toBe(endCell);
  });

  test('shows a modal when no path is found', async () => {
    render(<AStarPathFind />);

    // Set start point
    const setStartButton = screen.getByText('Set Start Point');
    fireEvent.click(setStartButton);
    const StartCell = screen.getByTestId('cell-0-0');
    fireEvent.click(StartCell);
    
    // Set obstacle mode
    const obstacleModeButton = screen.getByText('Set Obstacles');
    fireEvent.click(obstacleModeButton);

    // Create obstacles to surround the start point
    const surroundingCells = [
      'cell-1-0', 'cell-0-1', 'cell-1-1',
    ];

    surroundingCells.forEach(cellId => {
      const obstacleCell = screen.getByTestId(cellId);
      fireEvent.click(obstacleCell);
    });

    // Find path
    const findPathButton = screen.getByTestId('find-path-button');
    fireEvent.click(findPathButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('No Path Found')).toBeInTheDocument();
    });
  });

  test('resets the grid when reset button is clicked', async () => {
    render(<AStarPathFind />);
    // Reset grid
    const resetButton = screen.getByTestId('reset-grid-button');
    fireEvent.click(resetButton);

    // Check if grid is reset
    const cells = screen.getAllByTestId(/cell-\d-\d/);
    cells.forEach(cell => {
      expect(cell).not.toHaveClass('bg-green-300');
      expect(cell).not.toHaveClass('bg-green-100');
      expect(cell).not.toHaveClass('bg-red-100');
    });
  });
});
