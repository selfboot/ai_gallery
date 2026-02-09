"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/app/i18n/client";
import {
  BOARD_COLS,
  BOARD_ROWS,
  applyMove,
  createInitialState,
  getLegalMoves,
  undoMove,
} from "./engine";
import { WukongAI } from "./ai";

const CELL_WIDTH = "w-12 sm:w-16 md:w-20 lg:w-[5.75rem]";
const CELL_HEIGHT = "h-11 sm:h-14 md:h-16 lg:h-[4.5rem]";

const toPositionKey = (row, col) => `${row}-${col}`;

const formatCoord = ({ row, col }) => `${10 - row}-${col + 1}`;

const ChineseChessBoard = () => {
  const { t } = useI18n();
  const [state, setState] = useState(createInitialState);
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [gameMode, setGameMode] = useState("pvp");
  const [playerColor, setPlayerColor] = useState("red");
  const [aiRank, setAiRank] = useState("expert");
  const [aiThinking, setAiThinking] = useState(false);
  const aiRef = useRef(null);

  const aiColor = useMemo(
    () => (playerColor === "red" ? "black" : "red"),
    [playerColor]
  );

  useEffect(() => {
    aiRef.current = new WukongAI();
    return () => {
      aiRef.current = null;
    };
  }, []);

  const legalMoveMap = useMemo(() => {
    const map = new Map();
    legalMoves.forEach((move) => {
      map.set(toPositionKey(move.row, move.col), move);
    });
    return map;
  }, [legalMoves]);

  const capturedByColor = useMemo(() => {
    return state.moveHistory.reduce(
      (acc, move) => {
        if (move.captured) {
          acc[move.captured.color].push(move.captured.label);
        }
        return acc;
      },
      { red: [], black: [] }
    );
  }, [state.moveHistory]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setLegalMoves([]);
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState());
    clearSelection();
    setAiThinking(false);
  }, [clearSelection]);

  useEffect(() => {
    resetGame();
  }, [gameMode, playerColor, resetGame]);

  const statusText = useMemo(() => {
    if (
      gameMode === "ai" &&
      aiThinking &&
      state.currentPlayer === aiColor &&
      state.gameStatus !== "checkmate" &&
      state.gameStatus !== "stalemate"
    ) {
      return t("ai_thinking");
    }
    if (state.gameStatus === "checkmate") {
      return t("checkmate_announcement", { winner: t(state.winner || "black") });
    }
    if (state.gameStatus === "stalemate") {
      return t("stalemate_announcement");
    }
    if (state.gameStatus === "check") {
      return t("player_in_check", {
        player: t(state.checkedPlayer || state.currentPlayer),
      });
    }
    return t("current_player", { player: t(state.currentPlayer) });
  }, [aiColor, aiThinking, gameMode, state.checkedPlayer, state.currentPlayer, state.gameStatus, state.winner, t]);

  const selectPiece = (row, col) => {
    setSelected({ row, col });
    setLegalMoves(getLegalMoves(state, row, col));
  };

  const handleCellClick = (row, col) => {
    if (state.gameStatus === "checkmate" || state.gameStatus === "stalemate") {
      return;
    }
    if (gameMode === "ai" && (aiThinking || state.currentPlayer !== playerColor)) {
      return;
    }

    const piece = state.board[row][col];

    if (!selected) {
      if (piece && piece.color === state.currentPlayer) {
        selectPiece(row, col);
      }
      return;
    }

    if (selected.row === row && selected.col === col) {
      clearSelection();
      return;
    }

    if (piece && piece.color === state.currentPlayer) {
      selectPiece(row, col);
      return;
    }

    const nextState = applyMove(state, selected, { row, col });
    if (nextState) {
      setState(nextState);
      clearSelection();
    }
  };

  const handleUndo = () => {
    setState((prev) => {
      let next = undoMove(prev);

      // In AI mode, undo one full round when possible.
      if (gameMode === "ai" && next.moveHistory.length > 0 && next.currentPlayer === aiColor) {
        next = undoMove(next);
      }

      return next;
    });
    clearSelection();
    setAiThinking(false);
  };

  const handleRestart = () => {
    resetGame();
  };

  useEffect(() => {
    if (gameMode !== "ai") return;
    if (state.gameStatus === "checkmate" || state.gameStatus === "stalemate") return;
    if (state.currentPlayer !== aiColor) return;
    if (!aiRef.current) return;

    setAiThinking(true);
    const snapshot = state;
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;

      let aiMove = null;
      try {
        aiMove = aiRef.current.getBestMove(snapshot, aiRank);
      } catch (error) {
        console.error("AI move failed:", error);
      }

      if (aiMove) {
        setState((prev) => {
          if (
            prev.currentPlayer !== snapshot.currentPlayer ||
            prev.moveCount !== snapshot.moveCount ||
            prev.gameStatus !== snapshot.gameStatus
          ) {
            return prev;
          }
          return applyMove(prev, aiMove.from, aiMove.to) || prev;
        });
      }

      clearSelection();
      setAiThinking(false);
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setAiThinking(false);
    };
  }, [aiColor, aiRank, clearSelection, gameMode, state]);

  const lastMove = state.moveHistory[state.moveHistory.length - 1] || null;

  return (
    <div className="container mx-auto max-w-[1600px] px-1 md:px-3">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <div className="lg:w-5/6 flex flex-col items-center">
          <div className="text-center mb-4">
            <p className="text-lg font-bold">{statusText}</p>
          </div>
          <div className="bg-[#E6B771] p-2 rounded-md shadow max-w-full overflow-auto">
            <div className="border-2 border-amber-900/70">
              {Array.from({ length: BOARD_ROWS }).map((_, row) => (
                <React.Fragment key={`row-${row}`}>
                  <div className="grid grid-cols-9">
                    {Array.from({ length: BOARD_COLS }).map((_, col) => {
                      const piece = state.board[row][col];
                      const isSelected = selected && selected.row === row && selected.col === col;
                      const moveHint = legalMoveMap.get(toPositionKey(row, col));
                      const isLastFrom =
                        lastMove && lastMove.from.row === row && lastMove.from.col === col;
                      const isLastTo = lastMove && lastMove.to.row === row && lastMove.to.col === col;

                      return (
                        <button
                          key={`cell-${row}-${col}`}
                          type="button"
                          className={`${CELL_WIDTH} ${CELL_HEIGHT} relative border border-amber-900/50 flex items-center justify-center select-none transition-colors
                          ${(row + col) % 2 === 0 ? "bg-[#f3d5a3]" : "bg-[#f7dfba]"}
                          ${isSelected ? "bg-blue-200" : ""}
                          ${!isSelected && isLastFrom ? "bg-amber-200" : ""}
                          ${!isSelected && isLastTo ? "bg-emerald-200" : ""}`}
                          onClick={() => handleCellClick(row, col)}
                        >
                          {moveHint && !piece && (
                            <span className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 bg-sky-500/75 rounded-full" />
                          )}
                          {moveHint && piece && (
                            <span className="absolute inset-1 rounded-full ring-2 ring-sky-500/70" />
                          )}
                          {piece && (
                            <span
                              className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center text-base sm:text-lg font-bold
                              ${
                                piece.color === "red"
                                  ? "bg-red-50 border-red-500 text-red-600"
                                  : "bg-gray-100 border-gray-700 text-gray-800"
                              }`}
                            >
                              {piece.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {row === 4 && (
                    <div className="grid grid-cols-9">
                      <div
                        className={`${CELL_HEIGHT} col-span-9 w-full border-x border-b border-amber-900/50 bg-[#edd3a2]
                        flex items-center justify-center text-sm sm:text-base md:text-lg font-bold`}
                      >
                        <div className="w-full flex items-center justify-center gap-10 sm:gap-16 md:gap-24 tracking-[0.2em]">
                          <span>楚河</span>
                          <span>汉界</span>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:w-1/6 mt-8 lg:mt-0">
          <h2 className="text-xl font-bold mb-4">{t("settings")}</h2>
          <div className="mb-4 flex items-center">
            <label className="text-gray-700 mr-2">{t("game_mode")} :</label>
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value)}
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
                  onChange={(e) => setPlayerColor(e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="red">{t("red")}</option>
                  <option value="black">{t("black")}</option>
                </select>
              </div>
              <div className="mb-4 flex items-center">
                <label className="text-gray-700 mr-2">{t("ai_rank")} :</label>
                <select
                  value={aiRank}
                  onChange={(e) => setAiRank(e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="novice">{t("rank_novice")}</option>
                  <option value="expert">{t("rank_expert")}</option>
                  <option value="master">{t("rank_master")}</option>
                </select>
              </div>
            </>
          )}
          <div className="rounded-md border border-gray-200 bg-white p-3 mb-4">
            <p className="font-semibold">{statusText}</p>
            <p className="text-sm text-gray-600 mt-1">
              {t("move_steps", { steps: state.moveCount })}
            </p>
          </div>
          <button
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded mb-2 disabled:bg-gray-400"
            onClick={handleUndo}
            disabled={state.moveHistory.length === 0 || aiThinking}
          >
            {t("undo_move")}
          </button>
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
            onClick={handleRestart}
          >
            {t("restart_game")}
          </button>
          <div className="rounded-md border border-gray-200 bg-white p-3 mb-4">
            <p className="font-semibold mb-2">{t("captured_pieces")}</p>
            <p className="text-sm mb-1">
              {t("red")}：{capturedByColor.red.length > 0 ? capturedByColor.red.join(" ") : "-"}
            </p>
            <p className="text-sm">
              {t("black")}：{capturedByColor.black.length > 0 ? capturedByColor.black.join(" ") : "-"}
            </p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="font-semibold mb-2">{t("move_history")}</p>
            {state.moveHistory.length === 0 ? (
              <p className="text-sm text-gray-500">{t("chess_no_moves")}</p>
            ) : (
              <ol className="space-y-1 text-sm max-h-56 overflow-y-auto pr-1">
                {state.moveHistory.map((move, index) => (
                  <li key={`move-${index}`}>
                    {index + 1}. {move.piece.label} {formatCoord(move.from)}→{formatCoord(move.to)}
                    {move.captured ? ` x${move.captured.label}` : ""}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChineseChessBoard;
