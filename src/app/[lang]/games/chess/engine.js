export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;

const PIECE_LABELS = {
  red: {
    rook: "車",
    horse: "馬",
    elephant: "相",
    advisor: "仕",
    general: "帥",
    cannon: "炮",
    pawn: "兵",
  },
  black: {
    rook: "车",
    horse: "马",
    elephant: "象",
    advisor: "士",
    general: "将",
    cannon: "炮",
    pawn: "卒",
  },
};

const OPPONENT = {
  red: "black",
  black: "red",
};

const GAME_ENDED_STATUS = new Set(["checkmate", "stalemate"]);

export const createEmptyBoard = () =>
  Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));

export const createPiece = (role, color) => ({
  role,
  color,
  label: PIECE_LABELS[color][role],
});

const cloneBoard = (board) => board.map((row) => [...row]);

const isInsideBoard = (row, col) =>
  row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;

const isInsidePalace = (row, col, color) => {
  if (col < 3 || col > 5) return false;
  if (color === "red") return row >= 7 && row <= 9;
  return row >= 0 && row <= 2;
};

const hasCrossedRiver = (row, color) => {
  if (color === "red") return row <= 4;
  return row >= 5;
};

const countPiecesBetween = (board, from, to) => {
  if (from.row !== to.row && from.col !== to.col) return -1;

  let count = 0;
  if (from.row === to.row) {
    const step = to.col > from.col ? 1 : -1;
    for (let col = from.col + step; col !== to.col; col += step) {
      if (board[from.row][col]) count++;
    }
    return count;
  }

  const step = to.row > from.row ? 1 : -1;
  for (let row = from.row + step; row !== to.row; row += step) {
    if (board[row][from.col]) count++;
  }
  return count;
};

const applyBoardMove = (board, from, to) => {
  const next = cloneBoard(board);
  next[to.row][to.col] = next[from.row][from.col];
  next[from.row][from.col] = null;
  return next;
};

const findGeneral = (board, color) => {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color && piece.role === "general") {
        return { row, col };
      }
    }
  }
  return null;
};

const canPieceMove = (board, piece, from, to) => {
  if (!isInsideBoard(from.row, from.col) || !isInsideBoard(to.row, to.col)) {
    return false;
  }
  if (from.row === to.row && from.col === to.col) return false;

  const target = board[to.row][to.col];
  if (target && target.color === piece.color) return false;

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;
  const absRowDiff = Math.abs(rowDiff);
  const absColDiff = Math.abs(colDiff);

  switch (piece.role) {
    case "rook": {
      if (from.row !== to.row && from.col !== to.col) return false;
      return countPiecesBetween(board, from, to) === 0;
    }
    case "horse": {
      if (!((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2))) {
        return false;
      }
      if (absRowDiff === 2) {
        return !board[from.row + rowDiff / 2][from.col];
      }
      return !board[from.row][from.col + colDiff / 2];
    }
    case "elephant": {
      if (absRowDiff !== 2 || absColDiff !== 2) return false;
      if (piece.color === "red" && to.row < 5) return false;
      if (piece.color === "black" && to.row > 4) return false;
      return !board[from.row + rowDiff / 2][from.col + colDiff / 2];
    }
    case "advisor": {
      if (absRowDiff !== 1 || absColDiff !== 1) return false;
      return isInsidePalace(to.row, to.col, piece.color);
    }
    case "general": {
      if (
        from.col === to.col &&
        target &&
        target.role === "general" &&
        target.color !== piece.color
      ) {
        return countPiecesBetween(board, from, to) === 0;
      }
      if (!((absRowDiff === 1 && absColDiff === 0) || (absRowDiff === 0 && absColDiff === 1))) {
        return false;
      }
      return isInsidePalace(to.row, to.col, piece.color);
    }
    case "cannon": {
      if (from.row !== to.row && from.col !== to.col) return false;
      const piecesBetween = countPiecesBetween(board, from, to);
      if (target) return piecesBetween === 1;
      return piecesBetween === 0;
    }
    case "pawn": {
      const forwardStep = piece.color === "red" ? -1 : 1;
      const canMoveForward = rowDiff === forwardStep && absColDiff === 0;
      const canMoveSideways = hasCrossedRiver(from.row, piece.color) && rowDiff === 0 && absColDiff === 1;
      return canMoveForward || canMoveSideways;
    }
    default:
      return false;
  }
};

export const isInCheck = (board, player) => {
  const generalPos = findGeneral(board, player);
  if (!generalPos) return true;

  const opponentColor = OPPONENT[player];
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== opponentColor) continue;
      if (canPieceMove(board, piece, { row, col }, generalPos)) {
        return true;
      }
    }
  }
  return false;
};

export const isLegalMoveForPlayer = (board, from, to, player) => {
  if (!isInsideBoard(from.row, from.col) || !isInsideBoard(to.row, to.col)) {
    return false;
  }

  const piece = board[from.row][from.col];
  if (!piece || piece.color !== player) return false;
  if (!canPieceMove(board, piece, from, to)) return false;

  const nextBoard = applyBoardMove(board, from, to);
  return !isInCheck(nextBoard, player);
};

