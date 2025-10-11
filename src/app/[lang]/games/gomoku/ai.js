import { boardSize, directions, checkWin, checkDoubleThree, checkOverline, checkDoubleFours } from "./move";

const DEFAULT_ATTACK_WEIGHT = 1;
const DEFAULT_DEFENSE_WEIGHT = 0.9;
const CENTER_WEIGHT = 10;

export const aiRankPresets = {
  novice: {
    attackWeight: 0.65,
    defenseWeight: 0.45,
    randomness: 1,
    counterWeight: 0,
  },
  expert: {
    attackWeight: 1.1,
    defenseWeight: 1,
    randomness: 0.25,
    counterWeight: 0.35,
  },
  master: {
    attackWeight: 1.4,
    defenseWeight: 1.25,
    randomness: 0,
    counterWeight: 0.75,
  },
};

const SCORE_PATTERNS = {
  five: 100000,
  openFour: 12000,
  closedFour: 6000,
  openThree: 2500,
  closedThree: 300,
  openTwo: 80,
  closedTwo: 20,
};

const neighborOffsets = [];
for (let dx = -2; dx <= 2; dx += 1) {
  for (let dy = -2; dy <= 2; dy += 1) {
    if (dx === 0 && dy === 0) continue;
    neighborOffsets.push([dx, dy]);
  }
}

function inBounds(row, col) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function hasNeighbor(board, row, col) {
  for (const [dx, dy] of neighborOffsets) {
    const nr = row + dx;
    const nc = col + dy;
    if (inBounds(nr, nc) && board[nr][nc] !== "") {
      return true;
    }
  }
  return false;
}

function patternScore(count, emptySlots, openEnds) {
  if (count >= 5) return SCORE_PATTERNS.five;

  if (count === 4) {
    if (openEnds === 2 && emptySlots === 1) return SCORE_PATTERNS.openFour;
    if (openEnds === 1 && emptySlots === 1) return SCORE_PATTERNS.closedFour;
  }

  if (count === 3) {
    if (openEnds === 2 && emptySlots === 2) return SCORE_PATTERNS.openThree;
    if (openEnds >= 1 && emptySlots === 2) return SCORE_PATTERNS.closedThree;
  }

  if (count === 2) {
    if (openEnds === 2 && emptySlots === 3) return SCORE_PATTERNS.openTwo;
    if (openEnds >= 1 && emptySlots === 3) return SCORE_PATTERNS.closedTwo;
  }

  return 2;
}

function evaluateDirection(board, row, col, dx, dy, player) {
  let best = 0;

  for (let offset = -4; offset <= 0; offset += 1) {
    let count = 0;
    let emptySlots = 0;
    let valid = true;

    for (let i = 0; i < 5; i += 1) {
      const r = row + (offset + i) * dx;
      const c = col + (offset + i) * dy;

      if (!inBounds(r, c)) {
        valid = false;
        break;
      }

      const value = board[r][c];

      if (value === player) {
        count += 1;
      } else if (value === "") {
        emptySlots += 1;
      } else {
        valid = false;
        break;
      }
    }

    if (!valid || count === 0) continue;

    const beforeR = row + (offset - 1) * dx;
    const beforeC = col + (offset - 1) * dy;
    const afterR = row + (offset + 5) * dx;
    const afterC = col + (offset + 5) * dy;

    let openEnds = 0;
    if (inBounds(beforeR, beforeC) && board[beforeR][beforeC] === "") openEnds += 1;
    if (inBounds(afterR, afterC) && board[afterR][afterC] === "") openEnds += 1;

    const score = patternScore(count, emptySlots, openEnds);
    if (score > best) best = score;
  }

  return best;
}

function evaluateBoardContribution(board, row, col, player) {
  let total = 0;
  for (const [dx, dy] of directions) {
    total += evaluateDirection(board, row, col, dx, dy, player);
  }
  return total;
}

function applyForbiddenRules(board, row, col, player, forbiddenRules) {
  if (!forbiddenRules || forbiddenRules.length === 0 || forbiddenRules.includes("noRestriction")) {
    return false;
  }

  const targetRow = board[row];

  try {
    targetRow[col] = player;

    if (forbiddenRules.includes("threeThree")) {
      const { isForbidden } = checkDoubleThree(board, row, col, player);
      if (isForbidden) {
        return true;
      }
    }

    if (forbiddenRules.includes("longConnection")) {
      const overlines = checkOverline(board, row, col, player);
      if (overlines.length > 0) {
        return true;
      }
    }

    if (forbiddenRules.includes("fourFour")) {
      const { isDoubleFour } = checkDoubleFours(board, row, col, player);
      if (isDoubleFour) {
        return true;
      }
    }

    return false;
  } finally {
    targetRow[col] = "";
  }
}

