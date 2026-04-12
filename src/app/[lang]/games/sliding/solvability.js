export const getInversionCount = (board) => {
  const tiles = board.flat().filter((value) => value !== 0);
  let inversions = 0;

  for (let i = 0; i < tiles.length - 1; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) {
        inversions++;
      }
    }
  }

  return inversions;
};

export const findBlankRowFromBottom = (board) => {
  const blankRow = board.findIndex((row) => row.includes(0));

  if (blankRow === -1) {
    return null;
  }

  return board.length - blankRow;
};

export const isSlidingPuzzleSolvable = (board, size = board.length) => {
  const inversions = getInversionCount(board);

  if (size % 2 === 1) {
    return inversions % 2 === 0;
  }

  const blankRowFromBottom = findBlankRowFromBottom(board);

  if (blankRowFromBottom === null) {
    return false;
  }

  return (inversions + blankRowFromBottom) % 2 === 1;
};
