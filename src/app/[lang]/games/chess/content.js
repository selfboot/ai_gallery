"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/app/i18n/client";

class ChineseChess {
  constructor() {
    this.resetGame();
  }

  initializeBoard() {
    let board = Array(10)
      .fill()
      .map(() => Array(9).fill(null));

    // Initialize black pieces
    board[0][0] = board[0][8] = { type: "车", color: "black" };
    board[0][1] = board[0][7] = { type: "马", color: "black" };
    board[0][2] = board[0][6] = { type: "象", color: "black" };
    board[0][3] = board[0][5] = { type: "士", color: "black" };
    board[0][4] = { type: "将", color: "black" };
    board[2][1] = board[2][7] = { type: "炮", color: "black" };
    board[3][0] =
      board[3][2] =
      board[3][4] =
      board[3][6] =
      board[3][8] =
        { type: "卒", color: "black" };

    // Initialize red pieces
    board[9][0] = board[9][8] = { type: "車", color: "red" };
    board[9][1] = board[9][7] = { type: "馬", color: "red" };
    board[9][2] = board[9][6] = { type: "相", color: "red" };
    board[9][3] = board[9][5] = { type: "仕", color: "red" };
    board[9][4] = { type: "帥", color: "red" };
    board[7][1] = board[7][7] = { type: "炮", color: "red" };
    board[6][0] =
      board[6][2] =
      board[6][4] =
      board[6][6] =
      board[6][8] =
        { type: "兵", color: "red" };

    return board;
  }

  resetGame() {
    this.board = this.initializeBoard();
    this.selectedPiece = null;
    this.currentPlayer = "red";
    this.gameStatus = "playing";
    this.moveHistory = [];
    this.moveCount = 0;
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === "red" ? "black" : "red";
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    // console.log(fromRow, fromCol, toRow, toCol);
    if (!this.isValidMove(fromRow, fromCol, toRow, toCol, true)) {
      return false;
    }
    const moveDetails = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: this.board[fromRow][fromCol],
      captured: this.board[toRow][toCol],
    };

