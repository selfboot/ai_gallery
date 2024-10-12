const directions = [
  [1, 0],  // 水平
  [0, 1],  // 垂直
  [1, 1],  // 右下对角线
  [1, -1]  // 左下对角线
];

function countConsecutive(board, row, col, dx, dy, player) {
  let count = 1;
  let x = row + dx;
  let y = col + dy;

  while (x >= 0 && x < 15 && y >= 0 && y < 15 && board[x][y] === player) {
    count++;
    x += dx;
    y += dy;
  }

  x = row - dx;
  y = col - dy;

  while (x >= 0 && x < 15 && y >= 0 && y < 15 && board[x][y] === player) {
    count++;
    x -= dx;
    y -= dy;
  }

  return count;
}

function isOpenThree(board, row, col, dx, dy, player) {
  let count = countConsecutive(board, row, col, dx, dy, player);
  if (count !== 3) return false;

  let x1 = row - dx * 3;
  let y1 = col - dy * 3;
  let x2 = row + dx * 3;
  let y2 = col + dy * 3;

  return (
    x1 >= 0 && x1 < 15 && y1 >= 0 && y1 < 15 && board[x1][y1] === "" &&
    x2 >= 0 && x2 < 15 && y2 >= 0 && y2 < 15 && board[x2][y2] === ""
  );
}

function isJumpOpenThree(board, row, col, dx, dy, player) {
  let x1 = row - dx * 2;
  let y1 = col - dy * 2;
  let x2 = row + dx * 2;
  let y2 = col + dy * 2;

  return (
    x1 >= 0 && x1 < 15 && y1 >= 0 && y1 < 15 && board[x1][y1] === player &&
    x2 >= 0 && x2 < 15 && y2 >= 0 && y2 < 15 && board[x2][y2] === player &&
    row - dx >= 0 && row - dx < 15 && col - dy >= 0 && col - dy < 15 && board[row - dx][col - dy] === "" &&
    row + dx >= 0 && row + dx < 15 && col + dy >= 0 && col + dy < 15 && board[row + dx][col + dy] === "" &&
    row - dx * 3 >= 0 && row - dx * 3 < 15 && col - dy * 3 >= 0 && col - dy * 3 < 15 && board[row - dx * 3][col - dy * 3] === "" &&
    row + dx * 3 >= 0 && row + dx * 3 < 15 && col + dy * 3 >= 0 && col + dy * 3 < 15 && board[row + dx * 3][col + dy * 3] === ""
  );
}

function isFour(board, row, col, dx, dy, player) {
  let count = countConsecutive(board, row, col, dx, dy, player);
  return count === 4;
}

function isOpenFour(board, row, col, dx, dy, player) {
  let count = countConsecutive(board, row, col, dx, dy, player);
  if (count !== 4) return false;

  let x1 = row - dx * 4;
  let y1 = col - dy * 4;
  let x2 = row + dx * 4;
  let y2 = col + dy * 4;

  return (
    x1 >= 0 && x1 < 15 && y1 >= 0 && y1 < 15 && board[x1][y1] === "" &&
    x2 >= 0 && x2 < 15 && y2 >= 0 && y2 < 15 && board[x2][y2] === ""
  );
}

function isHalfOpenFour(board, row, col, dx, dy, player) {
  let count = countConsecutive(board, row, col, dx, dy, player);
  if (count !== 4) return false;

  let x1 = row - dx * 4;
  let y1 = col - dy * 4;
  let x2 = row + dx * 4;
  let y2 = col + dy * 4;

  return (
    (x1 >= 0 && x1 < 15 && y1 >= 0 && y1 < 15 && board[x1][y1] === "") ||
    (x2 >= 0 && x2 < 15 && y2 >= 0 && y2 < 15 && board[x2][y2] === "")
  );
}

export function checkThreeThree(board, row, col, player) {
  let openThrees = 0;
  let openFours = 0;
  let halfOpenFours = 0;

  for (const [dx, dy] of directions) {
    if (isOpenThree(board, row, col, dx, dy, player) || isJumpOpenThree(board, row, col, dx, dy, player)) {
      openThrees++;
    }
    if (isOpenFour(board, row, col, dx, dy, player)) {
      openFours++;
    }
    if (isHalfOpenFour(board, row, col, dx, dy, player)) {
      halfOpenFours++;
    }
  }

  return (openThrees >= 2) || (openThrees >= 1 && (openFours + halfOpenFours) >= 1);
}
