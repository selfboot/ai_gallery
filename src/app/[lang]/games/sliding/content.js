"use client";

import React, { useState, useEffect } from 'react';
import { Listbox } from '@headlessui/react';

// Priority Queue implementation
class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(element, priority) {
    this.values.push({ element, priority });
    this.sort();
  }

  dequeue() {
    return this.values.shift();
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}

const SlidingPuzzle = () => {
  const [size, setSize] = useState(3);
  const [board, setBoard] = useState([]);
  const [emptyPos, setEmptyPos] = useState({ row: size - 1, col: size - 1 });
  const [moves, setMoves] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [solution, setSolution] = useState([]);
  const [currentSolutionStep, setCurrentSolutionStep] = useState(-1);
  const [solving, setSolving] = useState(false);

  // Manhattan distance heuristic
  const getManhattanDistance = (board) => {
    let distance = 0;
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        const value = board[i][j];
        if (value !== 0) {
          const goalRow = Math.floor((value - 1) / size);
          const goalCol = (value - 1) % size;
          distance += Math.abs(i - goalRow) + Math.abs(j - goalCol);
        }
      }
    }
    return distance;
  };

  // Convert board to string for comparison
  const boardToString = (board) => board.flat().join(',');

  // Get valid moves for current position
  const getValidMoves = (board, emptyPos) => {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up, down, left, right

    for (const [dx, dy] of directions) {
      const newRow = emptyPos.row + dx;
      const newCol = emptyPos.col + dy;

      if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
        const newBoard = board.map(row => [...row]);
        [newBoard[emptyPos.row][emptyPos.col], newBoard[newRow][newCol]] =
          [newBoard[newRow][newCol], newBoard[emptyPos.row][emptyPos.col]];

        moves.push({
          board: newBoard,
          emptyPos: { row: newRow, col: newCol },
          move: `Move ${board[newRow][newCol]} ${dx === 1 ? 'up' : dx === -1 ? 'down' : dy === 1 ? 'left' : 'right'}`
        });
      }
    }

    return moves;
  };

  // A* algorithm implementation
  const solvePuzzle = async (initialBoard, initialEmptyPos) => {
    setSolving(true);
    const pq = new PriorityQueue();
    const visited = new Set();
    const initial = {
      board: initialBoard,
      emptyPos: initialEmptyPos,
      path: [],
      cost: 0
    };

    pq.enqueue(initial, getManhattanDistance(initialBoard));

    while (pq.values.length > 0) {
      const current = pq.dequeue().element;
      const boardStr = boardToString(current.board);

      if (visited.has(boardStr)) continue;
      visited.add(boardStr);

      if (getManhattanDistance(current.board) === 0) {
        setSolution(current.path);
        setSolving(false);
        return current.path;
      }

      const moves = getValidMoves(current.board, current.emptyPos);
      for (const move of moves) {
        if (!visited.has(boardToString(move.board))) {
          pq.enqueue({
            board: move.board,
            emptyPos: move.emptyPos,
            path: [...current.path, { board: move.board, move: move.move }],
            cost: current.cost + 1
          }, current.cost + 1 + getManhattanDistance(move.board));
        }
      }
    }

    setSolving(false);
    return null;
  };

  // Apply solution step
  const applySolutionStep = (step) => {
    setBoard(step.board);
    const newEmptyPos = findEmptyPosition(step.board);
    setEmptyPos(newEmptyPos);
    setMoves(moves + 1);
  };

  // Find empty position in board
  const findEmptyPosition = (board) => {
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j] === 0) {
          return { row: i, col: j };
        }
      }
    }
    return null;
  };

  // Initialize board
  const initializeBoard = (size) => {
    const numbers = Array.from({ length: size * size - 1 }, (_, i) => i + 1);
    numbers.push(0);
    shuffleArray(numbers);

    const newBoard = [];
    for (let i = 0; i < size; i++) {
      newBoard.push(numbers.slice(i * size, (i + 1) * size));
    }

    const newEmptyPos = findEmptyPosition(newBoard);
    setBoard(newBoard);
    setEmptyPos(newEmptyPos);
    setMoves(0);
    setIsSolved(false);
    setSolution([]);
    setCurrentSolutionStep(-1);
  };

  // Fisher-Yates shuffle
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  // Check if puzzle is solved
  const checkSolution = (board) => {
    const flatBoard = board.flat();
    for (let i = 0; i < flatBoard.length - 1; i++) {
      if (flatBoard[i] !== i + 1) return false;
    }
    return flatBoard[flatBoard.length - 1] === 0;
  };

  // Handle tile click
  const handleTileClick = (row, col) => {
    if (isSolved || solving) return;

    const isAdjacent = (
      (Math.abs(row - emptyPos.row) === 1 && col === emptyPos.col) ||
      (Math.abs(col - emptyPos.col) === 1 && row === emptyPos.row)
    );

    if (isAdjacent) {
      const newBoard = board.map(row => [...row]);
      newBoard[emptyPos.row][emptyPos.col] = newBoard[row][col];
      newBoard[row][col] = 0;

      setBoard(newBoard);
      setEmptyPos({ row, col });
      setMoves(moves + 1);
      setSolution([]);
      setCurrentSolutionStep(-1);

      if (checkSolution(newBoard)) {
        setIsSolved(true);
      }
    }
  };

  // Handle solver step
  const handleSolverStep = () => {
    if (currentSolutionStep < solution.length - 1) {
      const nextStep = solution[currentSolutionStep + 1];
      applySolutionStep(nextStep);
      setCurrentSolutionStep(currentSolutionStep + 1);

      if (currentSolutionStep + 1 === solution.length - 1) {
        setIsSolved(true);
      }
    }
  };

  // Initialize on mount and size change
  useEffect(() => {
    initializeBoard(size);
  }, [size]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-4 items-center">
        <Listbox value={size.toString()} onChange={(value) => setSize(parseInt(value))}>
          <div className="relative w-32">
            <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border shadow-sm hover:bg-gray-50">
              <span className="block truncate">{size}x{size}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {[3, 4, 5].map((n) => (
                <Listbox.Option
                  key={n}
                  value={n.toString()}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                    }`
                  }
                >
                  {n}x{n}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>

        <button
          onClick={() => initializeBoard(size)}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New Game
        </button>

        <button
          onClick={() => solvePuzzle(board, emptyPos)}
          disabled={solving || isSolved}
          className={`w-24 px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${solving || isSolved ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {solving ? 'Solving...' : 'Solve'}
        </button>

        {solution.length > 0 && (
          <button
            onClick={handleSolverStep}
            disabled={currentSolutionStep >= solution.length - 1}
            className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${currentSolutionStep >= solution.length - 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            Next Step
          </button>
        )}

        <div className="text-sm">Moves: {moves}</div>
      </div>

      <div className="inline-grid gap-1 p-2 bg-gray-200 rounded-lg"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
        }}>
        {board.map((row, i) =>
          row.map((num, j) => (
            <div
              key={`${i}-${j}`}
              onClick={() => handleTileClick(i, j)}
              className={`
                w-16 h-16 flex items-center justify-center
                text-xl font-bold rounded-lg cursor-pointer
                transition-all duration-200
                ${num === 0 ? 'bg-gray-300' : 'bg-white shadow-md hover:bg-blue-100'}
                ${isSolved ? 'bg-green-100' : ''}
              `}
            >
              {num !== 0 && num}
            </div>
          ))
        )}
      </div>

      {solution.length > 0 && currentSolutionStep >= 0 && (
        <div className="text-sm">
          Next move: {solution[currentSolutionStep].move}
          <br />
          Steps remaining: {solution.length - currentSolutionStep - 1}
        </div>
      )}

      {isSolved && (
        <div className="text-lg font-bold text-green-600">
          Puzzle solved in {moves} moves!
        </div>
      )}
    </div>
  );
};

export default SlidingPuzzle;