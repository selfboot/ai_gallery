"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/app/i18n/client";

const ROWS = 20;
const COLS = 10;

const SHAPES = [
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];

const COLORS = [
  "bg-cyan-400",
  "bg-yellow-400",
  "bg-fuchsia-400",
  "bg-red-400",
  "bg-green-400",
  "bg-blue-400",
  "bg-orange-400",
];

const TetrisGame = () => {
  const [board, setBoard] = useState(
    Array(ROWS)
      .fill()
      .map(() => Array(COLS).fill(0))
  );
  const [currentPiece, setCurrentPiece] = useState(null);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { t } = useI18n();
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const createPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    return {
      shape: SHAPES[shapeIndex],
      color: COLORS[colorIndex],
      x: Math.floor(COLS / 2) - Math.floor(SHAPES[shapeIndex][0].length / 2),
      y: 0,
    };
  }, []);

  const isValidMove = useCallback(
    (piece, x, y) => {
      return piece.shape.every((row, dy) =>
        row.every((value, dx) => {
          let newX = x + dx;
          let newY = y + dy;
          return (
            value === 0 ||
            (newX >= 0 &&
              newX < COLS &&
              newY < ROWS &&
              (newY < 0 || board[newY][newX] === 0))
          );
        })
      );
    },
    [board]
  );

  const rotatePiece = useCallback(() => {
    if (!currentPiece) return;
    let rotated = currentPiece.shape[0].map((_, i) =>
      currentPiece.shape.map((row) => row[i]).reverse()
    );
    if (
      isValidMove(
        { ...currentPiece, shape: rotated },
        currentPiece.x,
        currentPiece.y
      )
    ) {
      setCurrentPiece((prev) => ({ ...prev, shape: rotated }));
    }
  }, [currentPiece, isValidMove]);

  const movePiece = useCallback(
    (dx, dy) => {
      if (!currentPiece) return false;
      if (isValidMove(currentPiece, currentPiece.x + dx, currentPiece.y + dy)) {
        setCurrentPiece((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }));
        return true;
      }
      return false;
    },
    [currentPiece, isValidMove]
  );

  const clearLines = useCallback(() => {
    setBoard((prev) => {
      const newBoard = prev.filter((row) => row.some((cell) => cell === 0));
      const linesCleared = ROWS - newBoard.length;
      while (newBoard.length < ROWS) {
        newBoard.unshift(Array(COLS).fill(0));
      }

      if (linesCleared > 0) {
        setScore((prevScore) => prevScore + linesCleared * 10);
      }
      return newBoard;
    });
  }, []);

  const mergePiece = useCallback(() => {
    if (!currentPiece) return;
    setBoard((prev) => {
      const newBoard = [...prev];
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              newBoard[boardY][boardX] = currentPiece.color;
            }
          }
        });
      });
      return newBoard;
    });
    clearLines();
  }, [currentPiece, clearLines]);

  const updateGame = useCallback(() => {
    if (!gameActive) return;
    if (!movePiece(0, 1)) {
      mergePiece();
      const newPiece = createPiece();
      setCurrentPiece(newPiece);
      if (!isValidMove(newPiece, newPiece.x, newPiece.y)) {
        setGameActive(false);
        setGameOver(true);
      }
    }
  }, [gameActive, movePiece, mergePiece, createPiece, isValidMove]);

  const startGame = useCallback(() => {
    setBoard(
      Array(ROWS)
        .fill()
        .map(() => Array(COLS).fill(0))
    );
    setScore(0);
    setCurrentPiece(createPiece());
    setGameActive(true);
    setGameOver(false);
  }, [createPiece]);

  useEffect(() => {
    if (!isClient) return;

    const handleKeyDown = (event) => {
      if (!gameActive) return;
      event.preventDefault();
      switch (event.key) {
        case "ArrowLeft":
          movePiece(-1, 0);
          break;
        case "ArrowRight":
          movePiece(1, 0);
          break;
        case "ArrowDown":
          movePiece(0, 1);
          break;
        case "ArrowUp":
          rotatePiece();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isClient, gameActive, movePiece, rotatePiece]);

  useEffect(() => {
    if (!isClient) return;

    if (gameActive) {
      const gameInterval = setInterval(updateGame, 500);
      return () => clearInterval(gameInterval);
    }
  }, [isClient, gameActive, updateGame]);

  const handleTouchStart = useCallback((e) => {
    if (!gameActive) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  }, [gameActive]);

  const handleTouchEnd = useCallback((e) => {
    if (!gameActive || touchStartX === null || touchStartY === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (deltaX > 0) {
        movePiece(1, 0); // 右移
      } else {
        movePiece(-1, 0); // 左移
      }
    } else {
      // 垂直滑动
      if (deltaY > 0) {
        movePiece(0, 1); // 下移
      } else {
        rotatePiece(); // 上滑旋转
      }
    }
    
    setTouchStartX(null);
    setTouchStartY(null);
  }, [gameActive, touchStartX, touchStartY, movePiece, rotatePiece]);

  const renderBoard = () => {
    const boardWithPiece = board.map((row) => [...row]);
    if (currentPiece) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              boardWithPiece[boardY][boardX] = currentPiece.color;
            }
          }
        });
      });
    }

    return (
      <div
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gap: "0px",
          width: `${COLS * 28}px`,
          height: `${ROWS * 28}px`,
        }}
        className="grid"
      >
        {boardWithPiece.flat().map((cell, index) => (
          <div
            key={index}
            style={{ width: "28px", height: "28px", position: "relative" }}
            className={`${
              cell
                ? `${cell} relative after:absolute after:inset-[1px] after:bg-current after:opacity-30`
                : "bg-gray-100"
            }`}
          />
        ))}
      </div>
    );
  };

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div 
      className="flex flex-col items-center bg-gray-100 p-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mb-4 text-xl font-bold">
        {t("gain_score", { score: score })}
      </div>
      <div className="relative">
        <div className="border-2 border-gray-800">{renderBoard()}</div>
        {!gameActive && !gameOver && (
          <button
            onClick={startGame}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {t("start_game")}
          </button>
        )}
        {gameOver && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 text-center">
            <p>{t("game_over")}</p>
            <p>{t("gain_score", { score: score })}</p>
            <button
              onClick={startGame}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {t("restart_game")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TetrisGame;
