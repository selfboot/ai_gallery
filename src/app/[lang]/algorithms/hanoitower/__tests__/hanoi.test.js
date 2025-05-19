import React from 'react';
import { render, screen, fireEvent, waitFor} from '@/app/test_utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HanoiTower from '../content';

describe('HanoiTower Component', () => {
  test('renders component with correct initial settings', () => {
    render(<HanoiTower />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Get Hint')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('Total: 0 / Minimum: 63')).toBeInTheDocument();
    const disks = screen.getAllByTestId('hanoi-disk');
    expect(disks.length).toBe(6);
  });

  test('changes number of disks when selected', async () => {
    const user = userEvent.setup();
    render(<HanoiTower />);
    
    const listboxButton = screen.getByRole('button', { name: '6' });
    await user.click(listboxButton);

    const option3 = await screen.findByRole('option', { name: '3' }); 
    expect(option3).toBeVisible();

    const option4 = await screen.findByRole('option', { name: '4' });
    await user.click(option4);

    await waitFor(() => {
      const updatedDisks = screen.getAllByTestId('hanoi-disk');
      expect(updatedDisks.length).toBe(4);
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    });
  });

  test('starts auto mode when clicked', async () => {
    render(<HanoiTower />);
    const modeSelect = screen.getByTestId('mode-select');
    fireEvent.change(modeSelect, { target: { value: 'auto' } });

    await waitFor(() => {
      expect(screen.getByTestId('start-auto-button')).toBeInTheDocument();
    });

    const startButton = screen.getByTestId('start-auto-button');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('start-auto-button')).toHaveTextContent(/Continue/i);
    });
  });

  test('updates move count correctly', async () => {
    render(<HanoiTower />);
    const initialMoveCountElement = screen.getByText(/Total:/);
    const initialMoveCount = parseInt(initialMoveCountElement.textContent.match(/Total: (\d+)/)[1]);

    let firstTower = screen.getByTestId('tower-0');
    fireEvent.click(firstTower);
    let secondTower = screen.getByTestId('tower-1');
    fireEvent.click(secondTower);
    await waitFor(() => {
      const updatedMoveCountElement = screen.getByText(/Total:/);
      const updatedMoveCount = parseInt(updatedMoveCountElement.textContent.match(/Total: (\d+)/)[1]);
      expect(updatedMoveCount).toBe(initialMoveCount + 1);

      firstTower = screen.getByTestId('tower-0');
      const disksOnFirstTower = firstTower.querySelectorAll('[data-testid="hanoi-disk"]');
      expect(disksOnFirstTower).toHaveLength(5);
      secondTower = screen.getByTestId('tower-1');
      const disksOnSecondTower = secondTower.querySelectorAll('[data-testid="hanoi-disk"]');
      expect(disksOnSecondTower).toHaveLength(1);
    });
  });

  test('resets the game when reset button is clicked', async () => {
    render(<HanoiTower />);
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => {
      const updatedDisks = screen.getAllByTestId('hanoi-disk');
      expect(updatedDisks.length).toBe(6);
    });
  });

  test('provides hint in manual mode', async () => {
    render(<HanoiTower />);
    fireEvent.click(screen.getByText('Get Hint'));
    await waitFor(() => {
      expect(screen.getByText('Hint: Move from tower A to tower B')).toBeInTheDocument();
    });
  });

  test('handles invalid moves in manual mode', async () => {
    render(<HanoiTower />);
    let firstTower = screen.getByTestId('tower-0');
    fireEvent.click(firstTower); // Select first tower
    let secondTower = screen.getByTestId('tower-1');
    fireEvent.click(secondTower); // Move to second tower

    firstTower = screen.getByTestId('tower-0');
    fireEvent.click(firstTower); // Select first tower
    secondTower = screen.getByTestId('tower-1');
    fireEvent.click(secondTower); // Move to second tower

    await waitFor(() => {
      expect(screen.getByText('Move failed. Larger disk cannot be placed on smaller disk.')).toBeInTheDocument();
    });
  });

  test('drag and drop functionality works in manual mode', async () => {
    render(<HanoiTower />);
    let firstTower = screen.getByTestId('tower-0');
    let secondTower = screen.getByTestId('tower-1');
    let firstDisk = firstTower.querySelector('[data-testid="hanoi-disk"]');
    expect(firstDisk).not.toBeNull();

    const dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(() => JSON.stringify({ fromTower: 0, diskSize: 1 })),
      types: ['text/plain']
    };

    fireEvent.dragStart(firstDisk, { dataTransfer });
    fireEvent.dragOver(secondTower, { dataTransfer });
    fireEvent.drop(secondTower, { dataTransfer });
    fireEvent.dragEnd(firstDisk, { dataTransfer });

    await waitFor(() => {
      firstTower = screen.getByTestId('tower-0');
      secondTower = screen.getByTestId('tower-1');

      const disksOnSecondTower = secondTower.querySelectorAll('[data-testid="hanoi-disk"]');
      expect(disksOnSecondTower).toHaveLength(1);
    });
  });

});