const hasAnyLegalMove = (board, player) => {
  for (let fromRow = 0; fromRow < BOARD_ROWS; fromRow++) {
    for (let fromCol = 0; fromCol < BOARD_COLS; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (!piece || piece.color !== player) continue;

      for (let toRow = 0; toRow < BOARD_ROWS; toRow++) {
        for (let toCol = 0; toCol < BOARD_COLS; toCol++) {
          if (isLegalMoveForPlayer(board, { row: fromRow, col: fromCol }, { row: toRow, col: toCol }, player)) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

const evaluateGameStatus = (board, currentPlayer) => {
  const checking = isInCheck(board, currentPlayer);
  const hasMoves = hasAnyLegalMove(board, currentPlayer);

  if (checking && !hasMoves) {
    return {
      gameStatus: "checkmate",
      winner: OPPONENT[currentPlayer],
      checkedPlayer: currentPlayer,
    };
  }

  if (!checking && !hasMoves) {
    return {
      gameStatus: "stalemate",
      winner: null,
      checkedPlayer: null,
    };
  }

  if (checking) {
    return {
      gameStatus: "check",
      winner: null,
      checkedPlayer: currentPlayer,
    };
  }

  return {
    gameStatus: "playing",
    winner: null,
    checkedPlayer: null,
  };
};

export const createInitialBoard = () => {
  const board = createEmptyBoard();

  const place = (row, col, role, color) => {
    board[row][col] = createPiece(role, color);
  };

  place(0, 0, "rook", "black");
  place(0, 1, "horse", "black");
  place(0, 2, "elephant", "black");
  place(0, 3, "advisor", "black");
  place(0, 4, "general", "black");
  place(0, 5, "advisor", "black");
  place(0, 6, "elephant", "black");
  place(0, 7, "horse", "black");
  place(0, 8, "rook", "black");
  place(2, 1, "cannon", "black");
  place(2, 7, "cannon", "black");
  place(3, 0, "pawn", "black");
  place(3, 2, "pawn", "black");
  place(3, 4, "pawn", "black");
  place(3, 6, "pawn", "black");
  place(3, 8, "pawn", "black");

  place(9, 0, "rook", "red");
  place(9, 1, "horse", "red");
  place(9, 2, "elephant", "red");
  place(9, 3, "advisor", "red");
  place(9, 4, "general", "red");
  place(9, 5, "advisor", "red");
  place(9, 6, "elephant", "red");
  place(9, 7, "horse", "red");
  place(9, 8, "rook", "red");
  place(7, 1, "cannon", "red");
  place(7, 7, "cannon", "red");
  place(6, 0, "pawn", "red");
  place(6, 2, "pawn", "red");
  place(6, 4, "pawn", "red");
  place(6, 6, "pawn", "red");
  place(6, 8, "pawn", "red");

  return board;
};

export const createInitialState = () => ({
  board: createInitialBoard(),
  currentPlayer: "red",
  gameStatus: "playing",
  winner: null,
  checkedPlayer: null,
  moveHistory: [],
  moveCount: 0,
});

export const getLegalMoves = (state, row, col) => {
  const piece = state.board[row]?.[col];
  if (!piece || piece.color !== state.currentPlayer) return [];

  const moves = [];
  for (let toRow = 0; toRow < BOARD_ROWS; toRow++) {
    for (let toCol = 0; toCol < BOARD_COLS; toCol++) {
      if (isLegalMoveForPlayer(state.board, { row, col }, { row: toRow, col: toCol }, state.currentPlayer)) {
        moves.push({
          row: toRow,
          col: toCol,
          capture: Boolean(state.board[toRow][toCol]),
        });
      }
    }
  }
  return moves;
};

export const applyMove = (state, from, to) => {
  if (GAME_ENDED_STATUS.has(state.gameStatus)) return null;
  if (!isLegalMoveForPlayer(state.board, from, to, state.currentPlayer)) {
    return null;
  }

  const piece = state.board[from.row][from.col];
  const captured = state.board[to.row][to.col];
  const board = applyBoardMove(state.board, from, to);
  const currentPlayer = OPPONENT[state.currentPlayer];
  const status = evaluateGameStatus(board, currentPlayer);

  return {
    ...state,
    ...status,
    board,
    currentPlayer,
    moveCount: state.moveCount + 1,
    moveHistory: [
      ...state.moveHistory,
      {
        from,
        to,
        piece,
        captured,
        player: state.currentPlayer,
      },
    ],
  };
};

export const undoMove = (state) => {
  if (state.moveHistory.length === 0) return state;

  const history = state.moveHistory.slice(0, -1);
  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const board = cloneBoard(state.board);
  board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
  board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
  const status = evaluateGameStatus(board, lastMove.player);

  return {
    ...state,
    ...status,
    board,
    currentPlayer: lastMove.player,
    moveCount: Math.max(0, state.moveCount - 1),
    moveHistory: history,
  };
};