function isBoardEmpty(board) {
  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      if (board[row][col] !== "") return false;
    }
  }
  return true;
}

function evaluateBestOpponentResponse(board, opponent, aiColor, forbiddenRules, enforceForbidden, center) {
  let bestScore = -Infinity;

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      if (board[row][col] !== "") continue;
      if (!hasNeighbor(board, row, col)) continue;
      if (enforceForbidden(opponent) && applyForbiddenRules(board, row, col, opponent, forbiddenRules)) {
        continue;
      }

      board[row][col] = opponent;

      if (checkWin(board, row, col, opponent)) {
        board[row][col] = "";
        return SCORE_PATTERNS.five;
      }

      const attackScore = evaluateBoardContribution(board, row, col, opponent);
      const defenseScore = evaluateBoardContribution(board, row, col, aiColor);
      const centerBias = CENTER_WEIGHT - (Math.abs(center - row) + Math.abs(center - col));
      const moveScore = attackScore * 1.1 + defenseScore * 0.9 + centerBias;

      if (moveScore > bestScore) {
        bestScore = moveScore;
      }

      board[row][col] = "";
    }
  }

  return bestScore === -Infinity ? 0 : bestScore;
}

export function getAIMove(board, aiColor, options = {}) {
  const {
    forbiddenRules = [],
    enforceForbiddenFor = "black",
    rank = "expert",
  } = options;

  const preset = aiRankPresets[rank] || aiRankPresets.expert;
  const attackWeight = options.attackWeight ?? preset.attackWeight ?? DEFAULT_ATTACK_WEIGHT;
  const defenseWeight = options.defenseWeight ?? preset.defenseWeight ?? DEFAULT_DEFENSE_WEIGHT;
  const randomness = options.randomness ?? preset.randomness ?? 0;
  const counterWeight = options.counterWeight ?? preset.counterWeight ?? 0;

  if (!Array.isArray(board) || board.length !== boardSize) {
    throw new Error("Unexpected board state passed to AI");
  }

  const opponent = aiColor === "black" ? "white" : "black";

  if (isBoardEmpty(board)) {
    const center = Math.floor(boardSize / 2);
    return { row: center, col: center };
  }

  const candidateMoves = [];

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      if (board[row][col] !== "") continue;
      if (!hasNeighbor(board, row, col)) continue;
      candidateMoves.push({ row, col });
    }
  }

  if (candidateMoves.length === 0) {
    const center = Math.floor(boardSize / 2);
    return { row: center, col: center };
  }

  const enforceForbidden = (color) => color === enforceForbiddenFor;

  for (const { row, col } of candidateMoves) {
    if (enforceForbidden(aiColor) && applyForbiddenRules(board, row, col, aiColor, forbiddenRules)) {
      continue;
    }

    board[row][col] = aiColor;
    const winning = checkWin(board, row, col, aiColor);
    board[row][col] = "";

    if (winning) {
      return { row, col };
    }
  }

  for (const { row, col } of candidateMoves) {
    board[row][col] = opponent;
    const wouldWin = checkWin(board, row, col, opponent);
    board[row][col] = "";

    if (wouldWin && (!enforceForbidden(aiColor) || !applyForbiddenRules(board, row, col, aiColor, forbiddenRules))) {
      return { row, col };
    }
  }

  const center = Math.floor(boardSize / 2);
  const evaluatedMoves = [];

  for (const { row, col } of candidateMoves) {
    if (enforceForbidden(aiColor) && applyForbiddenRules(board, row, col, aiColor, forbiddenRules)) {
      continue;
    }

    board[row][col] = aiColor;
    const attackScore = evaluateBoardContribution(board, row, col, aiColor);
    const defenseScore = evaluateBoardContribution(board, row, col, opponent);
    const centerBias = CENTER_WEIGHT - (Math.abs(center - row) + Math.abs(center - col));

    let totalScore = attackScore * attackWeight + defenseScore * defenseWeight + centerBias;

    if (counterWeight > 0) {
      const counterScore = evaluateBestOpponentResponse(
        board,
        opponent,
        aiColor,
        forbiddenRules,
        enforceForbidden,
        center,
      );
      totalScore -= counterScore * counterWeight;
    }

    evaluatedMoves.push({ row, col, score: totalScore });
    board[row][col] = "";
  }

  if (evaluatedMoves.length === 0) {
    const fallback = candidateMoves[0];
    return { row: fallback.row, col: fallback.col };
  }

  evaluatedMoves.sort((a, b) => b.score - a.score);

  const selectionWindow = Math.max(
    1,
    Math.min(evaluatedMoves.length, Math.round(1 + Math.max(0, Math.min(1, randomness)) * 5)),
  );
  const choiceIndex = Math.floor(Math.random() * selectionWindow);
  const choice = evaluatedMoves[choiceIndex];

  return { row: choice.row, col: choice.col };
}
