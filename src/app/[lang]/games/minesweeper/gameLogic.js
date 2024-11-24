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

    // 初始化空板
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
    // 重置所有数组
    this.board = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(0));
    this.revealed = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(false));
    this.flagged = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(false));

    // 放置地雷，避开第一次点击的位置
    let minesPlaced = 0;
    while (minesPlaced < this.mines) {
      const row = Math.floor(Math.random() * this.rows);
      const col = Math.floor(Math.random() * this.cols);

      if (this.board[row][col] !== -1 && !(row === firstClickRow && col === firstClickCol)) {
        this.board[row][col] = -1;
        minesPlaced++;
      }
    }

    // 计算每个格子周围的地雷数
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.board[row][col] !== -1) {
          this.board[row][col] = this.countAdjacentMines(row, col);
        }
      }
    }
  }

  // 创建一个克隆方法
  clone() {
    const newGame = new MinesweeperGame(this.rows, this.cols, this.mines);
    newGame.board = this.board.map((row) => [...row]);
    newGame.revealed = this.revealed.map((row) => [...row]);
    newGame.flagged = this.flagged.map((row) => [...row]);
    newGame.gameOver = this.gameOver;
    newGame.won = this.won;
    newGame.firstMove = this.firstMove;
    newGame.minesLeft = this.minesLeft;
    newGame.pressedCells = [...this.pressedCells];
    return newGame;
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
      return;
    }

    if (this.board[row][col] === 0) {
      this.revealAdjacentCells(row, col);
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

    // 检查周围的旗子数量是否等于当前格子的数字
    const flagCount = this.countAdjacentFlags(row, col);
    if (flagCount === cellValue) {
      // 打开所有未打开且未标记的相邻格子
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
      // 设置需要显示按压效果的格子
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
    return newGame;
  }
}

export default MinesweeperGame;
