"use client";

import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Frown, Smile } from "lucide-react";
import { useI18n } from "@/app/i18n/client";

const BOARD_SIZE = 4;
const MOVE_DURATION_MS = 160;

const createTile = (value = 0, anim = null, animToken = 0) => ({
  value,
  anim,
  animToken,
});

const createBoardFromValues = (values) =>
  values.map((row) => row.map((value) => createTile(value)));

const createEmptyValueBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));

const createEmptyBoard = () => createBoardFromValues(createEmptyValueBoard());

const cloneBoard = (board) =>
  board.map((row) => row.map((tile) => ({ ...tile })));

const getLineCoordinates = (direction, lineIndex) => {
  switch (direction) {
    case "left":
      return Array.from({ length: BOARD_SIZE }, (_, idx) => ({
        row: lineIndex,
        col: idx,
      }));
    case "right":
      return Array.from({ length: BOARD_SIZE }, (_, idx) => ({
        row: lineIndex,
        col: BOARD_SIZE - 1 - idx,
      }));
    case "up":
      return Array.from({ length: BOARD_SIZE }, (_, idx) => ({
        row: idx,
        col: lineIndex,
      }));
    case "down":
      return Array.from({ length: BOARD_SIZE }, (_, idx) => ({
        row: BOARD_SIZE - 1 - idx,
        col: lineIndex,
      }));
    default:
      return [];
  }
};

const has2048 = (board) =>
  board.some((row) => row.some((tile) => tile.value === 2048));

const canMove = (board) => {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const current = board[r][c].value;
      if (current === 0) return true;
      if (c < BOARD_SIZE - 1 && current === board[r][c + 1].value) return true;
      if (r < BOARD_SIZE - 1 && current === board[r + 1][c].value) return true;
    }
  }
  return false;
};

const addRandomTile = (board, nextAnimToken) => {
  const emptyCells = [];
  board.forEach((row, r) => {
    row.forEach((tile, c) => {
      if (tile.value === 0) {
        emptyCells.push({ r, c });
      }
    });
  });

  if (emptyCells.length === 0) {
    return board;
  }

  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;

  return board.map((row, rowIndex) =>
    row.map((tile, colIndex) =>
      rowIndex === r && colIndex === c
        ? createTile(value, "spawn", nextAnimToken())
        : tile
    )
  );
};

const createMovePlan = (board, direction, nextAnimToken) => {
  const nextValues = createEmptyValueBoard();
  const mergeMask = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(false)
  );
  const movingTiles = [];
  let moved = false;

  for (let line = 0; line < BOARD_SIZE; line++) {
    const coords = getLineCoordinates(direction, line);
    const entries = coords
      .map((coord, index) => ({
        row: coord.row,
        col: coord.col,
        value: board[coord.row][coord.col].value,
        index,
      }))
      .filter((item) => item.value !== 0);

    const lineValues = Array(BOARD_SIZE).fill(0);
    const lineMerged = Array(BOARD_SIZE).fill(false);
    let target = 0;

    entries.forEach((entry, entryIndex) => {
      let destinationIndex = target;

      if (
        target > 0 &&
        lineValues[target - 1] === entry.value &&
        !lineMerged[target - 1]
      ) {
        destinationIndex = target - 1;
        lineValues[destinationIndex] *= 2;
        lineMerged[destinationIndex] = true;
      } else {
        lineValues[destinationIndex] = entry.value;
        target += 1;
      }

      const destination = coords[destinationIndex];
      if (destination.row !== entry.row || destination.col !== entry.col) {
        moved = true;
        movingTiles.push({
          id: `${direction}-${line}-${entry.row}-${entry.col}-${entry.value}-${entryIndex}`,
          value: entry.value,
          fromRow: entry.row,
          fromCol: entry.col,
          toRow: destination.row,
          toCol: destination.col,
          active: false,
        });
      }
    });

    lineValues.forEach((value, idx) => {
      const cell = coords[idx];
      nextValues[cell.row][cell.col] = value;
      mergeMask[cell.row][cell.col] = lineMerged[idx];
    });
  }

  if (!moved) {
    return { moved: false, movingTiles: [], board };
  }

  const movedBoard = nextValues.map((row, rowIndex) =>
    row.map((value, colIndex) => {
      if (value === 0) return createTile();
      if (mergeMask[rowIndex][colIndex]) {
        return createTile(value, "merge", nextAnimToken());
      }
      return createTile(value);
    })
  );

  return { moved: true, movingTiles, board: movedBoard };
};

const randomMatrix = () => {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => createTile())
  );

  let token = 1;
  let count = 0;
  while (count < 2) {
    const rowIndex = Math.floor(Math.random() * BOARD_SIZE);
    const colIndex = Math.floor(Math.random() * BOARD_SIZE);
    if (board[rowIndex][colIndex].value === 0) {
      board[rowIndex][colIndex] = createTile(2, "spawn", token);
      token += 1;
      count += 1;
    }
  }
  return board;
};

