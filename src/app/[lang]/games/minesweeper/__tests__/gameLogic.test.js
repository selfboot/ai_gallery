import MinesweeperGame from "../gameLogic";

function findMine(game) {
  game.reveal(0, 0);
  expect(game.firstMove).toBe(false);

  for (let row = 0; row < game.rows; row++) {
    for (let col = 0; col < game.cols; col++) {
      if (game.board[row][col] === -1) {
        return [row, col];
      }
    }
  }
  return null;
}

describe("GameLogic", () => {
  let game;

  beforeEach(() => {
    game = new MinesweeperGame(9, 9, 10);
  });

  describe("initialization", () => {
    test("should initialize the game state correctly", () => {
      expect(game.rows).toBe(9);
      expect(game.cols).toBe(9);
      expect(game.mines).toBe(10);
      expect(game.gameOver).toBe(false);
      expect(game.won).toBe(false);
      expect(game.firstMove).toBe(true);
      expect(game.minesLeft).toBe(10);
    });

    test("the board should be empty", () => {
      expect(game.board.every((row) => row.every((cell) => cell === 0))).toBe(true);
      expect(game.revealed.every((row) => row.every((cell) => cell === false))).toBe(true);
      expect(game.flagged.every((row) => row.every((cell) => cell === false))).toBe(true);
    });
  });

  describe("first click", () => {
    test("the first click position should not be a mine", () => {
      game.reveal(4, 4);
      expect(game.board[4][4]).not.toBe(-1);
      expect(game.firstMove).toBe(false);
    });
  });

  describe("flagging", () => {
    test("should be able to flag and unflag cells correctly", () => {
      game.toggleFlag(0, 0);
      expect(game.flagged[0][0]).toBe(true);
      expect(game.minesLeft).toBe(9);

      game.toggleFlag(0, 0);
      expect(game.flagged[0][0]).toBe(false);
      expect(game.minesLeft).toBe(10);
    });

    test("revealed cells cannot be flagged", () => {
      game.reveal(0, 0);
      game.toggleFlag(0, 0);
      expect(game.flagged[0][0]).toBe(false);
    });
  });

  describe("game over condition", () => {
    test("clicking a mine should end the game", () => {
      const minePosition = findMine(game);
      expect(minePosition).not.toBeNull();

      const [row, col] = minePosition;
      expect(game.board[row][col]).toBe(-1);

      game.reveal(row, col);
      expect(game.gameOver).toBe(true);
      expect(game.won).toBe(false);
    });
  });

  describe("auto flag", () => {
    test("should be able to turn on and off auto flag", () => {
      expect(game.autoFlag).toBe(false);
      game.setAutoFlag(true);
      expect(game.autoFlag).toBe(true);
      game.setAutoFlag(false);
      expect(game.autoFlag).toBe(false);
    });

    test("should automatically flag mines when all non-mine cells around a number are revealed", () => {
      // First just find any of the mines
      const minePosition = findMine(game);
      expect(minePosition).not.toBeNull();
      const [mineRow, mineCol] = minePosition;

      // Then find a number cell around the mine
      let numberCell = null;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const row = mineRow + i;
          const col = mineCol + j;
          if (game.isValidCell(row, col) && game.board[row][col] > 0) {
            numberCell = [row, col];
            break;
          }
        }
        if (numberCell) break;
      }
      expect(numberCell).not.toBeNull();
      const [numberRow, numberCol] = numberCell;

      // Then turn on auto flag
      game.setAutoFlag(true);

      // Then reveal all the cells around the number cell
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const row = numberRow + i;
          const col = numberCol + j;
          if (game.isValidCell(row, col) && game.board[row][col] !== -1) {
            game.reveal(row, col);
          }
        }
      }

      // Finally verify the mine is flagged
      expect(game.flagged[mineRow][mineCol]).toBe(true);
      expect(game.minesLeft).toBeLessThanOrEqual(game.mines - 1);
      expect(game.minesLeft).toBeGreaterThanOrEqual(0);

      const flaggedCount = game.countAdjacentFlags(numberRow, numberCol);
      expect(flaggedCount).toBe(game.board[numberRow][numberCol]);
    });

    test("should not flag cells when auto flag is disabled", () => {
      const minePosition = findMine(game);
      expect(minePosition).not.toBeNull();
      const [mineRow, mineCol] = minePosition;

      let numberCell = null;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const row = mineRow + i;
          const col = mineCol + j;
          if (game.isValidCell(row, col) && game.board[row][col] > 0) {
            numberCell = [row, col];
            break;
          }
        }
        if (numberCell) break;
      }
      expect(numberCell).not.toBeNull();
      const [numberRow, numberCol] = numberCell;

      game.setAutoFlag(false);

      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const row = numberRow + i;
          const col = numberCol + j;
          if (game.isValidCell(row, col) && game.board[row][col] !== -1) {
            game.reveal(row, col);
          }
        }
      }

      expect(game.flagged[mineRow][mineCol]).toBe(false);
      expect(game.minesLeft).toBe(game.mines);
    });
  });

  describe("continue game", () => {
    test("should be able to continue the game after clicking a mine", () => {
      const minePosition = findMine(game);
      expect(minePosition).not.toBeNull();

      const [row, col] = minePosition;
      expect(game.board[row][col]).toBe(-1);

      game.reveal(row, col);
      expect(game.gameOver).toBe(true);
      expect(game.lastRevealedMine).toEqual([row, col]);

      const continued = game.continueGame();
      expect(continued).toBe(true);
      expect(game.gameOver).toBe(false);
      expect(game.revealed[row][col]).toBe(false);
    });
  });
});

