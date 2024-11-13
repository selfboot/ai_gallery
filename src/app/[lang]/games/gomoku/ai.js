import { checkFourInRow, findOpenThrees, checkWin, findBlockedThrees, findLiveTwos, findBlockedTwos } from "./move";
class GomokuAI {
  constructor(depth = 2) {
    this.depth = depth;
    this.cache = new Map(); // 位置评估缓存
    this.directions = [
      [1, 0], // 水平
      [0, 1], // 垂直
      [1, 1], // 右下对角
      [1, -1], // 右上对角
    ];
    // 棋型分数重新设计
    this.scores = {
      five: 1000000, // 连五，必胜
      liveFour: 100000, // 活四，必胜
      doubleBlockedFour: 50000, // 双冲四，必胜
      blockedFourLiveThree: 40000, // 冲四活三，必胜
      doubleLiveThree: 40000, // 双活三

      liveThree: 10000, // 活三，极强威胁
      blockedFour: 1000, // 单冲四
      blockedThree: 500, // 眠三
      liveTwo: 100, // 活二
      blockedTwo: 50, // 眠二
      one: 10, // 单子
    };
  }
  // 将游戏棋盘转换为数字矩阵
  convertBoard(gameBoard) {
    return gameBoard.map((row) =>
      row.map((cell) => {
        if (cell === "B") return "black";
        if (cell === "W") return "white";
        return "";
      })
    );
  }