function Tile({ number, anim, style, className = "", moving = false }) {
  const tileColor = {
    2: { bg: "bg-[#eee4da]", text: "text-black" },
    4: { bg: "bg-[#ede0c8]", text: "text-black" },
    8: { bg: "bg-[#edcf72]", text: "text-white" },
    16: { bg: "bg-[#edcc61]", text: "text-white" },
    32: { bg: "bg-[#edc850]", text: "text-white" },
    64: { bg: "bg-[#edc53f]", text: "text-white" },
    128: { bg: "bg-[#edc22e]", text: "text-white" },
    256: { bg: "bg-[#f2b179]", text: "text-white" },
    512: { bg: "bg-[#f59563]", text: "text-white" },
    1024: { bg: "bg-[#f67c5f]", text: "text-white" },
    2048: { bg: "bg-[#f65e3b]", text: "text-white" },
  };

  const defaultBg = "bg-[#cdc1b4]";
  const defaultText = "text-black";
  const bgClass = tileColor[number] ? tileColor[number].bg : defaultBg;
  const textClass = tileColor[number] ? tileColor[number].text : defaultText;
  const animationClass = moving
    ? ""
    : anim === "spawn"
      ? "animate-tile-spawn"
      : anim === "merge"
        ? "animate-tile-merge"
        : "";
  const textSizeClass = number >= 1024 ? "text-2xl" : number >= 128 ? "text-3xl" : "text-4xl";

  return (
    <div
      style={style}
      className={`absolute ${bgClass} ${textClass} ${animationClass} ${textSizeClass} rounded-xl shadow-md font-bold flex items-center justify-center select-none will-change-transform ${className}`}
    >
      {number}
    </div>
  );
}

const getTilePositionStyle = (row, col) => ({
  width: "var(--cell-size)",
  height: "var(--cell-size)",
  top: `calc(${row} * (var(--cell-size) + var(--cell-gap)))`,
  left: `calc(${col} * (var(--cell-size) + var(--cell-gap)))`,
});

