import { ELEMENTS, SokobanLogic } from "../gameLogic";

const SYMBOLS = {
  "#": ELEMENTS.WALL,
  "@": ELEMENTS.PLAYER,
  "+": ELEMENTS.PLAYER_ON_TARGET,
  "$": ELEMENTS.BOX,
  "*": ELEMENTS.BOX_ON_TARGET,
  ".": ELEMENTS.TARGET,
  " ": ELEMENTS.FLOOR,
};

// Convert string map to numeric map
const parseMap = (mapString) => {
  return mapString
    .trim()
    .split("\n")
    .map((line) => line.split("").map((char) => SYMBOLS[char]));
};

describe("Move and Undo Tests", () => {
  test("single step move and undo", () => {
    const initialMap = parseMap(`
####
#@ #
####`);

    const game = new SokobanLogic();
    game.setMap(initialMap);

    game.startNewMoveGroup();
    game.movePlayer("RIGHT");
    expect(game.findPlayer()).toEqual({ x: 2, y: 1 });
    expect(game.history.length).toBe(2);

    game.undo();
    expect(game.findPlayer()).toEqual({ x: 1, y: 1 });
    expect(game.history.length).toBe(1);
  });

  test("push box and undo", () => {
    const initialMap = parseMap(`
#####
#@$ #
#####`
);

    const game = new SokobanLogic();
    game.setMap(initialMap);
    game.startNewMoveGroup();
    game.movePlayer("RIGHT");
    expect(game.findPlayer()).toEqual({ x: 2, y: 1 });
    expect(game.map[1][3]).toBe(ELEMENTS.BOX);

    game.undo();
    expect(game.findPlayer()).toEqual({ x: 1, y: 1 });
    expect(game.map[1][2]).toBe(ELEMENTS.BOX);
  });

  test("group moves undo", () => {
    const initialMap = parseMap(`
#####
#@  #
#####
`);

    const game = new SokobanLogic();
    game.setMap(initialMap);
    game.startNewMoveGroup();
    game.movePlayer("RIGHT");
    const firstMovePos = game.findPlayer();
    game.startNewMoveGroup();
    game.movePlayer("RIGHT");
    game.movePlayer("RIGHT");

    expect(game.findPlayer()).toEqual({ x: 3, y: 1 });
    game.undo();
    expect(game.findPlayer()).toEqual(firstMovePos);
    game.undo();
    expect(game.findPlayer()).toEqual({ x: 1, y: 1 });
  });

  test("group box push undo", () => {
    const initialMap = parseMap(`
#######
#@$  .#
#######
`);

    const game = new SokobanLogic();
    game.setMap(initialMap);
    game.startNewMoveGroup();
    game.movePlayer("RIGHT");
    game.movePlayer("RIGHT");
    game.movePlayer("RIGHT");
    expect(game.map[1][5]).toBe(ELEMENTS.BOX_ON_TARGET);
    game.undo();
    expect(game.findPlayer()).toEqual({ x: 1, y: 1 });
    expect(game.map[1][2]).toBe(ELEMENTS.BOX);
    expect(game.map[1][5]).toBe(ELEMENTS.TARGET);
  });

  test("invalid moves", () => {
    const initialMap = parseMap(`
####
#@ #
####
`);

    const game = new SokobanLogic();
    game.setMap(initialMap);

    game.startNewMoveGroup();
    const result = game.movePlayer("LEFT");

    expect(result).toBeNull();
    expect(game.findPlayer()).toEqual({ x: 1, y: 1 });
    expect(game.history.length).toBe(1);
  });
});

describe("Auto Move and Path Finding Tests", () => {
  test("auto move player and undo", async () => {
    const initialMap = parseMap(`
#######
#@   .#
#######
`);

    const game = new SokobanLogic();
    game.setMap(initialMap);
    const path = await game.autoMoveTo({ x: 4, y: 1 });
    expect(path).toEqual(["RIGHT", "RIGHT", "RIGHT"]);

    game.startNewMoveGroup();
    for (const direction of path) {
      game.movePlayer(direction);
    }

    expect(game.findPlayer()).toEqual({ x: 4, y: 1 });
    expect(game.history.length).toBe(4);
    game.undo();
    expect(game.findPlayer()).toEqual({ x: 1, y: 1 });
    expect(game.history.length).toBe(1);
  });
  test("unreachable path", async () => {
    const initialMap = parseMap(`
#######
#@ #.##
#######
`);

    const game = new SokobanLogic();
    game.setMap(initialMap);

    const path = await game.autoMoveTo({ x: 4, y: 1 });
    expect(path).toBeFalsy();
  });

  test("find push path", () => {
    const initialMap = parseMap(`
#######
#@$  .#
#######
`);

    const game = new SokobanLogic();
    game.setMap(initialMap);
    const pushPath = game.findPushPath({ x: 2, y: 1 }, { x: 5, y: 1 });
    expect(pushPath).toEqual([
      { type: "push", direction: "RIGHT" },
      { type: "push", direction: "RIGHT" },
      { type: "push", direction: "RIGHT" }
    ]);
  });

  test("invalid push paths", () => {
    const initialMap = parseMap(`
#######
#@$#.##
#######
`);

    const game = new SokobanLogic();
    game.setMap(initialMap);

    const blockedPath = game.findPushPath({ x: 2, y: 1 }, { x: 4, y: 1 });
    expect(blockedPath).toBeNull();

    const nonLinearPath = game.findPushPath({ x: 2, y: 1 }, { x: 4, y: 2 });
    expect(nonLinearPath).toBeNull();
  });

  test("push box to target and undo", () => {
    const initialMap = parseMap(`
#######
#@$  .#
#######
`);

    const game = new SokobanLogic();
    game.setMap(initialMap);
    const pushPath = game.findPushPath({ x: 2, y: 1 }, { x: 5, y: 1 });
    expect(pushPath).toBeTruthy();
    game.startNewMoveGroup();
    for (const move of pushPath) {
      game.movePlayer(move.direction);
    }
    expect(game.map[1][5]).toBe(ELEMENTS.BOX_ON_TARGET);
    expect(game.findPlayer()).toEqual({ x: 4, y: 1 });
    game.undo();
    expect(game.map[1][2]).toBe(ELEMENTS.BOX);
    expect(game.findPlayer()).toEqual({ x: 1, y: 1 });
  });
});
