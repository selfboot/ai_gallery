class HexMinesweeperGame {
  constructor(rows = 6, cols = 10, mines = 10) {
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.gameOver = false;
    this.won = false;
    this.firstMove = true;
    this.minesLeft = mines;
    this.pressedCells = [];
    this.lastRevealedMine = null;
    this.autoFlag = false;

    this.initializeArrays();
  }

  initializeArrays() {
    this.board = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(0));
    this.revealed = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(false));
    this.flagged = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(false));
  }

  isValidCell(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getAdjacentCells(row, col) {
    const isEvenRow = row % 2 === 0;
    const directions = [
      [-1, isEvenRow ? -1 : 0], // 左上
      [-1, isEvenRow ? 0 : 1], // 右上
      [0, -1], // 左
      [0, 1], // 右
      [1, isEvenRow ? -1 : 0], // 左下
      [1, isEvenRow ? 0 : 1], // 右下
    ];

    return directions.map(([dr, dc]) => [row + dr, col + dc]).filter(([r, c]) => this.isValidCell(r, c));
  }

  initializeBoard(firstClickRow, firstClickCol) {
    this.initializeArrays();

    let minesPlaced = 0;
    while (minesPlaced < this.mines) {
      const row = Math.floor(Math.random() * this.rows);
      const col = Math.floor(Math.random() * this.cols);

      if (
        this.isValidCell(row, col) &&
        this.board[row][col] !== -1 &&
        !(row === firstClickRow && col === firstClickCol)
      ) {
        this.board[row][col] = -1;
        minesPlaced++;
      }
    }

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.isValidCell(row, col) && this.board[row][col] !== -1) {
          this.board[row][col] = this.countAdjacentMines(row, col);
        }
      }
    }
  }

  countAdjacentMines(row, col) {
    return this.getAdjacentCells(row, col).filter(([r, c]) => this.board[r][c] === -1).length;
  }

  toggleFlag(row, col) {
    if (!this.revealed[row][col]) {
      if (!this.flagged[row][col] && this.minesLeft <= 0) {
        return;
      }

      this.flagged[row][col] = !this.flagged[row][col];
      this.minesLeft += this.flagged[row][col] ? -1 : 1;
    }
  }

  checkWin() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.board[row][col] !== -1 && !this.revealed[row][col]) {
          return;
        }
      }
    }
    this.won = true;
    this.gameOver = true;
  }

  reveal(row, col) {
    if (this.firstMove) {
      this.initializeBoard(row, col);
      this.firstMove = false;
    }

    if (!this.isValidCell(row, col) || this.revealed[row][col] || this.flagged[row][col]) {
      return;
    }

    this.revealed[row][col] = true;

    if (this.board[row][col] === -1) {
      this.gameOver = true;
      this.lastRevealedMine = [row, col];
      return;
    }

    if (this.board[row][col] === 0) {
      this.revealAdjacentCells(row, col);
    }

    if (this.autoFlag && !this.gameOver) {
      this.autoFlagMines();
    }

    this.checkWin();
  }

  revealAdjacentCells(row, col) {
    this.getAdjacentCells(row, col).forEach(([r, c]) => {
      if (!this.revealed[r][c]) {
        this.reveal(r, c);
      }
    });
  }

  countAdjacentFlags(row, col) {
    return this.getAdjacentCells(row, col).filter(([r, c]) => this.flagged[r][c]).length;
  }

  handleDoubleClick(row, col) {
    if (!this.revealed[row][col]) return;

    const cellValue = this.board[row][col];
    if (cellValue === 0 || cellValue === -1) return;

    const flagCount = this.countAdjacentFlags(row, col);
    if (flagCount === cellValue) {
      this.getAdjacentCells(row, col).forEach(([r, c]) => {
        if (!this.flagged[r][c] && !this.revealed[r][c]) {
          this.reveal(r, c);
        }
      });
    } else {
      this.pressedCells = this.getAdjacentUnrevealedCells(row, col);
    }
  }

  getAdjacentUnrevealedCells(row, col) {
    return this.getAdjacentCells(row, col).filter(([r, c]) => !this.revealed[r][c] && !this.flagged[r][c]);
  }

  clearPressedCells() {
    this.pressedCells = [];
  }

  static copyState(oldGame) {
    const newGame = new HexMinesweeperGame(oldGame.rows, oldGame.cols, oldGame.mines);
    newGame.board = oldGame.board.map((row) => [...row]);
    newGame.revealed = oldGame.revealed.map((row) => [...row]);
    newGame.flagged = oldGame.flagged.map((row) => [...row]);
    newGame.gameOver = oldGame.gameOver;
    newGame.won = oldGame.won;
    newGame.firstMove = oldGame.firstMove;
    newGame.minesLeft = oldGame.minesLeft;
    newGame.pressedCells = [...oldGame.pressedCells];
    newGame.lastRevealedMine = oldGame.lastRevealedMine ? [...oldGame.lastRevealedMine] : null;
    newGame.autoFlag = oldGame.autoFlag;
    return newGame;
  }

  continueGame() {
    if (this.lastRevealedMine && this.gameOver && !this.won) {
      const [row, col] = this.lastRevealedMine;
      this.revealed[row][col] = false;
      this.gameOver = false;
      this.lastRevealedMine = null;
      return true;
    }
    return false;
  }

  autoFlagMines() {
    let flagged = false;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.isValidCell(row, col) && this.revealed[row][col] && this.board[row][col] > 0) {
          const unrevealedCells = this.getAdjacentUnrevealedCells(row, col);
          const flagCount = this.countAdjacentFlags(row, col);

          if (unrevealedCells.length > 0 && unrevealedCells.length === this.board[row][col] - flagCount) {
            unrevealedCells.forEach(([r, c]) => {
              if (!this.flagged[r][c]) {
                this.flagged[r][c] = true;
                this.minesLeft--;
                flagged = true;
              }
            });
          }
        }
      }
    }

    if (flagged) {
      this.autoFlagMines();
    }
  }

  setAutoFlag(enabled) {
    this.autoFlag = enabled;
    if (enabled) {
      this.autoFlagMines();
    }
  }
}

export default HexMinesweeperGame;
