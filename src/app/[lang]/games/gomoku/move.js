export const ThreeType = {
  CONTINUOUS: "连活三",
  JUMP: "跳活三",
};

export const boardSize = 15;

export const directions = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // right-down diagonal
  [-1, 1]  // left-down diagonal
];

function isValidPosition(x, y) {
  return x >= 0 && x < 15 && y >= 0 && y < 15;
}

export const checkWin = (gameBoard, row, col, currentPlayer) => {
  for (const [dx, dy] of directions) {
    let count = 1;
    count += countDirection(gameBoard, row, col, dx, dy, currentPlayer);
    count += countDirection(gameBoard, row, col, -dx, -dy, currentPlayer);

    if (count >= 5) return true;
  }

  return false;
};

export const countDirection = (gameBoard, row, col, dx, dy, currentPlayer) => {
  let count = 0;
  let x = row + dx;
  let y = col + dy;

  while (
    x >= 0 &&
      x < boardSize &&
      y >= 0 &&
      y < boardSize &&
      gameBoard[x][y] === currentPlayer
    ) {
      count++;
      x += dx;
    y += dy;
   }

  return count;
};

function visualizeBoard(board) {
  const symbols = {
    '': '.',
    'B': '●',
    'W': '○'
  };
  return board.map(row => 
    row.map(cell => symbols[cell] || cell).join(' ')
  ).join('\n');
}

export function checkContinuousOpenThree(board, row, col, dx, dy, player) {
//   console.log("checkContinuousOpenThree");
//   console.log(visualizeBoard(board));
//   console.log(`row: ${row}, col: ${col}, dx: ${dx}, dy: ${dy}, player: ${player}`);
  
  const patterns = [
    {indices: [-2, -1, 0, 1, 2], values: ["", player, player, player, ""]},  // _XOX_
    {indices: [-1, 0, 1, 2, 3], values: ["", player, player, player, ""]},   // _OXX_
    {indices: [-3, -2, -1, 0, 1], values: ["", player, player, player, ""]}  // _XXO_
  ];

  let matchCount = 0;
  let matchedPattern = null;
  let matchedPositions = null;

  for (let pattern of patterns) {
    let match = true;
    let positions = [];
    for (let i = 0; i < pattern.indices.length; i++) {
      const x = row + pattern.indices[i] * dx;
      const y = col + pattern.indices[i] * dy;
    //   console.log("x", x, "y", y, "pattern.values[i]", pattern.values[i], "board[x][y]", board[x][y]);
      if (!isValidPosition(x, y) || board[x][y] !== pattern.values[i]) {
        match = false;
        break;
      }
      positions.push([x, y]);
    }
    // console.log("match", match, positions);

    if (match) {
      matchCount++;
      matchedPattern = pattern;
      matchedPositions = positions;
      if (matchCount > 1) {
        return false; // It's not continuous open three if more than one pattern
      }
    }
  }

  return matchCount === 1 ? { isOpen: true, type: ThreeType.CONTINUOUS,pattern: matchedPattern, positions: matchedPositions } : { isOpen: false };
}

export function checkJumpOpenThree(board, row, col, dx, dy, player) {
  const patterns = [
    {indices: [-4, -3, -2, -1, 0, 1], values: ["", player, player, "", player, ""]},  // _OO_X_
    {indices: [-2, -1, 0, 1, 2, 3], values: ["", player, player, "", player, ""]},    // _OX_O_
    {indices: [-1, 0, 1, 2, 3, 4], values: ["", player, player, "", player, ""]},    // _XO_O_
    {indices: [-1, 0, 1, 2, 3, 4], values: ["", player, "", player, player, ""]},    // _X_OO_
    {indices: [-3, -2, -1, 0, 1, 2], values: ["", player, "", player, player, ""]},  // _0_XO_
    {indices: [-4, -3, -2, -1, 0, 1], values: ["", player, "", player, player, ""]}, // _0_OX_
  ];

  let matchCount = 0;
  let matchedPattern = null;
  let matchedPositions = null;
//   console.log("checkJumpOpenThree");
//   console.log(visualizeBoard(board));
//   console.log(`row: ${row}, col: ${col}, dx: ${dx}, dy: ${dy}, player: ${player}`);
  
  for (let pattern of patterns) {
    let match = true;
    let positions = [];
    for (let i = 0; i < pattern.indices.length; i++) {
      const x = row + pattern.indices[i] * dx;
      const y = col + pattern.indices[i] * dy;
      if (!isValidPosition(x, y) || board[x][y] !== pattern.values[i]) {
        match = false;
        break;
      }
    //   console.log("x", x, "y", y, "pattern.values[i]", pattern.values[i], "board[x][y]", board[x][y]);
      positions.push([x, y]);
    }

    if (match) {
      matchCount++;
      matchedPattern = pattern;
      matchedPositions = positions;
    //   console.log("matchedPattern", matchedPattern, matchedPositions, matchCount);
      if (matchCount > 1) {
        return false; // Not jump open three if more than one pattern
      }
    }
  }

  if (matchCount === 1) {
    // console.log("matchedPattern", matchedPattern, matchedPositions, matchCount);
    return { isOpen: true, type: ThreeType.JUMP, pattern: matchedPattern, positions: matchedPositions };
  } else {
    return { isOpen: false };
  }
}

export function isOpenThree(board, row, col, dx, dy, player) {
  const continuousResult = checkContinuousOpenThree(board, row, col, dx, dy, player);
  if (continuousResult) {
    return continuousResult;
  }

  const jumpResult = checkJumpOpenThree(board, row, col, dx, dy, player);
  if (jumpResult) {
    return jumpResult;
  }

  return { isOpen: false };
}

