"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";
import { useI18n } from "@/app/i18n/client";

const GomokuGame = () => {
  const { t } = useI18n();
  const boardSize = 15;
  const [gameBoard, setGameBoard] = useState(() => Array(boardSize).fill().map(() => Array(boardSize).fill("")));
  const [currentPlayer, setCurrentPlayer] = useState("black");
  const [status, setStatus] = useState(() => t("black_turn"));
  const [gameOver, setGameOver] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [firstMove, setFirstMove] = useState("black");

  const createBoard = useCallback(() => {
    const newBoard = Array(boardSize)
      .fill()
      .map(() => Array(boardSize).fill(""));
    setGameBoard(newBoard);
  }, [boardSize]);

  const resetGame = useCallback(() => {
    setGameBoard(Array(boardSize).fill().map(() => Array(boardSize).fill("")));
    setCurrentPlayer(firstMove);
    setStatus(firstMove === "black" ? t("black_turn") : t("white_turn"));
    setGameOver(false);
  }, [t, boardSize, firstMove]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const handleFirstMoveChange = (e) => {
    setFirstMove(e.target.value);
  };

  const placePiece = (row, col) => {
    if (gameBoard[row][col] !== "" || gameOver) return;

    const newBoard = [...gameBoard];
    newBoard[row][col] = currentPlayer;
    setGameBoard(newBoard);

    if (checkWin(row, col)) {
      setStatus(currentPlayer === "black" ? t("black_win") : t("white_win"));
      setGameOver(true);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    } else {
      setCurrentPlayer(currentPlayer === "black" ? "white" : "black");
      setStatus(currentPlayer === "black" ? t("white_turn") : t("black_turn"));
    }
  };

  const checkWin = (row, col) => {
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      count += countDirection(row, col, dx, dy);
      count += countDirection(row, col, -dx, -dy);

      if (count >= 5) return true;
    }

    return false;
  };

  const countDirection = (row, col, dx, dy) => {
    let count = 0;
    let x = row + dx;
    let y = col + dy;

    while (
      x >= 0 &&
      x < boardSize &&
      y >= 0 &&
      y < boardSize &&
      gameBoard[x][y] === currentPlayer
    ) {
      count++;
      x += dx;
      y += dy;
    }

    return count;
  };

  const renderIntersection = (row, col) => {
    const stone = gameBoard[row][col];
    const isSpecialPoint = (row === 3 && col === 3) ||
                           (row === 3 && col === 11) ||
                           (row === 7 && col === 7) ||
                           (row === 11 && col === 3) ||
                           (row === 11 && col === 11);

    return (
      <div
        key={`${row}-${col}`}
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${(col + 1) * 100 / 16}%`,
          top: `${(row + 1) * 100 / 16}%`,
          width: `${100 / 16}%`,
          height: `${100 / 16}%`,
        }}
      >
        {stone && (
          <div
            className={`rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] ${
              stone === "black" ? "bg-black" : "bg-white border border-black"
            }`}
          />
        )}
        {isSpecialPoint && !stone && (
          <div 
            className="bg-black rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%]"
          />
        )}
        <button
          className="w-full h-full opacity-0"
          onClick={() => placePiece(row, col)}
        />
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <div className="lg:w-4/5 flex flex-col items-center">
          <div className="text-center mb-4">
            <p className="text-lg font-bold">{status}</p>
          </div>
          <div className="bg-[#E6B771] p-1 max-w-full overflow-auto relative w-[350px] md:w-[500px] lg:w-[600px] aspect-square">
            <div className="relative w-full h-full">
              {/* 横线 */}
              {[...Array(15)].map((_, i) => (
                <div key={`h${i}`} className="absolute bg-black" style={{
                  left: `${100 / 16}%`,
                  top: `${(i + 1) * 100 / 16}%`,
                  width: `${100 * 14 / 16}%`,
                  height: '1px'
                }} />
              ))}
              {/* 竖线 */}
              {[...Array(15)].map((_, i) => (
                <div key={`v${i}`} className="absolute bg-black" style={{
                  top: `${100 / 16}%`,
                  left: `${(i + 1) * 100 / 16}%`,
                  width: '1px',
                  height: `${100 * 14 / 16}%`
                }} />
              ))}
              {gameBoard.map((row, rowIndex) =>
                row.map((_, colIndex) => renderIntersection(rowIndex, colIndex))
              )}
            </div>
          </div>
        </div>
        <div className="lg:w-1/5 mt-8 lg:mt-0">
          <h2 className="text-xl font-bold mb-4">{t("settings")}</h2>
          <div className="mb-4 flex items-center">
            <label className="text-gray-700 mr-2">
              {t("first_move")} :
            </label>
            <select
              value={firstMove}
              onChange={handleFirstMoveChange}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="black">{t("black")}</option>
              <option value="white">{t("white")}</option>
            </select>
          </div>
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={resetGame}
          >
            {t("restart_game")}
          </button>
        </div>
      </div>
      {showCelebration && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-5 rounded-lg flex flex-col items-center">
            <FontAwesomeIcon
              icon={faTrophy}
              className="text-yellow-400 text-6xl"
            />
            <p className="text-xl font-bold mt-2">{status}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GomokuGame;
