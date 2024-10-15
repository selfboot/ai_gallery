"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";
import { checkDoubleThree, checkOverline } from "./forbiddenMoves";

const GomokuGame = () => {
  const { t } = useI18n();
  const boardSize = 15;
  const [gameBoard, setGameBoard] = useState(() => Array(boardSize).fill().map(() => Array(boardSize).fill("")));
  const [currentPlayer, setCurrentPlayer] = useState("black");
  const [status, setStatus] = useState(() => t("black_turn"));
  const [gameOver, setGameOver] = useState(false);
  const [firstMove, setFirstMove] = useState("black");
  const [hoverPosition, setHoverPosition] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [undoCount, setUndoCount] = useState({ black: 3, white: 3 });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [forbiddenPositions, setForbiddenPositions] = useState([]);
  const [forbiddenRules, setForbiddenRules] = useState(["noRestriction"]);

  const resetGame = useCallback(() => {
    setGameBoard(Array(boardSize).fill().map(() => Array(boardSize).fill("")));
    setCurrentPlayer(firstMove);
    setStatus(firstMove === "black" ? t("black_turn") : t("white_turn"));
    setGameOver(false);
    setMoveHistory([]);
    setUndoCount({ black: 3, white: 3 });
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

    if (currentPlayer === firstMove && forbiddenRules.length > 0 && !forbiddenRules.includes("noRestriction")) {
      if (forbiddenRules.includes("threeThree")) {
        const { isForbidden, forbiddenPositions } = checkDoubleThree(newBoard, row, col, currentPlayer);
        if (isForbidden) {
          setForbiddenPositions(forbiddenPositions);
          setModalMessage(t("three_three_forbidden", { player: t(currentPlayer) }));
          setShowModal(true);
          setGameOver(true);
          return;
        }
      }

      if (forbiddenRules.includes("longConnection")) {
        const overlines = checkOverline(newBoard, row, col, currentPlayer);
        if (overlines.length > 0) {
          setForbiddenPositions(overlines.flat());
          setModalMessage(t("long_connection_forbidden", { player: t(currentPlayer) }));
          setShowModal(true);
          setGameOver(true);
          return;
        }
      }
    }

    setGameBoard(newBoard);
    setMoveHistory([...moveHistory, { row, col, player: currentPlayer }]);
    setForbiddenPositions([]);

    if (checkWin(row, col)) {
      const winMessage = currentPlayer === "black" ? t("black_win") : t("white_win");
      setModalMessage(winMessage);
      setShowModal(true);
      setGameOver(true);
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
    const isHovered = hoverPosition && hoverPosition.row === row && hoverPosition.col === col;
    const isForbidden = forbiddenPositions.some(([r, c]) => r === row && c === col);

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
        onMouseEnter={() => setHoverPosition({ row, col })}
        onMouseLeave={() => setHoverPosition(null)}
      >
        {stone && (
          <div
            className={`rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] ${
              stone === "black" ? "bg-black" : "bg-white border border-black"
            } ${isForbidden ? "ring-2 ring-red-500" : ""}`}
          >
            {isForbidden && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 w-full h-full">
                <svg viewBox="0 0 24 24" className="w-3/4 h-3/4 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </div>
            )}
          </div>
        )}
        {isHovered && !stone && (
          <div
            className={`rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] ${
              currentPlayer === "black" ? "bg-black" : "bg-white border border-black"
            } opacity-50`}
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

  const undoMove = (player) => {
    if (moveHistory.length === 0 || gameOver) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    if (lastMove.player !== player) {
      setModalMessage(t("not_your_turn"));
      setShowModal(true);
      return;
    }
    
    if (undoCount[player] > 0) {
      const newBoard = [...gameBoard];
      newBoard[lastMove.row][lastMove.col] = "";
      setGameBoard(newBoard);
      
      setMoveHistory(moveHistory.slice(0, -1));
      setCurrentPlayer(player);
      setStatus(player === "black" ? t("black_turn") : t("white_turn"));
      
      setUndoCount({
        ...undoCount,
        [player]: undoCount[player] - 1
      });
    } else {
      setModalMessage(t("no_undo_left"));
      setShowModal(true);
    }
  };

  const handleForbiddenRulesChange = (rule) => {
    setForbiddenRules((prevRules) => {
      if (rule === "noRestriction") {
        return ["noRestriction"];
      } else {
        const newRules = prevRules.filter((r) => r !== "noRestriction");
        if (newRules.includes(rule)) {
          return newRules.filter((r) => r !== rule);
        } else {
          return [...newRules, rule];
        }
      }
    });
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
          <div className="mb-4">
            <label className="text-gray-700 block mb-2">{t("forbidden_rules")}:</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forbiddenRules.includes("noRestriction")}
                  onChange={() => handleForbiddenRulesChange("noRestriction")}
                  className="mr-2"
                />
                {t("no_restriction")}
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forbiddenRules.includes("threeThree")}
                  onChange={() => handleForbiddenRulesChange("threeThree")}
                  className="mr-2"
                />
                {t("three-three")}
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forbiddenRules.includes("longConnection")}
                  onChange={() => handleForbiddenRulesChange("longConnection")}
                  className="mr-2"
                />
                {t("long_connection")}
              </label>
            </div>
          </div>
          <button
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded mb-2"
            onClick={() => undoMove("black")}
            disabled={undoCount.black === 0 || gameOver || moveHistory.length === 0}
          >
            {t("undo_black")} ({undoCount.black})
          </button>
          <button
            className="w-full px-4 py-2 bg-white text-gray-800 rounded hover:bg-gray-100 border border-gray-300 mb-2"
            onClick={() => undoMove("white")}
            disabled={undoCount.white === 0 || gameOver || moveHistory.length === 0}
          >
            {t("undo_white")} ({undoCount.white})
          </button>
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2"
            onClick={resetGame}
          >
            {t("restart_game")}
          </button>
        </div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <p>{modalMessage}</p>
      </Modal>
    </div>
  );
};

export default GomokuGame;