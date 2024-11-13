import GomokuAI from "../ai";

describe("findAllPatterns", () => {
  let ai;

  beforeEach(() => {
    ai = new GomokuAI(2);
  });

  test("should recognize five in a row", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    board[7][5] = "B";
    board[7][6] = "B";
    board[7][7] = "B";
    board[7][8] = "B";
    board[7][9] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 1,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 0,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize live four", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));
    board[7][5] = "B";
    board[7][6] = "B";
    board[7][7] = "B";
    board[7][8] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 1,
      blockedFour: 0,
      liveThree: 0,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize blocked four", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    board[7][5] = "W";
    board[7][6] = "B";
    board[7][7] = "B";
    board[7][8] = "B";
    board[7][9] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 1,
      liveThree: 0,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize live three", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    board[7][4] = "";
    board[7][5] = "B";
    board[7][6] = "B";
    board[7][7] = "B";
    board[7][8] = "";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 1,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize blocked three", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    board[7][5] = "W";
    board[7][6] = "B";
    board[7][7] = "B";
    board[7][8] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 0,
      blockedThree: 1,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize double blocked four", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "B", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "B", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "B", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "B", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "B", "W", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "B", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "B", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "W", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 2,
      liveThree: 0,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize cross patterns", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    board[7][5] = "B";
    board[7][6] = "B";
    board[7][7] = "B";
    board[7][8] = "B";
    board[7][9] = "B";
    board[8][9] = "B";
    board[9][9] = "B";
    board[10][9] = "B";
    board[11][9] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 2,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 0,
      blockedThree: 0,
      liveTwo: 1,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize jump three", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    board[7][5] = "B";
    board[7][6] = "B";
    board[7][7] = "";
    board[7][8] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 1,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize blocked four and live three combination", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    // 冲四
    board[7][5] = "W"; // 被对手挡住
    board[7][6] = "B";
    board[7][7] = "B";
    board[7][8] = "B";
    board[7][9] = "B";

    // 活三
    board[5][5] = "B";
    board[5][6] = "B";
    board[5][7] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 1,
      liveThree: 1,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize double live three", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));
    board[7][5] = "B";
    board[7][6] = "B";
    board[7][7] = "B";
    board[5][5] = "B";
    board[6][5] = "B";
    board[7][5] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 2,
      blockedThree: 0,
      liveTwo: 1,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize double live three without shared pieces", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    board[7][5] = "B";
    board[7][6] = "B";
    board[7][7] = "B";
    board[5][9] = "B";
    board[5][10] = "B";
    board[5][11] = "B";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 2,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize multiple blocked threes", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    // 第一个眠三（横向）
    board[7][5] = "W";
    board[7][6] = "B";
    board[7][7] = "B";
    board[7][8] = "B";

    // 第二个眠三（竖向）
    board[2][9] = "B";
    board[3][9] = "B";
    board[4][9] = "B";
    board[5][9] = "W";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 0,
      blockedThree: 2,
      liveTwo: 0,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize multiple live twos", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    // 第一个活二（横向）
    board[7][6] = "B";
    board[7][7] = "B";
    // 两端都是空位

    // 第二个活二（竖向）
    board[5][9] = "B";
    board[6][9] = "B";
    // 两端都是空位

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 0,
      blockedThree: 0,
      liveTwo: 2,
      blockedTwo: 0,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize multiple blocked twos", () => {
    const board = Array(15)
      .fill(0)
      .map(() => Array(15).fill(""));

    // 第一个眠二（横向）
    board[7][5] = "W";
    board[7][6] = "B";
    board[7][7] = "B";

    // 第二个眠二（竖向）
    board[5][9] = "B";
    board[6][9] = "B";
    board[7][9] = "W";

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 0,
      blockedThree: 0,
      liveTwo: 0,
      blockedTwo: 2,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });

  test("should recognize mixed patterns with shared pieces", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "W", "", "B", "", "", "", ""],
      ["", "", "", "", "", "", "", "B", "", "", "", "B", "", "", ""],
      ["", "", "", "", "", "W", "B", "B", "B", "", "", "", "B", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const patterns = ai.findAllPatterns(board, "B");
    const resPattern = {
      five: 0,
      liveFour: 0,
      blockedFour: 0,
      liveThree: 1,
      blockedThree: 1,
      liveTwo: 2,
      blockedTwo: 1,
      one: 0,
    };
    expect(patterns).toStrictEqual(resPattern);
  });
});

