const directions = [
  [1, 0],  // 水平
  [0, 1],  // 垂直
  [1, 1],  // 右下对角线
  [1, -1]  // 左下对角线
];

function isOpenThree(board, row, col, dx, dy, player) {
  const patterns = [
    [0, player, player, player, 0],  // 连活三: *OOO*
    [0, player, 0, player, player, 0],  // 跳活三: *O*OO*
    [0, player, player, 0, player, 0]   // 跳活三: *OO*O*
  ];

  for (let pattern of patterns) {
    let match = true;
    let x = row - Math.floor(pattern.length / 2) * dx;
    let y = col - Math.floor(pattern.length / 2) * dy;
    let path = [];

    for (let i = 0; i < pattern.length; i++) {
      if (x < 0 || x >= 15 || y < 0 || y >= 15 || 
          (pattern[i] === player && board[x][y] !== player) ||
          (pattern[i] === 0 && board[x][y] !== "")) {
        match = false;
        break;
      }
      path.push([x, y]);
      x += dx;
      y += dy;
    }

    if (match) {
      return { isOpen: true, path, type: pattern.length === 5 ? "连活三" : "跳活三" };
    }
  }

  return { isOpen: false };
}

export function checkOpenThree(board, row, col, player) {
  for (const [dx, dy] of directions) {
    const result = isOpenThree(board, row, col, dx, dy, player);
    if (result.isOpen) {
      return result; // 如果在任何方向发现活三，立即返回
    }
  }
  return { isOpen: false }; // 如果所有方向都没有活三
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
