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

// function visualizeBoard(board) {
//   const symbols = {
//     '': '.',
//     'B': '●',
//     'W': '○'
//   };
//   return board.map(row => 
//     row.map(cell => symbols[cell] || cell).join(' ')
//   ).join('\n');
// }

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
      if (pattern.values[i] === player) {
        positions.push([x, y]);
      }
    }

    if (match) {
      matchCount++;
      matchedPositions = positions;
      if (matchCount > 1) {
        return false; // It's not continuous open three if more than one pattern matches
      }
    }
  }

  return matchCount === 1 ? { isOpen: true, positions: matchedPositions } : { isOpen: false };
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
  let matchedPositions = null;

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
      if (pattern.values[i] === player) {
        positions.push([x, y]);
      }
    }

    if (match) {
      matchCount++;
      matchedPositions = positions;
      if (matchCount > 1) {
        return false; // It's not jump open three if more than one pattern matches
      }
    }
  }

  return matchCount === 1 ? { isOpen: true, positions: matchedPositions } : { isOpen: false };
}

export function isOpenThree(board, row, col, dx, dy, player) {
  const continuousResult = checkContinuousOpenThree(board, row, col, dx, dy, player);
  if (continuousResult.isOpen) {
    return continuousResult;
  }

  const jumpResult = checkJumpOpenThree(board, row, col, dx, dy, player);
  if (jumpResult.isOpen) {
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

  // console.log("checkDoubleThree", isDoubleThree, forbiddenPositions, openThrees);
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

export function checkDoubleFours(board, row, col, player) {
  const { rushFours, liveFours } = checkFourInRow(board, row, col, player);
  
  const totalFours = [...rushFours, ...liveFours];
  const isDoubleFour = totalFours.length >= 2;
  
  let forbiddenPositions = [];
  if (isDoubleFour) {
    forbiddenPositions = totalFours.flat();
    // Remove duplicate positions
    forbiddenPositions = Array.from(new Set(forbiddenPositions.map(JSON.stringify)), JSON.parse);
  }
  // console.log(visualizeBoard(board), row, col, player, isDoubleFour, forbiddenPositions, rushFours, liveFours);
  return {
    isDoubleFour,
    forbiddenPositions
  };
}

export function checkFourInRow(board, row, col, player) {
  const potentialFives = [];
  for (const [dx, dy] of directions) {
    for (let start = -4; start <= 0; start++) {
      const positions = [];
      let playerCount = 0;
      let emptyCount = 0;
      let emptyPositions = [];

      for (let i = 0; i < 5; i++) {
        const newRow = row + (start + i) * dx;
        const newCol = col + (start + i) * dy;

        if (!isValidPosition(newRow, newCol)) break;

        positions.push([newRow, newCol]);

        if (board[newRow][newCol] === player) {
          playerCount++;
        } else if (board[newRow][newCol] === '') {
          emptyCount++;
          emptyPositions.push([newRow, newCol]);
        } else {
          break;
        }
      }

      if (playerCount === 4 && emptyCount === 1) {
        potentialFives.push({
          fourPositions: positions.filter(([r, c]) => board[r][c] === player),
          emptyPosition: emptyPositions[0]
        });
      }
    }
  }

  const fourPositionsMap = new Map();

  for (const { fourPositions, emptyPosition } of potentialFives) {
    const key = JSON.stringify(fourPositions.sort((a, b) => a[0] - b[0] || a[1] - b[1]));
    if (!fourPositionsMap.has(key)) {
      fourPositionsMap.set(key, { fourPositions, emptyPositions: [] });
    }
    fourPositionsMap.get(key).emptyPositions.push(emptyPosition);
  }

  const rushFours = [];
  const liveFours = [];

  for (const { fourPositions, emptyPositions } of fourPositionsMap.values()) {
    if (emptyPositions.length === 1) {
      rushFours.push(fourPositions);
    } else if (emptyPositions.length >= 2) {
      liveFours.push(fourPositions);
    }
  }

  return { rushFours, liveFours };
}

// Helper function to find 'X' in the board and replace it with the player's stone
export function findXPositionAndReplace(board, player) {
  const newBoard = board.map(row => [...row]);
  for (let i = 0; i < newBoard.length; i++) {
    for (let j = 0; j < newBoard[i].length; j++) {
      if (newBoard[i][j] === 'X') {
        newBoard[i][j] = player;
        return { position: [i, j], board: newBoard };
      }
    }
  }
  throw new Error('No "X" found in the board');
}
