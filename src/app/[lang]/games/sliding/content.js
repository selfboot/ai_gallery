'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CustomListbox } from '@/app/components/ListBox';
import { useI18n } from '@/app/i18n/client';
import Modal from '@/app/components/Modal';
import { SideAdComponent } from "@/app/components/AdComponent";
import { isSlidingPuzzleSolvable } from './solvability';

const INITIAL_SIZE = 3;

const createSolvedBoard = (size) =>
  Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (row * size + col + 1) % (size * size))
  );

// Priority Queue implementation
class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(element, priority) {
    this.values.push({ element, priority });
    this.bubbleUp(this.values.length - 1);
  }

  dequeue() {
    if (this.values.length === 0) return null;
    const min = this.values[0];
    const end = this.values.pop();
    if (this.values.length > 0) {
      this.values[0] = end;
      this.sinkDown(0);
    }
    return min;
  }

  bubbleUp(index) {
    const element = this.values[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.values[parentIndex];
      if (element.priority >= parent.priority) break;
      this.values[parentIndex] = element;
      this.values[index] = parent;
      index = parentIndex;
    }
  }

  sinkDown(index) {
    const length = this.values.length;
    const element = this.values[index];
    while (true) {
      const leftIndex = 2 * index + 1;
      const rightIndex = 2 * index + 2;
      let swapIndex = null;

      if (leftIndex < length && this.values[leftIndex].priority < element.priority) {
        swapIndex = leftIndex;
      }
      if (
        rightIndex < length &&
        ((swapIndex === null && this.values[rightIndex].priority < element.priority) ||
          (swapIndex !== null && this.values[rightIndex].priority < this.values[swapIndex].priority))
      ) {
        swapIndex = rightIndex;
      }
      if (swapIndex === null) break;
      this.values[index] = this.values[swapIndex];
      this.values[swapIndex] = element;
      index = swapIndex;
    }
  }
}

