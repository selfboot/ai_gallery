"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";
import { checkWin, checkDoubleThree, checkOverline, checkDoubleFours, boardSize } from "./move";
import { getAIMove } from "./ai";

const createEmptyBoard = () => Array.from({ length: boardSize }, () => Array(boardSize).fill(""));

const GomokuGame = () => {
  const { t } = useI18n();
  const [gameBoard, setGameBoard] = useState(createEmptyBoard);
  const [currentPlayer, setCurrentPlayer] = useState("black");
  const [status, setStatus] = useState(() => t("black_turn"));
  const [gameOver, setGameOver] = useState(false);
  const [playerColor, setPlayerColor] = useState("black");
  const [gameMode, setGameMode] = useState("ai");
  const [aiRank, setAiRank] = useState("expert");
  const [aiThinking, setAiThinking] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [undoCount, setUndoCount] = useState({ black: 3, white: 3 });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [forbiddenPositions, setForbiddenPositions] = useState([]);
  const [forbiddenRules, setForbiddenRules] = useState(["noRestriction"]);
  const [showMoveNumbers, setShowMoveNumbers] = useState(false);

  const aiColor = playerColor === "black" ? "white" : "black";
  const hasForbiddenRules =
    forbiddenRules.length > 0 && !forbiddenRules.includes("noRestriction");

  const resetGame = useCallback(() => {
    setGameBoard(createEmptyBoard());
    setCurrentPlayer("black");
    setStatus(
      gameMode === "ai" && playerColor !== "black" ? t("ai_thinking") : t("black_turn")
    );
    setGameOver(false);
    setMoveHistory([]);
    setUndoCount({ black: 3, white: 3 });
    setForbiddenPositions([]);
    setHoverPosition(null);
    setAiThinking(false);
    setShowModal(false);
    setModalMessage("");
  }, [gameMode, playerColor, t]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const handlePlayerColorChange = (e) => {
    setPlayerColor(e.target.value);
  };

  const handleGameModeChange = (e) => {
    const nextMode = e.target.value;
    setGameMode(nextMode);
    if (nextMode !== "ai") {
      setAiThinking(false);
    }
  };

  const handleRankChange = (e) => {
    setAiRank(e.target.value);
  };

  const placePiece = useCallback((row, col) => {
    if (gameOver || gameBoard[row][col] !== "") return;

    const activePlayer = currentPlayer;
    const updatedBoard = gameBoard.map((boardRow) => [...boardRow]);
    updatedBoard[row][col] = activePlayer;

    if (activePlayer === playerColor && hasForbiddenRules) {
      if (forbiddenRules.includes("threeThree")) {
        const { isForbidden, forbiddenPositions } = checkDoubleThree(
          updatedBoard,
          row,
          col,
          activePlayer
        );
        if (isForbidden) {
          setForbiddenPositions(forbiddenPositions);
          setModalMessage(t("three_three_forbidden", { player: t(activePlayer) }));
          setShowModal(true);
          setGameOver(true);
          return;
        }
      }

      if (forbiddenRules.includes("longConnection")) {
        const overlines = checkOverline(updatedBoard, row, col, activePlayer);
        if (overlines.length > 0) {
          setForbiddenPositions(overlines.flat());
          setModalMessage(t("long_connection_forbidden", { player: t(activePlayer) }));
          setShowModal(true);
          setGameOver(true);
          return;
        }
      }

      if (forbiddenRules.includes("fourFour")) {
        const { isDoubleFour, forbiddenPositions } = checkDoubleFours(
          updatedBoard,
          row,
          col,
          activePlayer
        );
        if (isDoubleFour) {
          setForbiddenPositions(forbiddenPositions);
          setModalMessage(t("four_four_forbidden", { player: t(activePlayer) }));
          setShowModal(true);
          setGameOver(true);
          return;
        }
      }
    }

    setGameBoard(updatedBoard);
    setMoveHistory((prev) => [...prev, { row, col, player: activePlayer }]);
    setForbiddenPositions([]);
    setHoverPosition(null);

    if (checkWin(updatedBoard, row, col, activePlayer)) {
      const winMessage = activePlayer === "black" ? t("black_win") : t("white_win");
      setModalMessage(winMessage);
      setShowModal(true);
      setGameOver(true);
    } else {
      const nextPlayer = activePlayer === "black" ? "white" : "black";
      setCurrentPlayer(nextPlayer);
      if (gameMode === "ai" && nextPlayer !== playerColor) {
        setStatus(t("ai_thinking"));
        setAiThinking(false);
      } else {
        setStatus(nextPlayer === "black" ? t("black_turn") : t("white_turn"));
      }
    }
  }, [currentPlayer, forbiddenRules, gameBoard, gameMode, gameOver, hasForbiddenRules, playerColor, t]);

  useEffect(() => {
    if (gameMode !== "ai" || gameOver || currentPlayer !== aiColor) {
      return;
    }

    setAiThinking(true);
    setStatus(t("ai_thinking"));

    const boardCopy = gameBoard.map((row) => [...row]);
    const timer = setTimeout(() => {
      const move = getAIMove(boardCopy, aiColor, {
        forbiddenRules,
        enforceForbiddenFor: "black",
        rank: aiRank,
      });

      setAiThinking(false);
      if (move) {
        placePiece(move.row, move.col);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [aiColor, aiRank, currentPlayer, gameBoard, gameMode, gameOver, forbiddenRules, placePiece, t]);

  useEffect(() => {
    if (!aiThinking) return;
    if (gameMode !== "ai" || gameOver || currentPlayer === playerColor) {
      setAiThinking(false);
    }
  }, [aiThinking, currentPlayer, gameMode, gameOver, playerColor]);

  const renderIntersection = (row, col) => {
    const stone = gameBoard[row][col];
    const isSpecialPoint =
      (row === 3 && col === 3) ||
      (row === 3 && col === 11) ||
      (row === 7 && col === 7) ||
      (row === 11 && col === 3) ||
      (row === 11 && col === 11);
    const isHovered = hoverPosition && hoverPosition.row === row && hoverPosition.col === col;
    const isForbidden = forbiddenPositions.some(([r, c]) => r === row && c === col);
    const moveNumber = showMoveNumbers
      ? moveHistory.findIndex((move) => move.row === row && move.col === col) + 1
      : null;

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
        onMouseEnter={() => {
          if (gameMode === "ai" && (aiThinking || currentPlayer !== playerColor)) return;
          setHoverPosition({ row, col });
        }}
        onMouseLeave={() => setHoverPosition(null)}
      >
        {stone && (
          <div
            className={`rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] ${
              stone === "black" ? "bg-black" : "bg-white border border-black"
            } ${isForbidden ? "ring-2 ring-red-500" : ""}`}
          >
            {showMoveNumbers && moveNumber > 0 && (
              <span
                className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                  stone === "black" ? "text-white" : "text-black"
                }`}
              >
                {moveNumber}
              </span>
            )}
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
          <div className="bg-black rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%]" />
        )}
        <button
          className="w-full h-full opacity-0"
          onClick={() => {
            if (gameMode === "ai" && (aiThinking || currentPlayer !== playerColor)) return;
            placePiece(row, col);
          }}
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
      const updatedBoard = gameBoard.map((row) => [...row]);
      updatedBoard[lastMove.row][lastMove.col] = "";
      setGameBoard(updatedBoard);
      setMoveHistory((prev) => prev.slice(0, -1));
      setCurrentPlayer(player);
      setForbiddenPositions([]);
      setGameOver(false);

      const nextStatus =
        gameMode === "ai" && player !== playerColor
          ? t("ai_thinking")
          : player === "black"
          ? t("black_turn")
          : t("white_turn");
      setStatus(nextStatus);

      setUndoCount((prev) => ({
        ...prev,
        [player]: prev[player] - 1,
      }));
    } else {
      setModalMessage(t("no_undo_left"));
      setShowModal(true);
    }
  };

  const handleForbiddenRulesChange = (rule) => {
    setForbiddenRules((prevRules) => {
      if (rule === "noRestriction") {
        return ["noRestriction"];
      }

      const withoutNoRestriction = prevRules.filter((r) => r !== "noRestriction");
      if (withoutNoRestriction.includes(rule)) {
        return withoutNoRestriction.filter((r) => r !== rule);
      }
      return [...withoutNoRestriction, rule];
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
              {[...Array(15)].map((_, i) => (
                <div
                  key={`h${i}`}
                  className="absolute bg-black"
                  style={{
                    left: `${100 / 16}%`,
                    top: `${(i + 1) * 100 / 16}%`,
                    width: `${(100 * 14) / 16}%`,
                    height: "1px",
                  }}
                />
              ))}
              {[...Array(15)].map((_, i) => (
                <div
                  key={`v${i}`}
                  className="absolute bg-black"
                  style={{
                    top: `${100 / 16}%`,
                    left: `${(i + 1) * 100 / 16}%`,
                    width: "1px",
                    height: `${(100 * 14) / 16}%`,
                  }}
                />
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
            <label className="text-gray-700 mr-2">{t("game_mode")} :</label>
            <select
              value={gameMode}
              onChange={handleGameModeChange}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pvp">{t("mode_local")}</option>
              <option value="ai">{t("mode_ai")}</option>
            </select>
          </div>
          {gameMode === "ai" && (
            <>
              <div className="mb-4 flex items-center">
                <label className="text-gray-700 mr-2">{t("player_color")} :</label>
                <select
                  value={playerColor}
                  onChange={handlePlayerColorChange}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="black">{t("black")}</option>
                  <option value="white">{t("white")}</option>
                </select>
              </div>
              <div className="mb-4 flex items-center">
                <label className="text-gray-700 mr-2">{t("ai_rank")} :</label>
                <select
                  value={aiRank}
                  onChange={handleRankChange}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="novice">{t("rank_novice")}</option>
                  <option value="expert">{t("rank_expert")}</option>
                  <option value="master">{t("rank_master")}</option>
                </select>
              </div>
            </>
          )}
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
                {t("three_three")}
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
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forbiddenRules.includes("fourFour")}
                  onChange={() => handleForbiddenRulesChange("fourFour")}
                  className="mr-2"
                />
                {t("four_four")}
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
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showMoveNumbers}
                onChange={() => setShowMoveNumbers((prev) => !prev)}
                className="mr-2"
              />
              {t("show_move_numbers")}
            </label>
          </div>
        </div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        {modalMessage}
      </Modal>
    </div>
  );
};

export default GomokuGame;
