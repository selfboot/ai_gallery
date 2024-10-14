export const ThreeType = {
  CONTINUOUS: "连活三",
  JUMP: "跳活三",
};

export const directions = [
  [0, 1],  // 水平
  [1, 0],  // 垂直
  [1, 1],  // 右下对角线
  [-1, 1]  // 左下对角线
];

function isValidPosition(x, y) {
  return x >= 0 && x < 15 && y >= 0 && y < 15;
}

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

function checkContinuousOpenThree(board, row, col, dx, dy, player) {
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
        return false; // 如果匹配多于一种模式，不是连续活三
      }
    }
  }

  return matchCount === 1 ? { pattern: matchedPattern, positions: matchedPositions } : false;
}

export function isOpenThree(board, row, col, dx, dy, player) {
  const result = checkContinuousOpenThree(board, row, col, dx, dy, player);
  if (result) {
    return {
      isOpen: true,
      type: ThreeType.CONTINUOUS,
      pattern: result.pattern,
      positions: result.positions
    };
  }
  return { isOpen: false };
}

export function checkDoubleThree(board, row, col, player) {
  const openThrees = findOpenThrees(board, row, col, player);
  
  const isDoubleThree = openThrees.length >= 2;

  let forbiddenPositions = [];
  if (isDoubleThree) {
    forbiddenPositions = openThrees.flatMap(three => three.path);
    // Remove duplicates
    forbiddenPositions = Array.from(new Set(forbiddenPositions.map(JSON.stringify)), JSON.parse);
  }

  return {
    isForbidden: isDoubleThree,
    forbiddenPositions,
    openThrees
  };
}