describe("copyState", () => {
  test("should be able to copy the game state correctly", () => {
    let game = new MinesweeperGame(9, 9, 10);
    game.reveal(0, 0);
    game.toggleFlag(8, 8);

    const clonedGame = MinesweeperGame.copyState(game);
    expect(clonedGame.board).toEqual(game.board);
    expect(clonedGame.revealed).toEqual(game.revealed);
    expect(clonedGame.flagged).toEqual(game.flagged);
    expect(clonedGame.gameOver).toBe(game.gameOver);
    expect(clonedGame.minesLeft).toBe(game.minesLeft);
  });
});

describe("handleDoubleClick", () => {
  let game;

  beforeEach(() => {
    game = new MinesweeperGame(9, 9, 10);
  });
  // Helper function to find a number cell and its surrounding mines
  function findNumberCellAndMines(game) {
    const tempGame = new MinesweeperGame(9, 9, 10);
    tempGame.reveal(0, 0);

    for (let row = 0; row < tempGame.rows; row++) {
      for (let col = 0; col < tempGame.cols; col++) {
        if (tempGame.board[row][col] > 0 && tempGame.board[row][col] < 8) {
          const mines = [];
          const nonMines = [];

          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              const newRow = row + i;
              const newCol = col + j;
              if (tempGame.isValidCell(newRow, newCol) && !(i === 0 && j === 0)) {
                if (tempGame.board[newRow][newCol] === -1) {
                  mines.push([newRow, newCol]);
                } else {
                  nonMines.push([newRow, newCol]);
                }
              }
            }
          }

          if (mines.length > 0 && nonMines.length > 0) {
            return {
              numberCell: [row, col],
              mines,
              nonMines,
              value: tempGame.board[row][col],
              board: tempGame.board.map((row) => row.slice()),
            };
          }
        }
      }
    }
    return null;
  }

  test("should reveal all adjacent cells when all mines are correctly flagged", () => {
    const cellInfo = findNumberCellAndMines(game);
    expect(cellInfo).not.toBeNull();
    const { numberCell, mines, nonMines, board } = cellInfo;
    game = new MinesweeperGame(9, 9, 10);
    game.board = board;
    game.firstMove = false;
    game.reveal(...numberCell);
    mines.forEach(([row, col]) => {
      game.toggleFlag(row, col);
    });
    game.handleDoubleClick(...numberCell);
    nonMines.forEach(([row, col]) => {
      expect(game.revealed[row][col]).toBe(true);
    });

    expect(game.gameOver).toBe(false);
  });

  test("should show pressed effect when mines are partially flagged", () => {
    const cellInfo = findNumberCellAndMines(game);
    expect(cellInfo).not.toBeNull();
    const { numberCell, mines, board } = cellInfo;
    game = new MinesweeperGame(9, 9, 10);
    game.board = board;
    game.firstMove = false;
    game.reveal(...numberCell);

    mines.slice(0, -1).forEach(([row, col]) => {
      game.toggleFlag(row, col);
    });

    game.handleDoubleClick(...numberCell);
    expect(game.pressedCells.length).toBeGreaterThan(0);

    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (!game.revealed[row][col]) {
          expect(game.revealed[row][col]).toBe(false);
        }
      }
    }
  });

  test("should end game when incorrect flags lead to revealing a mine", () => {
    const cellInfo = findNumberCellAndMines(game);
    expect(cellInfo).not.toBeNull();
    const { numberCell, mines, nonMines, value, board } = cellInfo;
    game = new MinesweeperGame(9, 9, 10);
    game.board = board;
    game.firstMove = false;
    game.reveal(...numberCell);
    const minesToFlag = mines.slice(0, mines.length - 1);
    const nonMinesToFlag = nonMines.slice(0, 1);
    const flagPositions = [...minesToFlag, ...nonMinesToFlag];

    flagPositions.forEach(([row, col]) => {
      expect(game.revealed[row][col]).toBe(false);
      game.toggleFlag(row, col);
      expect(game.flagged[row][col]).toBe(true);
    });

    game.handleDoubleClick(...numberCell);
    const revealedMine = mines.some(([row, col]) => game.revealed[row][col]);
    expect(revealedMine).toBe(true);
    expect(game.gameOver).toBe(true);
    expect(game.won).toBe(false);
  });
});
