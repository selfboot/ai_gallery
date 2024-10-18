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
    
    // Set grid size
    const widthInput = screen.getByTestId('grid-width-input');
    const heightInput = screen.getByTestId('grid-height-input');
    fireEvent.change(widthInput, { target: { value: '10' } });
    fireEvent.change(heightInput, { target: { value: '10' } });

    await waitFor(() => {
        expect(screen.getAllByTestId(/^cell-/)).toHaveLength(100); // 10x10 grid
    });
    
    // Set start point
    const startModeButton = screen.getByText('Set Start Point');
    fireEvent.click(startModeButton);
    const startCell = screen.getByTestId('cell-0-0');
    fireEvent.click(startCell);

    // Set end point
    const setEndButton = screen.getByText('Set End Point');
    fireEvent.click(setEndButton);
    const endCell = screen.getByTestId('cell-4-1');
    fireEvent.click(endCell);

    // Set obstacles
    const obstacleModeButton = screen.getByText('Set Obstacles');
    fireEvent.click(obstacleModeButton);
    const obstacle1 = screen.getByTestId('cell-1-1');
    fireEvent.click(obstacle1);

    const speedSlider = screen.getByTestId('search-speed-slider');
    fireEvent.change(speedSlider, { target: { value: '20' } });

    // Find path
    const findPathButton = screen.getByTestId('find-path-button');
    fireEvent.click(findPathButton);

    // Wait for path to be found
    const noPathFoundMessage = await screen.findByText('Path Found', {}, { timeout: 10000 });
    expect(noPathFoundMessage).toBeInTheDocument();
   
    // Verify path exists and connects start to end
    const pathCells = screen.getAllByTestId(/cell-\d-\d/);

    const path = pathCells.filter(cell => cell.classList.contains('bg-green-300'));
    expect(path.length).toBeGreaterThan(0);
    // expect(path.length).toBe(4);
  });

  test('shows a modal when no path is found', async () => {
    render(<AStarPathFind />);

    // Set grid size
    const widthInput = screen.getByTestId('grid-width-input');
    const heightInput = screen.getByTestId('grid-height-input');
    fireEvent.change(widthInput, { target: { value: '5' } });
    fireEvent.change(heightInput, { target: { value: '5' } });

    // Wait for grid to update
    await waitFor(() => {
      expect(screen.getAllByTestId(/^cell-/)).toHaveLength(25); // 5x5 grid
    });

    // Set start point
    const setStartButton = screen.getByText('Set Start Point');
    fireEvent.click(setStartButton);
    const startCell = screen.getByTestId('cell-0-0');
    fireEvent.click(startCell);
    
    // Set end point
    const setEndButton = screen.getByText('Set End Point');
    fireEvent.click(setEndButton);
    const endCell = screen.getByTestId('cell-4-4');
    fireEvent.click(endCell);
    
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

    const speedSlider = screen.getByTestId('search-speed-slider');
    fireEvent.change(speedSlider, { target: { value: '20' } });

    // Find path
    const findPathButton = screen.getByTestId('find-path-button');
    fireEvent.click(findPathButton);

    // Wait for modal to appear
    const noPathFoundMessage = await screen.findByText('No Path Found', {}, { timeout: 5000 });
    expect(noPathFoundMessage).toBeInTheDocument();
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
