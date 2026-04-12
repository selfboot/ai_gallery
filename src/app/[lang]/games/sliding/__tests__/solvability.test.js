import {
  findBlankRowFromBottom,
  getInversionCount,
  isSlidingPuzzleSolvable,
} from '../solvability';

describe('sliding puzzle solvability', () => {
  test('keeps the issue #42 4x4 board solvable when the blank is in the goal position', () => {
    const board = [
      [9, 1, 3, 4],
      [5, 6, 7, 8],
      [2, 10, 11, 12],
      [13, 14, 15, 0],
    ];

    expect(getInversionCount(board)).toBe(14);
    expect(findBlankRowFromBottom(board)).toBe(1);
    expect(isSlidingPuzzleSolvable(board, 4)).toBe(true);
  });

  test('detects the classic unsolvable 4x4 swap with the blank in the goal position', () => {
    const board = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 15, 14, 0],
    ];

    expect(getInversionCount(board)).toBe(1);
    expect(findBlankRowFromBottom(board)).toBe(1);
    expect(isSlidingPuzzleSolvable(board, 4)).toBe(false);
  });

  test('keeps odd-sized boards based on inversion parity only', () => {
    expect(isSlidingPuzzleSolvable([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 0],
    ], 3)).toBe(true);

    expect(isSlidingPuzzleSolvable([
      [1, 2, 3],
      [4, 5, 6],
      [8, 7, 0],
    ], 3)).toBe(false);
  });
});