const SlidingPuzzle = () => {
  const { t } = useI18n();
  const [size, setSize] = useState(INITIAL_SIZE);
  const [difficulty, setDifficulty] = useState(t('difficulty_medium'));
  const [board, setBoard] = useState(() => createSolvedBoard(INITIAL_SIZE));
  const [emptyPos, setEmptyPos] = useState({ row: INITIAL_SIZE - 1, col: INITIAL_SIZE - 1 });
  const [moves, setMoves] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [solution, setSolution] = useState([]);
  const [currentSolutionStep, setCurrentSolutionStep] = useState(-1);
  const [solving, setSolving] = useState(false);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [animatingTiles, setAnimatingTiles] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const pendingCellRef = useRef(null);
  const [solveStatus, setSolveStatus] = useState('');

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
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]; // up, down, left, right

    for (const [dx, dy] of directions) {
      const newRow = emptyPos.row + dx;
      const newCol = emptyPos.col + dy;

      if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
        const newBoard = board.map((row) => [...row]);
        [newBoard[emptyPos.row][emptyPos.col], newBoard[newRow][newCol]] = [
          newBoard[newRow][newCol],
          newBoard[emptyPos.row][emptyPos.col],
        ];

        moves.push({
          board: newBoard,
          emptyPos: { row: newRow, col: newCol },
          move: t('move_direction', {
            number: board[newRow][newCol],
            direction:
              dx === 1
                ? t('direction_up')
                : dx === -1
                ? t('direction_down')
                : dy === 1
                ? t('direction_left')
                : t('direction_right'),
          }),
        });
      }
    }

    return moves;
  };

  const getSolverLimits = () => {
    if (size <= 3) return { maxMs: 5000, maxVisited: 120000, weight: 1 };
    if (size === 4) return { maxMs: 9000, maxVisited: 180000, weight: 1.15 };
    if (size === 5) return { maxMs: 12000, maxVisited: 100000, weight: 1.65 };
    return { maxMs: 12000, maxVisited: 65000, weight: 2.1 };
  };

  const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

  // Time-limited weighted A* implementation. Larger boards use a higher heuristic weight.
  const solvePuzzle = async (initialBoard, initialEmptyPos) => {
    setSolving(true);
    setSolveStatus(t('solve_searching'));
    setSolution([]);
    setCurrentSolutionStep(-1);

    const { maxMs, maxVisited, weight } = getSolverLimits();
    const startTime = performance.now();
    const pq = new PriorityQueue();
    const bestCosts = new Map();
    const initial = {
      board: initialBoard,
      emptyPos: initialEmptyPos,
      path: [],
      cost: 0,
    };

    pq.enqueue(initial, getManhattanDistance(initialBoard) * weight);

    while (pq.values.length > 0) {
      if (bestCosts.size >= maxVisited || performance.now() - startTime > maxMs) {
        setSolving(false);
        setSolveStatus(t('solve_limited', { count: bestCosts.size }));
        return null;
      }

      if (bestCosts.size > 0 && bestCosts.size % 1000 === 0) {
        setSolveStatus(t('solve_progress', { count: bestCosts.size }));
        await yieldToBrowser();
      }

      const current = pq.dequeue().element;
      const boardStr = boardToString(current.board);
      const existingCost = bestCosts.get(boardStr);

      if (existingCost !== undefined && existingCost <= current.cost) continue;
      bestCosts.set(boardStr, current.cost);

      const currentDistance = getManhattanDistance(current.board);
      if (currentDistance === 0) {
        setSolution(current.path);
        setSolving(false);
        setSolveStatus(t('solve_found', { count: current.path.length }));
        return current.path;
      }

      const moves = getValidMoves(current.board, current.emptyPos).sort(
        (a, b) => getManhattanDistance(a.board) - getManhattanDistance(b.board)
      );
      for (const move of moves) {
        const nextCost = current.cost + 1;
        const moveBoardStr = boardToString(move.board);
        const knownCost = bestCosts.get(moveBoardStr);
        if (knownCost === undefined || nextCost < knownCost) {
          const heuristic = getManhattanDistance(move.board);
          pq.enqueue(
            {
              board: move.board,
              emptyPos: move.emptyPos,
              path: [...current.path, { board: move.board, move: move.move }],
              cost: nextCost,
            },
            nextCost + heuristic * weight
          );
        }
      }
    }

    setSolving(false);
    setSolveStatus(t('solve_not_found'));
    return null;
  };

  // Apply solution step
  const applySolutionStep = (step) => {
    const oldEmptyPos = findEmptyPosition(board);
    const newEmptyPos = findEmptyPosition(step.board);
    
    // Calculate the moving direction
    const dx = oldEmptyPos.col - newEmptyPos.col;
    const dy = oldEmptyPos.row - newEmptyPos.row;
    
    // Set the animation state
    const movingTileIndex = newEmptyPos.row * size + newEmptyPos.col;
    setAnimatingTiles({
      [movingTileIndex]: { dx, dy }
    });

    // Delay updating the actual position
    setTimeout(() => {
      setBoard(step.board);
      setEmptyPos(newEmptyPos);
      setMoves(moves + 1);
      setAnimatingTiles({});
    }, 200); // Animation duration
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

  const getMovesByDifficulty = (difficulty) => {
    switch (difficulty) {
      case t('difficulty_easy'):
        return Math.floor(Math.random() * 10) + 15;
      case t('difficulty_medium'):
        return Math.floor(Math.random() * 30) + 60;
      case t('difficulty_hard'):
        return Math.floor(Math.random() * 450) + 50;
      default:
        return Math.floor(Math.random() * 10) + 15;
    }
  };

  const initializeBoard = (size) => {
    // If in edit mode, exit edit mode first
    if (isEditing) {
      setIsEditing(false);
      setSelectedCell(null);
      setAvailableNumbers([]);
    }

    // First create the completed board
    const newBoard = createSolvedBoard(size);
    let newEmptyPos = { row: size - 1, col: size - 1 };

    const moves = getMovesByDifficulty(difficulty);
    let prevEmptyPos = null;

    for (let i = 0; i < moves; i++) {
      const validMoves = getValidMoves(newBoard, newEmptyPos);
      // Filter out the move that would go back to previous position to avoid undoing the last move
      let filteredMoves = validMoves;
      if (prevEmptyPos && validMoves.length > 1) {
        filteredMoves = validMoves.filter(
          (m) => m.emptyPos.row !== prevEmptyPos.row || m.emptyPos.col !== prevEmptyPos.col
        );
      }
      if (filteredMoves.length > 0) {
        const randomMove = filteredMoves[Math.floor(Math.random() * filteredMoves.length)];
        prevEmptyPos = { ...newEmptyPos };
        newBoard[newEmptyPos.row][newEmptyPos.col] = newBoard[randomMove.emptyPos.row][randomMove.emptyPos.col];
        newBoard[randomMove.emptyPos.row][randomMove.emptyPos.col] = 0;
        newEmptyPos = randomMove.emptyPos;
      }
    }

    setBoard(newBoard);
    setEmptyPos(newEmptyPos);
    setMoves(0);
    setIsSolved(false);
    setSolution([]);
    setCurrentSolutionStep(-1);
    setSolveStatus('');
    setTime(0);
    setTimerActive(false); 
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

  const getSlideMove = (row, col) => {
    if (row === emptyPos.row && col === emptyPos.col) return null;
    if (row !== emptyPos.row && col !== emptyPos.col) return null;

    if (row === emptyPos.row) {
      const step = col < emptyPos.col ? 1 : -1;
      return {
        axis: 'row',
        step,
        tiles: Array.from({ length: Math.abs(emptyPos.col - col) }, (_, index) => ({
          row,
          col: col + index * step,
          dx: step,
          dy: 0,
        })),
      };
    }

    const step = row < emptyPos.row ? 1 : -1;
    return {
      axis: 'col',
      step,
      tiles: Array.from({ length: Math.abs(emptyPos.row - row) }, (_, index) => ({
        row: row + index * step,
        col,
        dx: 0,
        dy: step,
      })),
    };
  };

  const applySlideMove = (row, col, slideMove) => {
    const newBoard = board.map((boardRow) => [...boardRow]);

    if (slideMove.axis === 'row') {
      for (let currentCol = emptyPos.col; currentCol !== col; currentCol -= slideMove.step) {
        newBoard[row][currentCol] = newBoard[row][currentCol - slideMove.step];
      }
      newBoard[row][col] = 0;
      return newBoard;
    }

    for (let currentRow = emptyPos.row; currentRow !== row; currentRow -= slideMove.step) {
      newBoard[currentRow][col] = newBoard[currentRow - slideMove.step][col];
    }
    newBoard[row][col] = 0;
    return newBoard;
  };

  // Handle tile click
  const handleTileClick = (row, col) => {
    if (isSolved || solving) return;

    const slideMove = getSlideMove(row, col);

    if (slideMove) {
      if (moves === 0) {
        setTimerActive(true);
      }

      setAnimatingTiles(
        slideMove.tiles.reduce((tiles, tile) => {
          tiles[tile.row * size + tile.col] = { dx: tile.dx, dy: tile.dy };
          return tiles;
        }, {})
      );

      setTimeout(() => {
        const newBoard = applySlideMove(row, col, slideMove);

        setBoard(newBoard);
        setEmptyPos({ row, col });
        setMoves(moves + 1);
        setSolution([]);
        setCurrentSolutionStep(-1);
        setSolveStatus('');
        setAnimatingTiles({});

        if (checkSolution(newBoard)) {
          setIsSolved(true);
          setTimerActive(false);
        }
      }, 200);
    }
  };

  // Handle solver step
  const handleSolverStep = () => {
    if (currentSolutionStep < solution.length - 1) {
      applySolutionStep(solution[currentSolutionStep + 1]);
      const nextStep = currentSolutionStep + 1;
      setCurrentSolutionStep(nextStep);

      // If it is the last step, set the game to completed status.态
      if (nextStep === solution.length - 1) {
        setIsSolved(true);
        setTimerActive(false);
      }
    }
  };

  // Handle edit mode
  const handleEditMode = () => {
    if (isEditing && isAllCellsFilled()) {
      if (!isSlidingPuzzleSolvable(board, size)) {
        const message = t('unsolvable_puzzle_message', {
          size: `${size}x${size}`,
          rule: size % 2 === 1 
            ? t('solvable_rule_odd')
            : t('solvable_rule_even')
        });
        setModalMessage(message);
        setIsModalOpen(true);
        return;
      }
      setIsEditing(false);
      setSelectedCell(null);
      setAvailableNumbers([]);
      const newEmptyPos = findEmptyPosition(board);
      setEmptyPos(newEmptyPos);

      // Reset game status
      setMoves(0);
      setTime(0);
      setTimerActive(false);
      setSolution([]);
      setCurrentSolutionStep(-1);
      setSolveStatus('');
      setIsSolved(false);
    } else {
      const newBoard = Array(size)
        .fill()
        .map(() => Array(size).fill(undefined));
      setBoard(newBoard);
      setAvailableNumbers(Array.from({ length: size * size }, (_, i) => i));
      setIsEditing(true);
      setTimerActive(false);
      setSolution([]);
      setCurrentSolutionStep(-1);
      setSolveStatus('');
      setIsSolved(false);
    }
  };

  // Handle number select
  const handleNumberSelect = (number) => {
    if (!selectedCell) return;

    const [row, col] = selectedCell;
    const newBoard = board.map((row) => [...row]);
    newBoard[row][col] = number;
    setBoard(newBoard);
    setSelectedCell(null);

    const usedNumbers = newBoard.flat().filter((n) => n !== undefined);
    const newAvailableNumbers = Array.from({ length: size * size }, (_, i) => i).filter((num) => {
      if (num === 0) {
        return usedNumbers.filter((n) => n === 0).length === 0;
      }
      return !usedNumbers.includes(num);
    });

    setAvailableNumbers(newAvailableNumbers);
  };

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (isEditing) {
      if (board[row][col] !== undefined) {
        return;
      }
      if (availableNumbers.length === 0) {
        return;
      }
      setSelectedCell([row, col]);
      return;
    }
    handleTileClick(row, col);
  };

  const handleCellPointerDown = (event, row, col) => {
    if (event.target.closest('button')) return;
    if (event.button !== undefined && event.button !== 0) return;
    pendingCellRef.current = { row, col, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleCellPointerUp = (event) => {
    const pendingCell = pendingCellRef.current;
    pendingCellRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!pendingCell || pendingCell.pointerId !== event.pointerId) return;
    handleCellClick(pendingCell.row, pendingCell.col);
  };

  const handleCellPointerCancel = (event) => {
    pendingCellRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  // Initialize on mount and size change
  useEffect(() => {
    initializeBoard(size);
  }, [size]);

  // Add timer effect
  useEffect(() => {
    let interval;
    if (timerActive && !isSolved) {
      interval = setInterval(() => {
        setTime((time) => time + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isSolved]);

  // Handle number delete
  const handleNumberDelete = (row, col) => {
    const newBoard = board.map((r) => [...r]);
    const deletedNumber = newBoard[row][col];
    newBoard[row][col] = undefined;
    setBoard(newBoard);

    const usedNumbers = newBoard.flat().filter((n) => n !== undefined);
    const newAvailableNumbers = Array.from({ length: size * size }, (_, i) => i).filter((num) => {
      if (num === 0) {
        return usedNumbers.filter((n) => n === 0).length === 0;
      }
      return !usedNumbers.includes(num);
    });

    setAvailableNumbers(newAvailableNumbers);
  };

  // Check if all cells are filled
  const isAllCellsFilled = () => {
    const usedNumbers = board.flat();
    return !usedNumbers.includes(undefined) && usedNumbers.filter((n) => n === 0).length === 1;
  };

  const canSolve = () => {
    if (isEditing || solving || isSolved) return false;
    const hasAllNumbers = !board.flat().includes(undefined);
    const hasOneEmpty = board.flat().filter((n) => n === 0).length === 1;
    return hasAllNumbers && hasOneEmpty;
  };

  return (
    <div className="container mx-auto">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <div className="lg:w-4/5 flex flex-col items-center">
          <div className="text-center mb-4">
            {isSolved && <div className="text-lg font-bold text-green-600">{t('puzzle_solved', { moves })}</div>}
          </div>
          <div
            className="inline-grid gap-1 p-2 bg-gray-200 rounded-lg w-full lg:w-1/2 aspect-square"
            style={{
              gridTemplateColumns: `repeat(${size}, 1fr)`,
            }}
          >
            {board.map((row, i) =>
              row.map((num, j) => {
                const tileIndex = i * size + j;
                const animation = animatingTiles[tileIndex];

                return (
                  <div
                    key={`${i}-${j}`}
                    onPointerDown={(event) => handleCellPointerDown(event, i, j)}
                    onPointerUp={handleCellPointerUp}
                    onPointerCancel={handleCellPointerCancel}
                    onDragStart={(event) => event.preventDefault()}
                    className={`
                      aspect-square flex items-center justify-center
                      text-2xl md:text-3xl lg:text-4xl font-bold rounded-lg cursor-pointer
                      transition-all duration-200 relative
                      ${
                        num === undefined
                          ? 'bg-gray-50'
                          : num === 0
                          ? 'bg-gray-300'
                          : 'bg-white shadow-md hover:bg-blue-100'
                      }
                      ${isSolved ? 'bg-green-100' : ''}
                      ${isEditing ? 'hover:bg-blue-50' : ''}
                      ${selectedCell && selectedCell[0] === i && selectedCell[1] === j ? 'ring-2 ring-blue-500' : ''}
                    `}
                    style={{
                      transform: animation ? `translate(${animation.dx * 100}%, ${animation.dy * 100}%)` : 'none',
                      transition: animation ? 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      zIndex: animation ? 10 : num === 0 ? 1 : 2,
                    }}
                  >
                    {num !== undefined && num !== 0 && num}
                    {isEditing && num !== undefined && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNumberDelete(i, j);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center 
                          text-gray-500 hover:text-red-500 text-sm bg-white rounded-full 
                          shadow hover:shadow-md transition-all duration-200"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {isEditing && selectedCell && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
                <div className="grid grid-cols-3 gap-2">
                  {availableNumbers.map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumberSelect(num)}
                      className="p-4 text-xl font-bold rounded-lg hover:bg-blue-100"
                    >
                      {num === 0 ? t('empty_space') : num}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center space-x-8">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xl font-semibold">{moves} 步</span>
            </div>

            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xl font-semibold">
                {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="mt-4 text-sm text-center space-y-1">
            <div className="text-gray-600">{solveStatus || ' '}</div>
            {solution.length > 0 && currentSolutionStep >= 0 && (
              <>
                <div>
                  {t('hint')}: {solution[currentSolutionStep].move}
                </div>
                <div>
                  {t('remaining_steps')}: {solution.length - currentSolutionStep - 1}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lg:w-1/5 mt-8 lg:mt-0">
          <h2 className="text-xl font-bold mb-4">{t('game_settings')}</h2>

          <div className="space-y-4">
            <div className="mb-4">
              <label className="text-gray-700 block mb-2">{t('board_size')}</label>
              <CustomListbox
                value={`${size}x${size}`}
                onChange={(value) => setSize(parseInt(value.split('x')[0]))}
                options={['3x3', '4x4', '5x5', '6x6', '7x7', '8x8']}
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-700 block mb-2">{t('difficulty')}</label>
              <CustomListbox
                value={difficulty}
                onChange={(value) => setDifficulty(value)}
                options={[t('difficulty_easy'), t('difficulty_medium'), t('difficulty_hard')]}
              />
            </div>

            <button
              onClick={() => initializeBoard(size)}
              className={`w-full px-4 py-2 rounded text-white bg-blue-500 hover:bg-blue-600`}
            >
              {t('new_game')}
            </button>

            <button
              onClick={handleEditMode}
              className={`w-full px-4 py-2 rounded text-white ${
                isEditing
                  ? isAllCellsFilled()
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              disabled={isEditing && !isAllCellsFilled()}
            >
              {isEditing ? t('finish_editing') : t('manual_setup')}
            </button>

            <button
              onClick={() => solvePuzzle(board, emptyPos)}
              disabled={!canSolve()}
              className={`w-full px-4 py-2 rounded text-white mb-2 ${
                !canSolve() ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {solving ? t('solving') : t('solve')}
            </button>

            <button
              onClick={handleSolverStep}
              disabled={solution.length === 0 || currentSolutionStep >= solution.length - 1}
              className={`w-full px-4 py-2 rounded text-white mb-2 ${
                solution.length === 0 || currentSolutionStep >= solution.length - 1 ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {t('next_move')}
            </button>

            <div className="hidden md:relative md:block w-full bg-gray-100">
              <SideAdComponent />
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {modalMessage}
      </Modal>
    </div>
  );
};

export default SlidingPuzzle;
