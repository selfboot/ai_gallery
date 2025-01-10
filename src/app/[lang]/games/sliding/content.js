'use client';

import React, { useState, useEffect } from 'react';
import { CustomListbox } from '@/app/components/ListBox';
import { useI18n } from '@/app/i18n/client';
import Modal from '@/app/components/Modal';
import { SideAdComponent } from "@/app/components/AdComponent";

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
  const { t } = useI18n();
  const [size, setSize] = useState(3);
  const [difficulty, setDifficulty] = useState(t('difficulty_medium'));
  const [board, setBoard] = useState([]);
  const [emptyPos, setEmptyPos] = useState({ row: size - 1, col: size - 1 });
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

  // A* algorithm implementation
  const solvePuzzle = async (initialBoard, initialEmptyPos) => {
    setSolving(true);
    const pq = new PriorityQueue();
    const visited = new Set();
    const initial = {
      board: initialBoard,
      emptyPos: initialEmptyPos,
      path: [],
      cost: 0,
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
          pq.enqueue(
            {
              board: move.board,
              emptyPos: move.emptyPos,
              path: [...current.path, { board: move.board, move: move.move }],
              cost: current.cost + 1,
            },
            current.cost + 1 + getManhattanDistance(move.board)
          );
        }
      }
    }

    setSolving(false);
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

  // Check if the puzzle is solvable
  const isSolvable = (board) => {
    const flatBoard = board.flat();
    let inversions = 0;
    let emptyRow = 0;

    // Calculate the inverse number数
    for (let i = 0; i < flatBoard.length - 1; i++) {
      if (flatBoard[i] === 0) {
        emptyRow = Math.floor(i / size);
        continue;
      }
      for (let j = i + 1; j < flatBoard.length; j++) {
        if (flatBoard[j] === 0) continue;
        if (flatBoard[i] > flatBoard[j]) {
          inversions++;
        }
      }
    }

    if (size % 2 === 1) {
      // For odd-sized chessboards, the board is solvable if the inversion number is even.
      return inversions % 2 === 0;
    } else {
      // For even-sized chessboards, the board is solvable if the inversion number plus the empty row number (from the bottom) is odd.
      const emptyRowFromBottom = size - emptyRow;
      return (inversions + emptyRowFromBottom) % 2 === 1;
    }
  };

  const getMovesByDifficulty = (difficulty) => {
    switch (difficulty) {
      case t('difficulty_easy'):
        return Math.floor(Math.random() * 4 + 1);
      case t('difficulty_medium'):
        return Math.floor(Math.random() * 45) + 5;
      case t('difficulty_hard'):
        return Math.floor(Math.random() * 450) + 50;
      default:
        return Math.floor(Math.random() * 10);
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
    const newBoard = Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, col) => (row * size + col + 1) % (size * size))
    );
    let newEmptyPos = { row: size - 1, col: size - 1 };

    const moves = getMovesByDifficulty(difficulty);

    for (let i = 0; i < moves; i++) {
      const validMoves = getValidMoves(newBoard, newEmptyPos);
      if (validMoves.length > 0) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
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

  // Handle tile click
  const handleTileClick = (row, col) => {
    if (isSolved || solving) return;

    const isAdjacent =
      (Math.abs(row - emptyPos.row) === 1 && col === emptyPos.col) ||
      (Math.abs(col - emptyPos.col) === 1 && row === emptyPos.row);

    if (isAdjacent) {
      if (moves === 0) {
        setTimerActive(true);
      }

      const dx = emptyPos.col - col;
      const dy = emptyPos.row - row;

      setAnimatingTiles({
        [row * size + col]: { dx, dy },
      });

      setTimeout(() => {
        const newBoard = board.map((row) => [...row]);
        newBoard[emptyPos.row][emptyPos.col] = newBoard[row][col];
        newBoard[row][col] = 0;

        setBoard(newBoard);
        setEmptyPos({ row, col });
        setMoves(moves + 1);
        setSolution([]);
        setCurrentSolutionStep(-1);
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
      if (!isSolvable(board)) {
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
                    onClick={() => handleCellClick(i, j)}
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
        </div>

        <div className="lg:w-1/5 mt-8 lg:mt-0">
          <h2 className="text-xl font-bold mb-4">{t('game_settings')}</h2>

          <div className="space-y-4">
            <div className="mb-4">
              <label className="text-gray-700 block mb-2">{t('board_size')}</label>
              <CustomListbox
                value={`${size}x${size}`}
                onChange={(value) => setSize(parseInt(value.split('x')[0]))}
                options={['3x3', '4x4', '5x5']}
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

            {solution.length > 0 && (
              <button
                onClick={handleSolverStep}
                disabled={currentSolutionStep >= solution.length - 1}
                className={`w-full px-4 py-2 rounded text-white mb-2 ${
                  currentSolutionStep >= solution.length - 1 ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {t('next_move')}
              </button>
            )}

            <div className="text-sm space-y-2">
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