function Board({ tiles, movingTiles }) {
  const hiddenSourceCells = new Set(
    movingTiles.map((tile) => `${tile.fromRow}-${tile.fromCol}`)
  );
  const boardCssVars = {
    "--cell-size": "clamp(3.9rem, 18vw, 6.2rem)",
    "--cell-gap": "0.5rem",
  };
  const boardLength = `calc(${BOARD_SIZE} * var(--cell-size) + ${BOARD_SIZE - 1} * var(--cell-gap))`;

  return (
    <div className="w-full flex justify-center">
      <div
        className="relative bg-[#bbada0] p-3 sm:p-4 rounded-2xl shadow-xl"
        style={boardCssVars}
      >
        <div
          className="relative"
          style={{
            width: boardLength,
            height: boardLength,
          }}
        >
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${BOARD_SIZE}, var(--cell-size))`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, var(--cell-size))`,
              gap: "var(--cell-gap)",
            }}
          >
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => (
              <div key={`bg-${index}`} className="bg-[#cdc1b4] rounded-xl" />
            ))}
          </div>

          <div className="absolute inset-0">
            {tiles.map((row, rowIndex) =>
              row.map((tile, colIndex) => {
                if (tile.value === 0) return null;
                if (hiddenSourceCells.has(`${rowIndex}-${colIndex}`)) return null;
                return (
                  <Tile
                    key={`stable-${rowIndex}-${colIndex}-${tile.animToken}`}
                    number={tile.value}
                    anim={tile.anim}
                    style={getTilePositionStyle(rowIndex, colIndex)}
                    className="z-10"
                  />
                );
              })
            )}
          </div>

          <div className="absolute inset-0 pointer-events-none">
            {movingTiles.map((tile) => {
              const moveX = tile.toCol - tile.fromCol;
              const moveY = tile.toRow - tile.fromRow;
              return (
                <Tile
                  key={`moving-${tile.id}`}
                  number={tile.value}
                  moving
                  style={{
                    ...getTilePositionStyle(tile.fromRow, tile.fromCol),
                    transform: tile.active
                      ? `translate(calc(${moveX} * (var(--cell-size) + var(--cell-gap))), calc(${moveY} * (var(--cell-size) + var(--cell-gap))))`
                      : "translate(0, 0)",
                    transition: `transform ${MOVE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                    zIndex: 30,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameOverModal({ open, onClose, isSuccess }) {
  const { t } = useI18n();
  if (!open) return null;

  const icon = isSuccess ? (
    <Smile className="text-green-500 text-6xl" />
  ) : (
    <Frown className="text-red-500 text-6xl" />
  );
  const message = isSuccess ? t("congratulations") : t("game_over");

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-20">
      <div className="bg-white p-4 rounded-lg flex flex-col items-center z-30">
        {icon}
        <p className="text-xl mt-2">{message}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {t("restart_game")}
        </button>
      </div>
    </div>
  );
}

function useGameLogic() {
  const [tiles, setTiles] = useState(createEmptyBoard);
  const [movingTiles, setMovingTiles] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [history, setHistory] = useState([]);

  const animTokenRef = useRef(10);
  const animationTimerRef = useRef(null);
  const animatingRef = useRef(false);

  const nextAnimToken = useCallback(() => {
    const token = animTokenRef.current;
    animTokenRef.current += 1;
    return token;
  }, []);

  const clearAnimationState = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    animatingRef.current = false;
    setIsAnimating(false);
    setMovingTiles([]);
  }, []);

  const setBoardImmediately = useCallback(
    (board) => {
      clearAnimationState();
      setTiles(board);
      setHistory([]);
    },
    [clearAnimationState]
  );

  const undoMove = useCallback(() => {
    if (animatingRef.current || history.length === 0) {
      return;
    }
    const previousBoard = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    clearAnimationState();
    setTiles(cloneBoard(previousBoard));
    setGameOver(false);
    setGameWon(false);
  }, [clearAnimationState, history]);

  const handleMove = useCallback(
    (direction) => {
      if (animatingRef.current || gameOver || gameWon) return;

      const plan = createMovePlan(tiles, direction, nextAnimToken);
      if (!plan.moved) {
        if (!canMove(tiles)) {
          setGameOver(true);
        }
        return;
      }

      const isWin = has2048(plan.board);
      const nextBoard = isWin ? plan.board : addRandomTile(plan.board, nextAnimToken);

      animatingRef.current = true;
      setIsAnimating(true);
      setMovingTiles(plan.movingTiles);

      requestAnimationFrame(() => {
        setMovingTiles((prev) =>
          prev.map((tile) => ({
            ...tile,
            active: true,
          }))
        );
      });

      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      animationTimerRef.current = setTimeout(() => {
        setTiles(nextBoard);
        setMovingTiles([]);
        setIsAnimating(false);
        animatingRef.current = false;
        setHistory((prev) => [...prev.slice(-99), cloneBoard(tiles)]);

        if (isWin) {
          setGameWon(true);
          return;
        }

        if (!canMove(nextBoard)) {
          setGameOver(true);
        }
      }, MOVE_DURATION_MS);
    },
    [gameOver, gameWon, nextAnimToken, tiles]
  );

  useEffect(() => {
    const handleKeyPress = (event) => {
      const direction = event.key.replace("Arrow", "").toLowerCase();
      if (!["up", "down", "left", "right"].includes(direction)) {
        return;
      }
      event.preventDefault();
      handleMove(direction);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleMove]);

  useEffect(() => {
    setBoardImmediately(randomMatrix());
  }, [setBoardImmediately]);

  useEffect(() => () => clearAnimationState(), [clearAnimationState]);

  return {
    tiles,
    movingTiles,
    isAnimating,
    gameOver,
    gameWon,
    setGameOver,
    setGameWon,
    setBoardImmediately,
    undoMove,
    canUndo: history.length > 0,
  };
}

const Game2048 = () => {
  const { t } = useI18n();

  const {
    tiles,
    movingTiles,
    isAnimating,
    gameOver,
    gameWon,
    setGameOver,
    setGameWon,
    setBoardImmediately,
    undoMove,
    canUndo,
  } = useGameLogic();

  const resetGame = useCallback(() => {
    setBoardImmediately(randomMatrix());
    setGameOver(false);
    setGameWon(false);
  }, [setBoardImmediately, setGameOver, setGameWon]);

  const loadPresetWin = () => {
    setBoardImmediately(
      createBoardFromValues([
        [2, 4, 8, 256],
        [4, 64, 16, 512],
        [8, 0, 32, 1024],
        [16, 0, 128, 1024],
      ])
    );
    setGameOver(false);
    setGameWon(false);
  };

  const loadPresetLose = () => {
    setBoardImmediately(
      createBoardFromValues([
        [2, 4, 16, 4],
        [8, 16, 32, 16],
        [16, 64, 16, 2],
        [2, 16, 28, 32],
      ])
    );
    setGameOver(false);
    setGameWon(false);
  };

  return (
    <div className="container mx-auto px-4 lg:px-6">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <div className="lg:w-4/5 flex flex-col items-center">
          <Board tiles={tiles} movingTiles={movingTiles} />
        </div>

        <div className="lg:w-1/5 mt-6 lg:mt-0">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500 mb-4 text-center">
              ↑ ↓ ← → {isAnimating ? "..." : ""}
            </p>
            <div className="space-y-2">
              <button
                onClick={undoMove}
                disabled={!canUndo || isAnimating}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("undo")}
              </button>
              <button
                onClick={resetGame}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                {t("reset")}
              </button>
              <button
                onClick={loadPresetWin}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                {t("one_step_win")}
              </button>
              <button
                onClick={loadPresetLose}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                {t("one_step_fail")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <GameOverModal
        open={gameOver || gameWon}
        onClose={resetGame}
        isSuccess={gameWon}
      />
    </div>
  );
};

export default Game2048;
