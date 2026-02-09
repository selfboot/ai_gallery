import Cube from "cubejs";
import { expandTokenToQuarterTokens, moveToQuarterToken, quarterTokenToMove } from "../RubiksCube";

const QUARTER_TURN = Math.PI / 2;

const DIR_VECTORS = {
  "+x": [1, 0, 0],
  "-x": [-1, 0, 0],
  "+y": [0, 1, 0],
  "-y": [0, -1, 0],
  "+z": [0, 0, 1],
  "-z": [0, 0, -1],
};

const VEC_TO_DIR = Object.fromEntries(Object.entries(DIR_VECTORS).map(([dir, vec]) => [vec.join(","), dir]));

function rotateVec90(vec, axis) {
  const [x, y, z] = vec;

  if (axis === "x") return [x, -z, y];
  if (axis === "y") return [z, y, -x];
  return [-y, x, z];
}

function rotateVec(vec, axis, quarterTurns) {
  let turns = ((quarterTurns % 4) + 4) % 4;
  let result = vec;

  while (turns > 0) {
    result = rotateVec90(result, axis);
    turns -= 1;
  }

  return result;
}

function rotateDir(dir, axis, quarterTurns) {
  const rotated = rotateVec(DIR_VECTORS[dir], axis, quarterTurns);
  return VEC_TO_DIR[rotated.join(",")];
}

function createVirtualCube() {
  const cubies = [];

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        const stickers = {};

        if (x === 1) stickers["+x"] = "R";
        if (x === -1) stickers["-x"] = "L";
        if (y === 1) stickers["+y"] = "U";
        if (y === -1) stickers["-y"] = "D";
        if (z === 1) stickers["+z"] = "F";
        if (z === -1) stickers["-z"] = "B";

        cubies.push({
          pos: [x, y, z],
          stickers,
        });
      }
    }
  }

  return cubies;
}

function applyQuarterMove(cubies, move) {
  const turns = Math.round(move.angle / QUARTER_TURN);

  cubies.forEach((cubie) => {
    const axisIndex = move.axis === "x" ? 0 : move.axis === "y" ? 1 : 2;
    if (cubie.pos[axisIndex] !== move.layer) return;

    cubie.pos = rotateVec(cubie.pos, move.axis, turns);

    const rotatedStickers = {};
    Object.entries(cubie.stickers).forEach(([dir, color]) => {
      rotatedStickers[rotateDir(dir, move.axis, turns)] = color;
    });
    cubie.stickers = rotatedStickers;
  });
}

function applyAlgorithm(cubies, algorithm) {
  const tokens = algorithm.trim().split(/\s+/).filter(Boolean);

  tokens.forEach((token) => {
    const quarterTokens = expandTokenToQuarterTokens(token);
    quarterTokens.forEach((quarterToken) => {
      const move = quarterTokenToMove(quarterToken);
      if (!move) {
        throw new Error(`Unsupported quarter token: ${quarterToken}`);
      }
      applyQuarterMove(cubies, move);
    });
  });
}

function createSeededRandom(seed = 123456789) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function generateScramble(rng, length = 20) {
  const faces = ["R", "L", "U", "D", "F", "B"];
  const suffixes = ["", "'", "2"];
  const tokens = [];
  let prevFace = "";

  for (let i = 0; i < length; i += 1) {
    let face = faces[Math.floor(rng() * faces.length)];
    while (face === prevFace) {
      face = faces[Math.floor(rng() * faces.length)];
    }

    const suffix = suffixes[Math.floor(rng() * suffixes.length)];
    tokens.push(`${face}${suffix}`);
    prevFace = face;
  }

  return tokens.join(" ");
}

function generateSliceScramble(rng, length = 20) {
  const faces = ["R", "L", "U", "D", "F", "B", "M", "E", "S"];
  const suffixes = ["", "'", "2"];
  const tokens = [];
  let prevFace = "";

  for (let i = 0; i < length; i += 1) {
    let face = faces[Math.floor(rng() * faces.length)];
    while (face === prevFace) {
      face = faces[Math.floor(rng() * faces.length)];
    }

    const suffix = suffixes[Math.floor(rng() * suffixes.length)];
    tokens.push(`${face}${suffix}`);
    prevFace = face;
  }

  return tokens.join(" ");
}

function getSticker(cubies, x, y, z, dir) {
  const cubie = cubies.find((item) => item.pos[0] === x && item.pos[1] === y && item.pos[2] === z);
  return cubie?.stickers?.[dir] ?? "?";
}

function virtualCubeToFaceletString(cubies) {
  const facelets = [];

  // U face
  for (const z of [-1, 0, 1]) {
    for (const x of [-1, 0, 1]) {
      facelets.push(getSticker(cubies, x, 1, z, "+y"));
    }
  }

  // R face
  for (const y of [1, 0, -1]) {
    for (const z of [1, 0, -1]) {
      facelets.push(getSticker(cubies, 1, y, z, "+x"));
    }
  }

  // F face
  for (const y of [1, 0, -1]) {
    for (const x of [-1, 0, 1]) {
      facelets.push(getSticker(cubies, x, y, 1, "+z"));
    }
  }

  // D face
  for (const z of [1, 0, -1]) {
    for (const x of [-1, 0, 1]) {
      facelets.push(getSticker(cubies, x, -1, z, "-y"));
    }
  }

  // L face
  for (const y of [1, 0, -1]) {
    for (const z of [-1, 0, 1]) {
      facelets.push(getSticker(cubies, -1, y, z, "-x"));
    }
  }

  // B face
  for (const y of [1, 0, -1]) {
    for (const x of [1, 0, -1]) {
      facelets.push(getSticker(cubies, x, y, -1, "-z"));
    }
  }

  return facelets.join("");
}