  // 获取空位置
  getEmptyPositions(board) {
    const positions = [];
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j] === "") {
          positions.push([i, j]);
        }
      }
    }
    return positions;
  }

  // 评估函数
  evaluate(board, player) {
    const key = board.toString() + player;
    if (this.cache.has(key)) {
      const cachedScore = this.cache.get(key);
      return cachedScore;
    }

    let totalScore = 0;
    const patterns = this.findAllPatterns(board, player);

    // 计算己方分数
    totalScore += this.calculatePatternScore(patterns);

    // 计算对手分数
    const opponentPlayer = player === "black" ? "white" : "black";
    const opponentPatterns = this.findAllPatterns(board, opponentPlayer);
    totalScore -= this.calculatePatternScore(opponentPatterns) * 0.9; // 对手的威胁略微降权

    this.cache.set(key, totalScore);
    return totalScore;
  }

  // 寻找所有棋型
  findAllPatterns(board, player) {
    // 记录每种棋型的具体位置组合
    const patterns = {
      five: new Set(),
      liveFour: new Set(),
      blockedFour: new Set(),
      liveThree: new Set(),
      blockedThree: new Set(),
      liveTwo: new Set(),
      blockedTwo: new Set(),
      one: new Set(),
    };

    // 临时存储所有找到的棋形及其位置
    const allPatterns = [];

    // 遍历每个棋子
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j] !== player) continue;

        // 检查连五
        const { hasWin, fivePositions } = checkWin(board, i, j, player);
        if (hasWin) {
          fivePositions.forEach((fivePos) => {
            allPatterns.push({
              type: "five",
              positions: fivePos,
            });
          });
        }

        // 检查活四和冲四
        const { rushFours, liveFours } = checkFourInRow(board, i, j, player);
        liveFours.forEach((positions) => {
          allPatterns.push({
            type: "liveFour",
            positions: positions,
          });
        });
        rushFours.forEach((positions) => {
          allPatterns.push({
            type: "blockedFour",
            positions: positions,
          });
        });

        // 检查活三
        const openThrees = findOpenThrees(board, i, j, player);
        openThrees.forEach((three) => {
          allPatterns.push({
            type: "liveThree",
            positions: three.positions,
          });
        });

        const blockedThrees = findBlockedThrees(board, i, j, player);
        blockedThrees.forEach((three) => {
          allPatterns.push({
            type: "blockedThree",
            positions: three.positions,
          });
        });

        const liveTwos = findLiveTwos(board, i, j, player);
        liveTwos.forEach((two) => {
          allPatterns.push({
            type: "liveTwo",
            positions: two.positions,
          });
        });

        const blockedTwos = findBlockedTwos(board, i, j, player);
        blockedTwos.forEach((two) => {
          allPatterns.push({
            type: "blockedTwo",
            positions: two.positions,
          });
        });
      }
    }

    const priorityOrder = [
      "five",
      "liveFour",
      "blockedFour",
      "liveThree",
      "blockedThree",
      "liveTwo",
      "blockedTwo",
      "one",
    ];

    // 按优先级筛选棋形
    for (const priority of priorityOrder) {
      const priorityPatterns = allPatterns.filter((p) => p.type === priority);

      for (const pattern of priorityPatterns) {
        // 检查是否被更高优先级的棋形完全包含
        let isFullyContained = false;
        for (const higherPriority of priorityOrder.slice(0, priorityOrder.indexOf(priority))) {
          if (
            [...patterns[higherPriority]].some((posStr) => {
              const higherPosSet = new Set(JSON.parse(posStr).map((p) => `${p[0]},${p[1]}`));
              const currentPosSet = new Set(pattern.positions.map((p) => `${p[0]},${p[1]}`));
              return [...currentPosSet].every((pos) => higherPosSet.has(pos));
            })
          ) {
            isFullyContained = true;
            break;
          }
        }

        // 如果没有被完全包含，则添加这个棋形
        if (!isFullyContained) {
          patterns[priority].add(JSON.stringify(pattern.positions));
        }
      }
    }

    // 转换为计数
    return {
      five: patterns.five.size,
      liveFour: patterns.liveFour.size,
      blockedFour: patterns.blockedFour.size,
      liveThree: patterns.liveThree.size,
      blockedThree: patterns.blockedThree.size,
      liveTwo: patterns.liveTwo.size,
      blockedTwo: patterns.blockedTwo.size,
      one: patterns.one.size,
    };
  }

  // 计算棋型分数
  calculatePatternScore(patterns) {
    let score = 0;

    // 必胜棋型
    if (patterns.five > 0) return this.scores.five;
    if (patterns.liveFour > 0) return this.scores.liveFour;
    if (patterns.blockedFour >= 2) return this.scores.doubleBlockedFour;
    if (patterns.blockedFour > 0 && patterns.liveThree > 0) return this.scores.blockedFourLiveThree;
    if (patterns.liveThree >= 2) return this.scores.doubleLiveThree;

    // 累计其他棋型分数
    score += patterns.blockedFour * this.scores.blockedFour;
    score += patterns.liveThree * this.scores.liveThree;
    score += patterns.blockedThree * this.scores.blockedThree;
    score += patterns.liveTwo * this.scores.liveTwo;
    score += patterns.blockedTwo * this.scores.blockedTwo;
    score += patterns.one * this.scores.one;

    return score;
  }

  // Alpha-Beta cut-off algorithm
  // alpha: the best result found by MAX layer
  // beta: the best result found by MIN layer
  alphaBeta(board, depth, alpha, beta, maximizingPlayer) {
    if (depth === 0) {
      const score = this.evaluate(board, maximizingPlayer ? "black" : "white");
      return score;
    }

    const moves = this.getEmptyPositions(board);
    if (moves.length === 0) {
      const score = this.evaluate(board, maximizingPlayer ? "black" : "white");
      return score;
    }

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const [row, col] of moves) {
        board[row][col] = "black";
        const evaluation = this.alphaBeta(board, depth - 1, alpha, beta, false);
        board[row][col] = "";
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) {
          console.log("Beta cutoff");
          break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const [row, col] of moves) {
        board[row][col] = "white";
        const evaluation = this.alphaBeta(board, depth - 1, alpha, beta, true);
        board[row][col] = "";
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) {
          console.log("Alpha cutoff");
          break;
        }
      }
      return minEval;
    }
  }

  // Get the best move position
  getBestMove(gameBoard, isBlack = true) {
    const board = gameBoard;
    const moves = this.getEmptyPositions(board);
    let bestScore = -Infinity;
    let bestMove = null;

    for (const [row, col] of moves) {
      board[row][col] = isBlack ? "black" : "white";
      const score = this.alphaBeta(board, this.depth - 1, -Infinity, Infinity, !isBlack);
      board[row][col] = "";

      if (score > bestScore) {
        bestScore = score;
        bestMove = [row, col];
      }
    }
    return bestMove;
  }
}

export default GomokuAI;