// describe("evaluate", () => {
//   let ai;

//   beforeEach(() => {
//     ai = new GomokuAI(2);
//   });

//   test("should give higher score when player has advantage", () => {
//     const board = [
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","W","W","W","W","","","","","",""], // 白子活四
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","B","B","B","","","","","","",""], // 黑子活三
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""]
//     ];

//     const whiteScore = ai.evaluate(board, "W");
//     const blackScore = ai.evaluate(board, "B");
    
//     expect(whiteScore).toBeGreaterThan(blackScore); // 白子活四应该比黑子活三分数高
//     expect(whiteScore).toBeGreaterThan(ai.scores.liveThree);
//     expect(whiteScore).toBe(ai.scores.liveFour);
//   });

//   test("should consider opponent's threats", () => {
//     const board = [
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","B","B","B","B","","","","","",""], // 黑子冲四
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","W","W","","","","","","","",""], // 白子活二
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""]
//     ];

//     const whiteScore = ai.evaluate(board, "W");
//     expect(whiteScore).toBeLessThan(0); // 对手有冲四，应该是负分
//   });

//   test("should evaluate multiple patterns correctly", () => {
//     const board = [
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","B","B","B","","","","","","",""], // 黑子活三
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","B","B","B","","","","","","",""], // 黑子活三
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","W","W","W","W","","","","","",""], // 白子活四
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""]
//     ];

//     const whiteScore = ai.evaluate(board, "W");
//     const blackScore = ai.evaluate(board, "B");

//     expect(whiteScore).toBeGreaterThan(0); // 白子有活四
//     expect(blackScore).toBeGreaterThan(0); // 黑子有双活三
//     expect(whiteScore).toBeGreaterThan(blackScore); // 活四应该比双活三强
//   });

//   test("should evaluate defensive moves", () => {
//     const board = [
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","B","B","B","","","","","","",""], // 黑子活三
//       ["","","","","","","W","","","","","","","",""], // 白子阻挡
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""],
//       ["","","","","","","","","","","","","","",""]
//     ];

//     const whiteScore = ai.evaluate(board, "W");
//     expect(whiteScore).toBeGreaterThan(-ai.scores.liveThree); // 虽然对手有活三，但已经被阻挡
//   });
// });

describe("getBestMove", () => {
  let ai;

  beforeEach(() => {
    ai = new GomokuAI(2);
  });

  test("should block opponent's three in a row", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "B", "B", "B", "", "", "", "", "", "", ""], // 7, 5-7 has three black pieces
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const bestMove = ai.getBestMove(ai.convertBoard(board), false); // white's turn
    expect([
      [7, 4], // Left block
      [7, 8], // Right block
    ]).toContainEqual(bestMove);
  });

  test("should block opponent's potential win", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "B", "B", "B", "B", "", "", "", "", "", ""], // 7, 5-8 has four black pieces
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const bestMove = ai.getBestMove(ai.convertBoard(board), false); // white's turn
    expect([
      [7, 9],
      [7, 4],
    ]).toContainEqual(bestMove);
  });

  test("should block opponent's double three", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "B", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "B", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "B", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const bestMove = ai.getBestMove(ai.convertBoard(board), false);
    expect([
      [8, 8],
      [4, 4],
    ]).toContainEqual(bestMove);
  });

  test("should prefer winning move over blocking", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "W", "W", "W", "W", "", "", "", "", "", "", ""], // White can win
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "B", "B", "B", "B", "", "", "", "", "", "", "", ""], // Black pieces threaten to win
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const bestMove = ai.getBestMove(ai.convertBoard(board), false);
    expect([
      [7, 8],
      [7, 3],
    ]).toContainEqual(bestMove); // should choose to win instead of blocking
  });

  test("should block three and get more score", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "W", "", "", "", "", ""],
      ["", "", "", "", "", "B", "B", "B", "", "", "", "", "", "", ""], // Put 7,8 is better
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const bestMove = ai.getBestMove(ai.convertBoard(board), false);
    expect(bestMove).toStrictEqual([7, 8]);
  });

  test("should block", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "B", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "W", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "B", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const bestMove = ai.getBestMove(ai.convertBoard(board), false);
    expect(bestMove).toStrictEqual([7, 6]);
  });


  test("can start with one black", () => {
    const board = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "B", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const bestMove = ai.getBestMove(ai.convertBoard(board), false);
    expect(bestMove).toStrictEqual([7, 6]);
  });
});