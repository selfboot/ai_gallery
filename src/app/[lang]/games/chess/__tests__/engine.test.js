import {
  applyMove,
  createEmptyBoard,
  createInitialState,
  createPiece,
  getLegalMoves,
  isInCheck,
  isLegalMoveForPlayer,
  undoMove,
} from "../engine";

const withGenerals = (board) => {
  board[9][4] = createPiece("general", "red");
  board[0][4] = createPiece("general", "black");
  return board;
};

describe("Chinese chess engine rules", () => {
  test("pawn cannot move sideways before crossing river", () => {
    const state = createInitialState();
    expect(isLegalMoveForPlayer(state.board, { row: 6, col: 0 }, { row: 6, col: 1 }, "red")).toBe(false);
    expect(isLegalMoveForPlayer(state.board, { row: 6, col: 0 }, { row: 5, col: 0 }, "red")).toBe(true);
  });

  test("horse move is blocked by horse leg", () => {
    const state = createInitialState();
    expect(isLegalMoveForPlayer(state.board, { row: 9, col: 1 }, { row: 8, col: 3 }, "red")).toBe(false);
  });

  test("cannon capture requires exactly one screen piece", () => {
    const board = withGenerals(createEmptyBoard());
    board[5][4] = createPiece("pawn", "red");
    board[2][1] = createPiece("cannon", "black");
    board[2][2] = createPiece("pawn", "black");
    board[2][4] = createPiece("pawn", "red");

    expect(isLegalMoveForPlayer(board, { row: 2, col: 1 }, { row: 2, col: 4 }, "black")).toBe(true);

    board[2][2] = null;
    expect(isLegalMoveForPlayer(board, { row: 2, col: 1 }, { row: 2, col: 4 }, "black")).toBe(false);
  });

  test("cannot move piece away and expose flying general check", () => {
    const board = withGenerals(createEmptyBoard());
    board[5][4] = createPiece("rook", "red");

    expect(isLegalMoveForPlayer(board, { row: 5, col: 4 }, { row: 5, col: 5 }, "red")).toBe(false);

    const state = {
      board,
      currentPlayer: "red",
      gameStatus: "playing",
      winner: null,
      checkedPlayer: null,
      moveHistory: [],
      moveCount: 0,
    };
    const legalMoves = getLegalMoves(state, 5, 4);
    expect(legalMoves.some((move) => move.row === 5 && move.col === 5)).toBe(false);
  });

  test("facing generals means both players are in check", () => {
    const board = withGenerals(createEmptyBoard());
    expect(isInCheck(board, "red")).toBe(true);
    expect(isInCheck(board, "black")).toBe(true);
  });

  test("apply and undo move update state consistently", () => {
    const initial = createInitialState();
    const moved = applyMove(initial, { row: 6, col: 0 }, { row: 5, col: 0 });

    expect(moved).not.toBeNull();
    expect(moved.currentPlayer).toBe("black");
    expect(moved.moveCount).toBe(1);
    expect(moved.board[5][0]?.label).toBe("兵");

    const undone = undoMove(moved);
    expect(undone.currentPlayer).toBe("red");
    expect(undone.moveCount).toBe(0);
    expect(undone.board[6][0]?.label).toBe("兵");
    expect(undone.board[5][0]).toBeNull();
  });
});
