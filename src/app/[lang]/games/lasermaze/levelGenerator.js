import { EPSILON } from "./gameLogic";

const MAX_ATTEMPTS = 120;
const MAX_RECURSION_DEPTH = 15;
const MIDPOINT_TOLERANCE = 0.01;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const withinPlayableArea = (value, gridSize) =>
  value > 0.5 && value < gridSize - 0.5;

const createLaserOnSide = (gridSize) => {
  const side = randomInt(0, 3);
  switch (side) {
    case 0: // top
      return {
        x: 0.5 + randomInt(0, gridSize - 2),
        y: 0,
        dx: Math.random() > 0.5 ? 1 : -1,
        dy: 1,
      };
    case 1: // right
      return {
        x: gridSize,
        y: 0.5 + randomInt(0, gridSize - 2),
        dx: -1,
        dy: Math.random() > 0.5 ? 1 : -1,
      };
    case 2: // bottom
      return {
        x: 0.5 + randomInt(0, gridSize - 2),
        y: gridSize,
        dx: Math.random() > 0.5 ? 1 : -1,
        dy: -1,
      };
    default: // left
      return {
        x: 0,
        y: 0.5 + randomInt(0, gridSize - 2),
        dx: 1,
        dy: Math.random() > 0.5 ? 1 : -1,
      };
  }
};

const placeBlocks = (count, gridSize) => {
  const blocks = [];
  const used = new Set();

  let attempts = 0;
  const maxBlockAttempts = count * 20;

  while (blocks.length < count && attempts < maxBlockAttempts) {
    attempts += 1;
    const x = randomInt(1, gridSize - 2);
    const y = randomInt(1, gridSize - 2);
    const key = `${x},${y}`;

    if (!used.has(key)) {
      used.add(key);
      blocks.push({ x, y });
    }
  }

  return blocks;
};

export const generateProceduralLevel = (difficulty = 1, defaults = {}) => {
  const gridSize = defaults.gridSize ?? 8;
  const cellSize = defaults.cellSize;

  const normalizedDifficulty = Math.max(1, Math.min(5, difficulty));
  const blockCount = Math.min(1 + normalizedDifficulty, Math.max(1, gridSize - 2));
  const targetCount = Math.min(1 + Math.floor(normalizedDifficulty / 2), 3);
  const minReflections = normalizedDifficulty;

  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;

    const laser = createLaserOnSide(gridSize);
    const blocks = placeBlocks(blockCount, gridSize);

    if (blocks.length === 0) {
      continue;
    }

    const candidateTargets = [];

    const collectTargets = (startX, startY, dirX, dirY, depth = 0) => {
      if (depth > MAX_RECURSION_DEPTH) {
        return;
      }

      let minT = Infinity;
      let hitBlock = null;
      let hitSide = null;

      blocks.forEach((block) => {
        const blockLeft = block.x;
        const blockRight = block.x + 1;
        const blockTop = block.y;
        const blockBottom = block.y + 1;
        const centerX = block.x + 0.5;
        const centerY = block.y + 0.5;

        if (Math.abs(dirX) > EPSILON) {
          const tLeft = (blockLeft - startX) / dirX;
          const yLeft = startY + tLeft * dirY;
          if (
            tLeft > EPSILON &&
            tLeft < minT &&
            Math.abs(yLeft - centerY) < MIDPOINT_TOLERANCE
          ) {
            minT = tLeft;
            hitBlock = block;
            hitSide = "left";
          }

          const tRight = (blockRight - startX) / dirX;
          const yRight = startY + tRight * dirY;
          if (
            tRight > EPSILON &&
            tRight < minT &&
            Math.abs(yRight - centerY) < MIDPOINT_TOLERANCE
          ) {
            minT = tRight;
            hitBlock = block;
            hitSide = "right";
          }
        }

        if (Math.abs(dirY) > EPSILON) {
          const tTop = (blockTop - startY) / dirY;
          const xTop = startX + tTop * dirX;
          if (
            tTop > EPSILON &&
            tTop < minT &&
            Math.abs(xTop - centerX) < MIDPOINT_TOLERANCE
          ) {
            minT = tTop;
            hitBlock = block;
            hitSide = "top";
          }

          const tBottom = (blockBottom - startY) / dirY;
          const xBottom = startX + tBottom * dirX;
          if (
            tBottom > EPSILON &&
            tBottom < minT &&
            Math.abs(xBottom - centerX) < MIDPOINT_TOLERANCE
          ) {
            minT = tBottom;
            hitBlock = block;
            hitSide = "bottom";
          }
        }
      });

      let boundaryT = Infinity;
      if (dirX > EPSILON) {
        boundaryT = Math.min(boundaryT, (gridSize - startX) / dirX);
      }
      if (dirX < -EPSILON) {
        boundaryT = Math.min(boundaryT, -startX / dirX);
      }
      if (dirY > EPSILON) {
        boundaryT = Math.min(boundaryT, (gridSize - startY) / dirY);
      }
      if (dirY < -EPSILON) {
        boundaryT = Math.min(boundaryT, -startY / dirY);
      }

      if (boundaryT < minT) {
        minT = boundaryT;
        hitBlock = null;
      }

      if (!Number.isFinite(minT) || minT <= EPSILON) {
        return;
      }

      const endX = startX + minT * dirX;
      const endY = startY + minT * dirY;

      if (depth >= minReflections - 1) {
        const steps = Math.max(2, Math.floor(minT * 2));
        for (let i = 1; i < steps; i += 1) {
          const t = (i / steps) * minT;
          const px = startX + t * dirX;
          const py = startY + t * dirY;

          if (withinPlayableArea(px, gridSize) && withinPlayableArea(py, gridSize)) {
            candidateTargets.push({ x: px, y: py, depth });
          }
        }
      }

      if (hitBlock) {
        let newDirX = dirX;
        let newDirY = dirY;

        if (hitSide === "left" || hitSide === "right") {
          newDirX = -dirX;
        } else if (hitSide === "top" || hitSide === "bottom") {
          newDirY = -dirY;
        }

        collectTargets(endX, endY, newDirX, newDirY, depth + 1);
      }
    };

    collectTargets(laser.x, laser.y, laser.dx, laser.dy);

    if (candidateTargets.length >= targetCount) {
      candidateTargets.sort((a, b) => b.depth - a.depth);

      const selected = [];
      const seen = new Set();

      for (const target of candidateTargets) {
        const key = `${target.x.toFixed(1)},${target.y.toFixed(1)}`;
        if (!seen.has(key)) {
          seen.add(key);
          selected.push({ x: Number(target.x.toFixed(1)), y: Number(target.y.toFixed(1)) });
        }
        if (selected.length === targetCount) {
          break;
        }
      }

      if (selected.length === targetCount) {
        return {
          id: `random-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          nameKey: "lasermaze_generated_level",
          difficulty: normalizedDifficulty,
          gridSize,
          ...(cellSize ? { cellSize } : {}),
          laser,
          blocks,
          targets: selected,
        };
      }
    }
  }

  return {
    id: "fallback",
    nameKey: "lasermaze_generated_level",
    difficulty: normalizedDifficulty,
    gridSize,
    ...(cellSize ? { cellSize } : {}),
    laser: { x: 2.5, y: 1, dx: 1, dy: 1 },
    blocks: [{ x: 4, y: 3 }],
    targets: [{ x: 6.5, y: 3 }],
  };
};
