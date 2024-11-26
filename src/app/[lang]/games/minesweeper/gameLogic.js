class MinesweeperGame {
  constructor(rows = 9, cols = 9, mines = 10) {
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

    // Initialize empty board
    this.board = Array(rows)
      .fill()
      .map(() => Array(cols).fill(0));
    this.revealed = Array(rows)
      .fill()
      .map(() => Array(cols).fill(false));
    this.flagged = Array(rows)
      .fill()
      .map(() => Array(cols).fill(false));
  }

  initializeBoard(firstClickRow, firstClickCol) {
    // Reset all arrays
    this.board = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(0));
    this.revealed = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(false));
    this.flagged = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(false));

    // Place mines, avoiding the first click position
    let minesPlaced = 0;
    while (minesPlaced < this.mines) {
      const row = Math.floor(Math.random() * this.rows);
      const col = Math.floor(Math.random() * this.cols);

      if (this.board[row][col] !== -1 && !(row === firstClickRow && col === firstClickCol)) {
        this.board[row][col] = -1;
        minesPlaced++;
      }
    }

    // Calculate the number of mines around each cell
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.board[row][col] !== -1) {
          this.board[row][col] = this.countAdjacentMines(row, col);
        }
      }
    }
  }

  countAdjacentMines(row, col) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (this.isValidCell(newRow, newCol) && this.board[newRow][newCol] === -1) {
          count++;
        }
      }
    }
    return count;
  }

  isValidCell(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
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
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (this.isValidCell(newRow, newCol) && !this.revealed[newRow][newCol]) {
          this.reveal(newRow, newCol);
        }
      }
    }
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

  countAdjacentFlags(row, col) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (this.isValidCell(newRow, newCol) && this.flagged[newRow][newCol]) {
          count++;
        }
      }
    }
    return count;
  }

  handleDoubleClick(row, col) {
    if (!this.revealed[row][col]) return;

    const cellValue = this.board[row][col];
    if (cellValue === 0 || cellValue === -1) return;

    const flagCount = this.countAdjacentFlags(row, col);
    if (flagCount === cellValue) {
      // Open all adjacent cells that are not flagged or revealed
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const newRow = row + i;
          const newCol = col + j;
          if (this.isValidCell(newRow, newCol) && !this.flagged[newRow][newCol] && !this.revealed[newRow][newCol]) {
            this.reveal(newRow, newCol);
          }
        }
      }
    } else {
      // Set the cells that need to display the pressed effect
      this.pressedCells = this.getAdjacentUnrevealedCells(row, col);
    }
  }

  getAdjacentUnrevealedCells(row, col) {
    const cells = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (this.isValidCell(newRow, newCol) &&
          !this.revealed[newRow][newCol] &&
          !this.flagged[newRow][newCol]) {
          cells.push([newRow, newCol]);
        }
      }
    }
    return cells;
  }

  clearPressedCells() {
    this.pressedCells = [];
  }

  static copyState(oldGame) {
    const newGame = new MinesweeperGame(oldGame.rows, oldGame.cols, oldGame.mines);
    newGame.board = oldGame.board.map(row => [...row]);
    newGame.revealed = oldGame.revealed.map(row => [...row]);
    newGame.flagged = oldGame.flagged.map(row => [...row]);
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
        if (this.revealed[row][col] && this.board[row][col] > 0) {
          const unrevealedCells = this.getAdjacentUnrevealedCells(row, col);
          const flagCount = this.countAdjacentFlags(row, col);

          // If the number of unrevealed cells is equal to the number of mines left, then these cells are mines
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

    // If there are new flags, continue checking if there are any more to flag
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

export default MinesweeperGame;