function isVirtualCubeSolved(cubies) {
  return cubies.every((cubie) => {
    const [x, y, z] = cubie.pos;

    if (x === 1 && cubie.stickers["+x"] !== "R") return false;
    if (x === -1 && cubie.stickers["-x"] !== "L") return false;
    if (y === 1 && cubie.stickers["+y"] !== "U") return false;
    if (y === -1 && cubie.stickers["-y"] !== "D") return false;
    if (z === 1 && cubie.stickers["+z"] !== "F") return false;
    if (z === -1 && cubie.stickers["-z"] !== "B") return false;

    return true;
  });
}

describe("Rubik move mapping compatibility", () => {
  beforeAll(() => {
    Cube.initSolver();
  });

  test("face notation directions match expected world-axis signs", () => {
    expect(quarterTokenToMove("R")).toMatchObject({ axis: "x", layer: 1, angle: -QUARTER_TURN });
    expect(quarterTokenToMove("L")).toMatchObject({ axis: "x", layer: -1, angle: QUARTER_TURN });
    expect(quarterTokenToMove("U")).toMatchObject({ axis: "y", layer: 1, angle: -QUARTER_TURN });
    expect(quarterTokenToMove("D")).toMatchObject({ axis: "y", layer: -1, angle: QUARTER_TURN });
    expect(quarterTokenToMove("F")).toMatchObject({ axis: "z", layer: 1, angle: -QUARTER_TURN });
    expect(quarterTokenToMove("B")).toMatchObject({ axis: "z", layer: -1, angle: QUARTER_TURN });
    expect(quarterTokenToMove("M")).toMatchObject({ axis: "x", layer: 0, angle: QUARTER_TURN });
    expect(quarterTokenToMove("M'")).toMatchObject({ axis: "x", layer: 0, angle: -QUARTER_TURN });
    expect(quarterTokenToMove("E")).toMatchObject({ axis: "y", layer: 0, angle: QUARTER_TURN });
    expect(quarterTokenToMove("S")).toMatchObject({ axis: "z", layer: 0, angle: -QUARTER_TURN });
  });

  test("move objects map back to canonical quarter tokens", () => {
    expect(moveToQuarterToken({ axis: "x", layer: -1, angle: QUARTER_TURN })).toBe("L");
    expect(moveToQuarterToken({ axis: "x", layer: -1, angle: -QUARTER_TURN })).toBe("L'");
    expect(moveToQuarterToken({ axis: "y", layer: 1, angle: -QUARTER_TURN })).toBe("U");
    expect(moveToQuarterToken({ axis: "y", layer: 1, angle: QUARTER_TURN })).toBe("U'");
    expect(moveToQuarterToken({ axis: "y", layer: -1, angle: QUARTER_TURN })).toBe("D");
    expect(moveToQuarterToken({ axis: "y", layer: -1, angle: -QUARTER_TURN })).toBe("D'");
    expect(moveToQuarterToken({ axis: "z", layer: -1, angle: QUARTER_TURN })).toBe("B");
    expect(moveToQuarterToken({ axis: "z", layer: -1, angle: -QUARTER_TURN })).toBe("B'");
    expect(moveToQuarterToken({ axis: "x", layer: 0, angle: QUARTER_TURN })).toBe("M");
    expect(moveToQuarterToken({ axis: "x", layer: 0, angle: -QUARTER_TURN })).toBe("M'");
    expect(moveToQuarterToken({ axis: "y", layer: 0, angle: QUARTER_TURN })).toBe("E");
    expect(moveToQuarterToken({ axis: "z", layer: 0, angle: -QUARTER_TURN })).toBe("S");
  });

  test.each([
    "R U L D F B R2 U2 L2 D2 F2 B2 R' U' L' D' F' B'",
    "R U R' U' F2 D L2 B U2 R2 D' F L B'",
    "L2 B2 D R F2 U' R2 D' B U L' F",
  ])("Kociemba solution can restore visual model for scramble: %s", (scramble) => {
    const solverCube = new Cube();
    solverCube.move(scramble);
    const solution = solverCube.solve();

    const virtualCube = createVirtualCube();
    applyAlgorithm(virtualCube, scramble);
    applyAlgorithm(virtualCube, solution);

    expect(isVirtualCubeSolved(virtualCube)).toBe(true);
  });

  test("Kociemba solution remains stable across many deterministic random scrambles", () => {
    const rng = createSeededRandom(20260209);

    for (let i = 0; i < 80; i += 1) {
      const scramble = generateScramble(rng, 24);
      const solverCube = new Cube();
      solverCube.move(scramble);
      const solution = solverCube.solve();

      const virtualCube = createVirtualCube();
      applyAlgorithm(virtualCube, scramble);
      applyAlgorithm(virtualCube, solution);

      expect(isVirtualCubeSolved(virtualCube)).toBe(true);
    }
  });

  test("Kociemba solution keeps visual state fully synced with cubejs for slice-heavy scrambles", () => {
    const rng = createSeededRandom(20260209);

    for (let i = 0; i < 60; i += 1) {
      const scramble = generateSliceScramble(rng, 24);
      const solverCube = new Cube();
      solverCube.move(scramble);
      const solution = solverCube.solve();
      solverCube.move(solution);

      const virtualCube = createVirtualCube();
      applyAlgorithm(virtualCube, scramble);
      applyAlgorithm(virtualCube, solution);

      expect(virtualCubeToFaceletString(virtualCube)).toBe(solverCube.asString());
    }
  });
});