    this.doMovePiece(fromRow, fromCol, toRow, toCol);
    this.moveHistory.push(moveDetails);
    this.moveCount++;
    this.selectedPiece = null;
    this.switchPlayer();
    this.checkGameStatus();
    return true;
  }

  undoMove() {
    if (this.moveHistory.length === 0) return;
    const lastMove = this.moveHistory.pop();
    this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
    this.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;

    this.switchPlayer();
    this.moveCount--;
    this.gameStatus = "playing";
    return true;
  }

  checkGameStatus() {
    if (this.isCheckmate(this.currentPlayer)) {
      this.gameStatus = "checkmate";
    } else if (this.isCheck(this.board, this.currentPlayer)) {
      this.gameStatus = "check";
    } else if (this.isStalemate(this.currentPlayer)) {
      this.gameStatus = "stalemate";
    } else {
      this.gameStatus = "playing";
    }
  }

  isValidMove(fromRow, fromCol, toRow, toCol, checkForCheck = false) {
    if (!this.board[fromRow] || !this.board[toRow]) {
      console.error("Invalid row index");
      return false;
    }

    const piece = this.board[fromRow][fromCol];
    if (!piece) return false;

    // Can't capture your own pieces
    if (
      this.board[toRow][toCol] &&
      this.board[toRow][toCol].color === piece.color
    )
      return false;

    let isValid = false;

    switch (piece.type) {
      case "車":
      case "车":
        isValid = this.isValidChariotMove(fromRow, fromCol, toRow, toCol);
        break;
      case "马":
      case "馬":
        isValid = this.isValidHorseMove(fromRow, fromCol, toRow, toCol);
        break;
      case "象":
      case "相":
        isValid = this.isValidElephantMove(fromRow, fromCol, toRow, toCol);
        break;
      case "士":
      case "仕":
        isValid = this.isValidAdvisorMove(fromRow, fromCol, toRow, toCol);
        break;
      case "将":
      case "帥":
        isValid = this.isValidGeneralMove(fromRow, fromCol, toRow, toCol);
        break;
      case "炮":
        isValid = this.isValidCannonMove(fromRow, fromCol, toRow, toCol);
        break;
      case "卒":
      case "兵":
        isValid = this.isValidPawnMove(fromRow, fromCol, toRow, toCol);
        break;
      default:
        isValid = false;
    }

    if (isValid && checkForCheck) {
      // Check if the move puts or leaves the player in check
      const newBoard = this.tryMovePiece(
        this.board,
        fromRow,
        fromCol,
        toRow,
        toCol
      );

      if (this.isCheck(newBoard, piece.color)) {
        isValid = false;
      }
    }

    return isValid;
  }

  isCheck(board, player) {
    const oppositeColor = player === "red" ? "black" : "red";
    let generalPosition;

    // Find the general's position
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        if (
          board[i][j] &&
          board[i][j].type === (player === "red" ? "帥" : "将") &&
          board[i][j].color === player
        ) {
          generalPosition = { row: i, col: j };
          break;
        }
      }
      if (generalPosition) break;
    }

    // Check if any opponent's piece can capture the general
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[i][j] && board[i][j].color === oppositeColor) {
          if (
            this.isValidMove(
              i,
              j,
              generalPosition.row,
              generalPosition.col,
              false
            )
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  tryMovePiece(board, fromRow, fromCol, toRow, toCol) {
    const newBoard = board.map((row) => [...row]);
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = null;
    return newBoard;
  }

  doMovePiece(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
  }

  isValidChariotMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;

    const rowStep =
      fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colStep =
      fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);

    for (
      let i = 1;
      i < Math.max(Math.abs(toRow - fromRow), Math.abs(toCol - fromCol));
      i++
    ) {
      if (this.board[fromRow + i * rowStep][fromCol + i * colStep])
        return false;
    }

    return true;
  }

  isValidHorseMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
      // Check if the horse is not blocked
      if (rowDiff === 2) {
        return !this.board[fromRow + (toRow - fromRow) / 2][fromCol];
      } else {
        return !this.board[fromRow][fromCol + (toCol - fromCol) / 2];
      }
    }

    return false;
  }

  isValidElephantMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if (rowDiff === 2 && colDiff === 2) {
      // Check if the elephant is not blocked
      const midRow = (fromRow + toRow) / 2;
      const midCol = (fromCol + toCol) / 2;
      if (!this.board[midRow][midCol]) {
        // Check if the elephant stays on its side of the river
        return (
          (this.board[fromRow][fromCol].color === "red" && toRow > 4) ||
          (this.board[fromRow][fromCol].color === "black" && toRow < 5)
        );
      }
    }

    return false;
  }

  isValidAdvisorMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if (rowDiff === 1 && colDiff === 1) {
      // Check if the advisor stays in the palace
      return this.isInPalace(toRow, toCol, this.board[fromRow][fromCol].color);
    }

    return false;
  }

  isValidGeneralMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
      // Check if the general stays in the palace
      return this.isInPalace(toRow, toCol, this.board[fromRow][fromCol].color);
    }

    return false;
  }

  isValidCannonMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;

    const rowStep =
      fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colStep =
      fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);

    let piecesBetween = 0;
    for (
      let i = 1;
      i < Math.max(Math.abs(toRow - fromRow), Math.abs(toCol - fromCol));
      i++
    ) {
      if (this.board[fromRow + i * rowStep][fromCol + i * colStep])
        piecesBetween++;
    }

    if (this.board[toRow][toCol]) {
      // Capturing
      return piecesBetween === 1;
    } else {
      // Moving
      return piecesBetween === 0;
    }
  }

  isValidPawnMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);

    if (this.board[fromRow][fromCol].color === "red") {
      if (fromRow > 4) {
        // Haven't crossed the river
        return rowDiff === -1 && colDiff === 0;
      } else {
        // Crossed the river
        return (
          (rowDiff === -1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)
        );
      }
    } else {
      if (fromRow < 5) {
        // Haven't crossed the river
        return rowDiff === 1 && colDiff === 0;
      } else {
        // Crossed the river
        return (
          (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)
        );
      }
    }
  }

  isInPalace(row, col, color) {
    if (color === "red") {
      return row >= 7 && row <= 9 && col >= 3 && col <= 5;
    } else {
      return row >= 0 && row <= 2 && col >= 3 && col <= 5;
    }
  }

  isCheckmate(player) {
    if (!this.isCheck(this.board, player)) return false;

    // Try all possible moves for the player
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.board[i][j] && this.board[i][j].color === player) {
          for (let k = 0; k < 10; k++) {
            for (let l = 0; l < 9; l++) {
              if (this.isValidMove(i, j, k, l, true)) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  }

  isStalemate(player) {
    if (this.isCheck(this.board, player)) return false;

    // Check if the player has any legal moves
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.board[i][j] && this.board[i][j].color === player) {
          for (let k = 0; k < 10; k++) {
            for (let l = 0; l < 9; l++) {
              if (this.isValidMove(i, j, k, l, true)) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  }
}

const ChineseChessBoard = () => {
  const [chess] = useState(new ChineseChess());
  const [refresh, setRefresh] = useState(false); // 用于触发重渲染
  const { t } = useI18n();
  const translatePlayer = (player) => {
    return t(player); // 'red' 和 'black' 的翻译应该在翻译文件中定义
  };

  useEffect(() => {
    setRefresh((r) => !r); // 当棋局状态变化时触发重渲染
  }, [chess.gameStatus, chess.currentPlayer]);

  function undoMove() {
    if (chess.undoMove()) {
      setRefresh(!refresh); // 触发组件重渲染以更新界面
    }
  }

  function restartGame() {
    chess.resetGame();
    setRefresh(!refresh);
  }

  const handleClick = useCallback(
    (row, col) => {
      if (chess.gameStatus !== "playing" && chess.gameStatus !== "check")
        return;

      if (chess.selectedPiece) {
        if (
          chess.makeMove(
            chess.selectedPiece.row,
            chess.selectedPiece.col,
            row,
            col
          )
        ) {
          setRefresh((r) => !r); // 成功移动后触发重渲染
        }
        chess.selectedPiece = null; // 清除选中的棋子
      } else if (
        chess.board[row][col] &&
        chess.board[row][col].color === chess.currentPlayer
      ) {
        chess.selectedPiece = { row, col }; // 选择棋子
        setRefresh((r) => !r);
      }
    },
    [chess]
  );

  return (
    <div className="flex flex-col items-center bg-gray-100 p-4">
      <div className="text-lg mb-4 font-bold">
        {chess.gameStatus === "playing" &&
          t("current_player", {
            player: translatePlayer(chess.currentPlayer),
          })}
        {chess.gameStatus === "check" &&
          t("player_in_check", {
            player: translatePlayer(chess.currentPlayer),
          })}
        {chess.gameStatus === "checkmate" &&
          t("checkmate_announcement", {
            winner: translatePlayer(
              chess.currentPlayer === "red" ? "black" : "red"
            ),
          })}
        {chess.gameStatus === "stalemate" && t("stalemate_announcement")}
      </div>
      <div className="flex flex-col border-2 border-black mb-4">
        {[...Array(11)].map((_, rowIndex) => (
          <div key={rowIndex} className="flex">
            {rowIndex === 5 ? (
              <div className="w-full h-16 bg-yellow-100 flex items-center justify-center text-2xl font-bold">
                楚河&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;汉界
              </div>
            ) : (
              [...Array(9)].map((_, colIndex) => {
                const piece =
                  rowIndex < 5
                    ? chess.board[rowIndex][colIndex]
                    : chess.board[rowIndex - 1][colIndex];
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-16 h-16 border border-black flex justify-center items-center
                                             ${
                                               (rowIndex + colIndex) % 2 === 0
                                                 ? "bg-yellow-200"
                                                 : "bg-yellow-100"
                                             }
                                             ${
                                               chess.selectedPiece &&
                                               chess.selectedPiece.row ===
                                                 (rowIndex < 5
                                                   ? rowIndex
                                                   : rowIndex - 1) &&
                                               chess.selectedPiece.col ===
                                                 colIndex
                                                 ? "bg-blue-300"
                                                 : ""
                                             }
                                         `}
                    onClick={() =>
                      handleClick(
                        rowIndex < 5 ? rowIndex : rowIndex - 1,
                        colIndex
                      )
                    }
                  >
                    {piece && (
                      <div
                        className={`w-14 h-14 rounded-full flex justify-center items-center text-2xl font-bold
                                                ${
                                                  piece.color === "red"
                                                    ? "bg-red-500 text-white"
                                                    : "bg-black text-white"
                                                }`}
                      >
                        {piece.type}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
      <div className="flex space-x-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={undoMove}
          disabled={chess.moveHistory.length === 0}
        >
          {t("undo_move")}
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={restartGame}
        >
          {t("restart_game")}
        </button>
      </div>
      <div className="mt-4">{t("move_steps", { steps: chess.moveCount })}</div>
    </div>
  );
};

export default ChineseChessBoard;
