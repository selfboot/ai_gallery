"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";
import { checkWin, checkDoubleThree, checkOverline, checkDoubleFours, boardSize } from "./move";
import GomokuAI from "./ai";

const GomokuGame = () => {
  const { t } = useI18n();
  const [gameBoard, setGameBoard] = useState(() =>
    Array(boardSize)
      .fill()
      .map(() => Array(boardSize).fill(""))
  );
  const [currentPlayer, setCurrentPlayer] = useState("black");
  const [gameOver, setGameOver] = useState(false);
  const [playerColor, setPlayerColor] = useState("black");
  const [hoverPosition, setHoverPosition] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [undoCount, setUndoCount] = useState({ black: 3, white: 3 });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [forbiddenPositions, setForbiddenPositions] = useState([]);
  const [forbiddenRules, setForbiddenRules] = useState(["noRestriction"]);
  const [showMoveNumbers, setShowMoveNumbers] = useState(false);
  const [ai] = useState(new GomokuAI(2));
  const [gameMode, setGameMode] = useState("pve");
  const [aiWorker, setAiWorker] = useState(null);

  const resetGame = useCallback(() => {
    // 先重置所有状态
    const resetStates = () => {
      setGameBoard(
        Array(boardSize)
          .fill()
          .map(() => Array(boardSize).fill(""))
      );
      setCurrentPlayer("black");
      setGameOver(false);
      setMoveHistory([]);
      setUndoCount({ black: 3, white: 3 });
      setForbiddenPositions([]);
    };

    // 如果是人机模式且玩家执白，先重置状态后再让 AI 下棋
    if (gameMode === "pve" && playerColor === "white") {
      resetStates();
      // 使用 requestAnimationFrame 确保状态更新后再执行 AI 落子
      requestAnimationFrame(() => {
        handleAIFirstMove();
      });
    } else {
      resetStates();
    }
  }, [t, boardSize, gameMode, playerColor]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const handlePlayerColorChange = (e) => {
    const newColor = e.target.value;
    setPlayerColor(newColor);

    if (newColor === "white" && moveHistory.length === 0) {
      handleAIFirstMove();
    }
  };

  const handleAIFirstMove = () => {
    const centerRow = 7;
    const centerCol = 7;

    setGameBoard((prev) => {
      const newBoard = prev.map((row) => [...row]);
      newBoard[centerRow][centerCol] = "black";
      return newBoard;
    });

    setMoveHistory([{ row: centerRow, col: centerCol, player: "black" }]);
    setCurrentPlayer("white");
  };

  const handleGameModeChange = (e) => {
    const newMode = e.target.value;
    setGameMode(newMode);

    if (newMode === "pve" && playerColor === "white") {
      resetGame();
    }
  };

  useEffect(() => {
    if (gameMode === "pve" && playerColor === "white" && moveHistory.length === 0) {
      handleAIFirstMove();
    }
  }, [gameMode, playerColor]);

  // 检查禁手规则的辅助函数
  const checkForbiddenMoves = (board, row, col, player) => {
    if (player === "black" && forbiddenRules.length > 0 && !forbiddenRules.includes("noRestriction")) {
      // 三三禁手
      if (forbiddenRules.includes("threeThree")) {
        const { isForbidden, forbiddenPositions } = checkDoubleThree(board, row, col, player);
        if (isForbidden) {
          setForbiddenPositions(forbiddenPositions);
          setModalMessage(t("three_three_forbidden", { player: t(player) }));
          setShowModal(true);
          setGameOver(true);
          return true;
        }
      }

      // 长连禁手
      if (forbiddenRules.includes("longConnection")) {
        const overlines = checkOverline(board, row, col, player);
        if (overlines.length > 0) {
          setForbiddenPositions(overlines.flat());
          setModalMessage(t("long_connection_forbidden", { player: t(player) }));
          setShowModal(true);
          setGameOver(true);
          return true;
        }
      }

      // 四四禁手
      if (forbiddenRules.includes("fourFour")) {
        const { isDoubleFour, forbiddenPositions } = checkDoubleFours(board, row, col, player);
        if (isDoubleFour) {
          setForbiddenPositions(forbiddenPositions);
          setModalMessage(t("four_four_forbidden", { player: t(player) }));
          setShowModal(true);
          setGameOver(true);
          return true;
        }
      }
    }
    return false;
  };

  const checkWinCondition = (board, row, col, player) => {
    const { hasWin } = checkWin(board, row, col, player);
    if (hasWin) {
      const winMessage = player === "black" ? t("black_win") : t("white_win");
      setModalMessage(winMessage);
      setShowModal(true);
      setGameOver(true);
      return true;
    }
    return false;
  };

  const AI_THINKING_TIME = 1000;

  useEffect(() => {
    const worker = new Worker(
      new URL('./aiWorker.js', import.meta.url), 
      { type: 'module' }
    );
    setAiWorker(worker);

    return () => worker.terminate();
  }, []);

  const handleAIMove = (board, aiPlayer) => {
    if (!aiWorker) return;
    setCurrentPlayer(aiPlayer);

    const makeAIMove = async () => {
      // 通过 Promise 包装 worker 的消息处理
      const getAIMove = () =>
        new Promise((resolve) => {
          aiWorker.onmessage = (e) => {
            resolve(e.data);
          };
          aiWorker.postMessage({
            board: board,
            isBlack: aiPlayer === "black",
          });
        });

      const [{ row: aiRow, col: aiCol }, _] = await Promise.all([
        getAIMove(),
        new Promise((resolve) => setTimeout(resolve, AI_THINKING_TIME)),
      ]);

      if (aiRow === null || aiCol === null) return;

      const aiBoard = [...board];
      aiBoard[aiRow][aiCol] = aiPlayer;

      setGameBoard(aiBoard);
      setMoveHistory((prev) => [...prev, { row: aiRow, col: aiCol, player: aiPlayer }]);

      if (!checkWinCondition(aiBoard, aiRow, aiCol, aiPlayer)) {
        setCurrentPlayer(aiPlayer === "black" ? "white" : "black");
      }
    };

    makeAIMove().catch((error) => {
      console.error("AI move error:", error);
    });
  };

  const placePiece = (row, col) => {
    if (gameBoard[row][col] !== "" || gameOver) return;

    // Check if it's the player's turn in pve mode
    if (gameMode === "pve" && currentPlayer !== playerColor) {
      return;
    }

    const newBoard = [...gameBoard];
    newBoard[row][col] = currentPlayer;

    setGameBoard(newBoard);
    setMoveHistory([...moveHistory, { row, col, player: currentPlayer }]);
    setForbiddenPositions([]);

    const nextPlayer = currentPlayer === "black" ? "white" : "black";
    setCurrentPlayer(nextPlayer);

    if (checkForbiddenMoves(newBoard, row, col, currentPlayer)) {
      return;
    }

    if (checkWinCondition(newBoard, row, col, currentPlayer)) {
      return;
    }

    // 如果是人机模式且下一步是 AI 的回合
    if (gameMode === "pve" && !gameOver && nextPlayer !== playerColor) {
      handleAIMove(newBoard, nextPlayer);
    }
  };

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
          left: `${((col + 1) * 100) / 16}%`,
          top: `${((row + 1) * 100) / 16}%`,
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
            {showMoveNumbers && moveNumber > 0 && (
              <span
                className={`absolute inset-0 flex items-center justify-center text-xs font-bold
                ${stone === "black" ? "text-white" : "text-black"}`}
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
        <button className="w-full h-full opacity-0" onClick={() => placePiece(row, col)} />
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

      setUndoCount({
        ...undoCount,
        [player]: undoCount[player] - 1,
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

  // 添加获取状态文本的函数
  const getStatusText = () => {
    if (gameOver) return t("game_over");
    if (gameMode === "pve") {
      return currentPlayer === playerColor ? t("player_turn") : t("ai_turn");
    } else {
      return currentPlayer === "black" ? t("black_turn") : t("white_turn");
    }
  };

  return (
    <div className="container mx-auto">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <div className="lg:w-4/5 flex flex-col items-center">
          <div className="text-center mb-4">
            <p className="text-lg font-bold">{getStatusText()}</p>
          </div>
          <div className="bg-[#E6B771] p-1 max-w-full overflow-auto relative w-[350px] md:w-[500px] lg:w-[600px] aspect-square">
            <div className="relative w-full h-full">
              {/* 横线 */}
              {[...Array(15)].map((_, i) => (
                <div
                  key={`h${i}`}
                  className="absolute bg-black"
                  style={{
                    left: `${100 / 16}%`,
                    top: `${((i + 1) * 100) / 16}%`,
                    width: `${(100 * 14) / 16}%`,
                    height: "1px",
                  }}
                />
              ))}
              {/* 竖线 */}
              {[...Array(15)].map((_, i) => (
                <div
                  key={`v${i}`}
                  className="absolute bg-black"
                  style={{
                    top: `${100 / 16}%`,
                    left: `${((i + 1) * 100) / 16}%`,
                    width: "1px",
                    height: `${(100 * 14) / 16}%`,
                  }}
                />
              ))}
              {gameBoard.map((row, rowIndex) => row.map((_, colIndex) => renderIntersection(rowIndex, colIndex)))}
            </div>
          </div>
        </div>
        <div className="lg:w-1/5 mt-8 lg:mt-0">
          <h2 className="text-xl font-bold mb-4">{t("settings")}</h2>
          {/* 游戏模式选择 */}
          <div className="mb-4 flex items-center">
            <label className="text-gray-700 mr-2">{t("game_mode")} :</label>
            <select
              value={gameMode}
              onChange={handleGameModeChange}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pvp">{t("pvp_mode")}</option>
              <option value="pve">{t("pve_mode")}</option>
            </select>
          </div>

          {/* 玩家颜色选择 */}
          {gameMode === "pve" && (
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
                onChange={() => setShowMoveNumbers(!showMoveNumbers)}
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