export function findOpenThrees(board, row, col, player) {
  const openThrees = [];

  for (const [dx, dy] of directions) {
    const result = isOpenThree(board, row, col, dx, dy, player);
    if (result.isOpen) {
      openThrees.push({
        type: result.type,
        direction: [dx, dy],
        positions: result.positions
      });
    }
  }

  return openThrees;
}

export function checkDoubleThree(board, row, col, player) {
  const openThrees = findOpenThrees(board, row, col, player);
  
  const isDoubleThree = openThrees.length >= 2;

  let forbiddenPositions = [];
  if (isDoubleThree) {
    forbiddenPositions = openThrees.flatMap(three => three.positions);
    forbiddenPositions = Array.from(new Set(forbiddenPositions.map(JSON.stringify)), JSON.parse);
  }

  return {
    isForbidden: isDoubleThree,
    forbiddenPositions,
    openThrees
  };
}

export function checkOverline(board, row, col, player) {
  const overlines = [];

  for (const [dx, dy] of directions) {
    const path = [[row, col]];
    let count = 1;

    // Check in one direction
    for (let i = 1; i < 6; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      if (!isValidPosition(newRow, newCol) || board[newRow][newCol] !== player) {
        break;
      }
      path.push([newRow, newCol]);
      count++;
    }

    // Check in the opposite direction
    for (let i = 1; i < 6; i++) {
      const newRow = row - i * dx;
      const newCol = col - i * dy;
      if (!isValidPosition(newRow, newCol) || board[newRow][newCol] !== player) {
        break;
      }
      path.unshift([newRow, newCol]);
      count++;
    }

    if (count > 5) {
      overlines.push(path);
    }
  }

  return overlines; // return all overlines
}

export function checkLiveFour(board, row, col, player) {
  const liveFours = [];

  for (const [dx, dy] of directions) {
    let count = 1;
    let leftSpace = 0;
    let rightSpace = 0;
    let path = [[row, col]];

    // Check left
    for (let i = 1; i <= 4; i++) {
      const newRow = row - i * dx;
      const newCol = col - i * dy;
      if (!isValidPosition(newRow, newCol)) break;
      if (board[newRow][newCol] === player) {
        count++;
        path.unshift([newRow, newCol]);
      } else if (board[newRow][newCol] === "") {
        leftSpace++;
        break;
      } else {
        break;
      }
    }

    // Check right
    for (let i = 1; i <= 4; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      if (!isValidPosition(newRow, newCol)) break;
      if (board[newRow][newCol] === player) {
        count++;
        path.push([newRow, newCol]);
      } else if (board[newRow][newCol] === "") {
        rightSpace++;
        break;
      } else {
        break;
      }
    }

    if (count === 4 && leftSpace === 1 && rightSpace === 1) {
      liveFours.push(path);
    }
  }

  return liveFours;
}

export function checkRushFour(board, row, col, player) {
  const rushFours = [];

  for (const [dx, dy] of directions) {
    let leftCount = 0;
    let rightCount = 0;
    let leftSpace = 0;
    let rightSpace = 0;
    let leftBlocked = false;
    let rightBlocked = false;
    let path = [[row, col]];

    // 检查左边
    for (let i = 1; i <= 4; i++) {
      const newRow = row - i * dx;
      const newCol = col - i * dy;
      if (!isValidPosition(newRow, newCol)) {
        leftBlocked = true;
        break;
      }
      if (board[newRow][newCol] === player) {
        leftCount++;
        path.unshift([newRow, newCol]);
      } else if (board[newRow][newCol] === "") {
        if (leftSpace === 0) {
          leftSpace++;
          path.unshift([newRow, newCol]);
        } else {
          break;
        }
      } else {
        leftBlocked = true;
        break;
      }
    }

    // 检查右边
    for (let i = 1; i <= 4; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      if (!isValidPosition(newRow, newCol)) {
        rightBlocked = true;
        break;
      }
      if (board[newRow][newCol] === player) {
        rightCount++;
        path.push([newRow, newCol]);
      } else if (board[newRow][newCol] === "") {
        if (rightSpace === 0) {
          rightSpace++;
          path.push([newRow, newCol]);
        } else {
          break;
        }
      } else {
        rightBlocked = true;
        break;
      }
    }

    const totalCount = leftCount + rightCount + 1; // +1 for the current position
    const totalSpace = leftSpace + rightSpace;

    // 判断是否为冲四
    if (totalCount === 4 && totalSpace === 1) {
      if ((leftSpace === 1 && rightBlocked) || (rightSpace === 1 && leftBlocked) || (leftSpace === 0 && rightSpace === 0)) {
        rushFours.push(path.filter(pos => board[pos[0]][pos[1]] === player));
      }
    }
  }

  return rushFours;
}

export function findDoubleFours(board, row, col, player) {
  const liveFours = checkLiveFour(board, row, col, player);
  const rushFours = checkRushFour(board, row, col, player);
  const totalFours = [...liveFours, ...rushFours];
  const isDoubleFour = totalFours.length >= 2;
  
  let forbiddenPositions = [];
  if (isDoubleFour) {
    forbiddenPositions = totalFours.flat();
    // Remove duplicate positions
    forbiddenPositions = Array.from(new Set(forbiddenPositions.map(JSON.stringify)), JSON.parse);
  }

  return {
    isDoubleFour,
    liveFours,
    rushFours,
    forbiddenPositions
  };
}