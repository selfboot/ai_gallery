class HexMinesweeperGame {
  constructor(radius = 4, mines = 10) {
    this.radius = radius;
    this.mines = mines;
    this.gameOver = false;
    this.won = false;
    this.firstMove = true;
    this.minesLeft = mines;
    this.pressedCells = [];
    this.lastRevealedMine = null;
    this.autoFlag = false;

    // 计算总行数和列数（确保足够容纳整个正六边形）
    this.rows = 2 * radius - 1;
    this.cols = 2 * radius - 1;

    // 初始化游戏板
    this.initializeArrays();
  }

  initializeArrays() {
    this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(null));
    this.revealed = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
    this.flagged = Array(this.rows).fill().map(() => Array(this.cols).fill(false));

    // 使用轴向坐标系标记有效的六边形单元格
    const center = Math.floor(this.rows / 2);
    for (let q = -this.radius + 1; q < this.radius; q++) {
      for (let r = -this.radius + 1; r < this.radius; r++) {
        // 计算第三个坐标 s
        const s = -q - r;
        
        // 检查是否在正六边形范围内
        if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) < this.radius) {
          // 转换轴向坐标到数组索引
          const col = q + center;
          const row = r + center;
          this.board[row][col] = 0;
        }
      }
    }
  }

  isValidCell(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return false;
    }
    
    // 计算到中心的距离
    const centerRow = Math.floor(this.rows / 2);
    const centerCol = Math.floor(this.cols / 2);
    
    // 使用轴向坐标系
    const q = col - centerCol;
    const r = row - centerRow;
    const s = -q - r;
    
    // 检查是否在正六边形范围内
    return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) < this.radius;
  }

  getAdjacentCells(row, col) {
    // 修改六边形网格的相邻方向
    const directions = [
      [-1, 0],  // 上
      [-1, 1],  // 右上
      [0, 1],   // 右
      [1, 0],   // 下
      [1, -1],  // 左下
      [0, -1]   // 左
    ];

    return directions
      .map(([dr, dc]) => [row + dr, col + dc])
      .filter(([r, c]) => this.isValidCell(r, c));
  }

  initializeBoard(firstClickRow, firstClickCol) {
    this.initializeArrays();

    // 放置地雷
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

    // 计算每个单元格周围的地雷数
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
    return this.getAdjacentCells(row, col)
      .filter(([r, c]) => this.flagged[r][c])
      .length;
  }

  handleDoubleClick(row, col) {
    if (!this.revealed[row][col]) return;

    const cellValue = this.board[row][col];
    if (cellValue === 0 || cellValue === -1) return;

    const flagCount = this.countAdjacentFlags(row, col);
    if (flagCount === cellValue) {
      // 打开所有未标记和未揭示的相邻单元格
      this.getAdjacentCells(row, col).forEach(([r, c]) => {
        if (!this.flagged[r][c] && !this.revealed[r][c]) {
          this.reveal(r, c);
        }
      });
    } else {
      // 设置需要显示按下效果的单元格
      this.pressedCells = this.getAdjacentUnrevealedCells(row, col);
    }
  }

  getAdjacentUnrevealedCells(row, col) {
    return this.getAdjacentCells(row, col)
      .filter(([r, c]) => !this.revealed[r][c] && !this.flagged[r][c]);
  }

  clearPressedCells() {
    this.pressedCells = [];
  }

  static copyState(oldGame) {
    const newGame = new HexMinesweeperGame(oldGame.radius, oldGame.mines);
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
