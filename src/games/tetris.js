import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]]
];

const COLORS = [
  '#06b6d4',  // bg-cyan-400
  '#fde047',  // bg-yellow-400
  '#d946ef',  // bg-fuchsia-400
  '#f43f5e',  // bg-red-400
  '#10b981',  // bg-green-400
  '#3b82f6',  // bg-blue-400
  '#fb923c'   // bg-orange-400
];

const TetrisGame = () => {
  const [board, setBoard] = useState(Array(ROWS).fill().map(() => Array(COLS).fill(0)));
  const [currentPiece, setCurrentPiece] = useState(null);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const canvasRef = useRef(null);
  const { t } = useTranslation();

  const createPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    return {
      shape: SHAPES[shapeIndex],
      color: COLORS[colorIndex],
      x: Math.floor(COLS / 2) - Math.floor(SHAPES[shapeIndex][0].length / 2),
      y: 0
    };
  }, []);

  const drawBlock = useCallback((ctx, x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  }, []);

  const drawBoard = useCallback((ctx) => {
    board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBlock(ctx, x, y, value);
        }
      });
    });
  }, [board, drawBlock]);

  const drawPiece = useCallback((ctx) => {
    if (!currentPiece) return;
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, currentPiece.color);
        }
      });
    });
  }, [currentPiece, drawBlock]);

  const isValidMove = useCallback((piece, x, y) => {
    return piece.shape.every((row, dy) => {
      return row.every((value, dx) => {
        let newX = x + dx;
        let newY = y + dy;
        return (
          value === 0 ||
          (newX >= 0 && newX < COLS && newY < ROWS && (newY < 0 || board[newY][newX] === 0))
        );
      });
    });
  }, [board]);

  const rotatePiece = useCallback(() => {
    if (!currentPiece) return;
    let rotated = currentPiece.shape[0].map((_, i) =>
      currentPiece.shape.map(row => row[i]).reverse()
    );
    if (isValidMove({ ...currentPiece, shape: rotated }, currentPiece.x, currentPiece.y)) {
      setCurrentPiece(prev => ({ ...prev, shape: rotated }));
    }
  }, [currentPiece, isValidMove]);

  const movePiece = useCallback((dx, dy) => {
    if (!currentPiece) return false;
    if (isValidMove(currentPiece, currentPiece.x + dx, currentPiece.y + dy)) {
      setCurrentPiece(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      return true;
    }
    return false;
  }, [currentPiece, isValidMove]);

  const clearLines = useCallback(() => {
    setBoard(prev => {
      const newBoard = prev.filter(row => !row.every(cell => cell !== 0));
      const linesCleared = ROWS - newBoard.length; // 在新的状态计算被清除的行数
      while (newBoard.length < ROWS) {
        newBoard.unshift(Array(COLS).fill(0));
      }

      if (linesCleared > 0) {
        setScore(prevScore => prevScore + linesCleared * 10); // 在这里更新得分
      }
      return newBoard;
    });
  }, []);

  const mergePiece = useCallback(() => {
    if (!currentPiece) return;
    setBoard(prev => {
      const newBoard = [...prev];
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            newBoard[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
          }
        });
      });
      return newBoard;
    });
    clearLines(); // 确保在块合并后调用 clearLines 函数
  }, [currentPiece, clearLines]);

  const checkGameOver = useCallback(() => {
    return board[0].some(cell => cell !== 0);
  }, [board]);

  const updateGame = useCallback(() => {
    if (!gameActive) return;
    if (!movePiece(0, 1)) {
      mergePiece();
      if (checkGameOver()) {
        setGameActive(false);
        setGameOver(true);
      } else {
        setCurrentPiece(createPiece());
      }
    }
  }, [gameActive, movePiece, mergePiece, checkGameOver, createPiece]);

  const drawGame = useCallback(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawBoard(ctx);
    drawPiece(ctx);
  }, [drawBoard, drawPiece]);

  const startGame = useCallback(() => {
    setBoard(Array(ROWS).fill().map(() => Array(COLS).fill(0)));
    setScore(0);
    setCurrentPiece(createPiece());
    setGameActive(true);
    setGameOver(false);
  }, [createPiece]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!gameActive) return;
      event.preventDefault();
      switch (event.keyCode) {
        case 37: // left arrow
          movePiece(-1, 0);
          break;
        case 39: // right arrow
          movePiece(1, 0);
          break;
        case 40: // down arrow
          movePiece(0, 1);
          break;
        case 38: // up arrow
          rotatePiece();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameActive, movePiece, rotatePiece]);

  useEffect(() => {
    if (gameActive) {
      const gameInterval = setInterval(updateGame, 500);
      return () => clearInterval(gameInterval);
    }
  }, [gameActive, updateGame]);

  useEffect(() => {
    drawGame();
  }, [board, currentPiece, drawGame]);

  return (
    <div className="flex flex-col items-center bg-gray-100">
      <div className="mb-4 text-xl font-bold">{t('gain_score', { score: score })}</div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK_SIZE}
          height={ROWS * BLOCK_SIZE}
          className="border-2 border-gray-800"
        />
        {!gameActive && !gameOver && (
          <button
            onClick={startGame}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {t('start_game')}
          </button>
        )}
        {gameOver && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 text-center">
            <p>{t('game_over')}</p>
            <p>{t('gain_score', { score: score })}</p>
            <button
              onClick={startGame}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {t('restart_game')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default TetrisGame;