import { EPSILON, traceLaserBeams } from "./gameLogic.js";

const MAX_ATTEMPTS = 600;
const MAX_INITIAL_ATTEMPTS = 800;
const MAX_RECURSION_DEPTH = 15;
const MIDPOINT_TOLERANCE = 0.01;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const withinPlayableArea = (value, gridSize) =>
  value > 0.5 && value < gridSize - 0.5;

const roundToHalf = (value) => Math.round(value * 2) / 2;

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
  const maxBlockAttempts = Math.max(count * 40, 400);

  while (blocks.length < count && attempts < maxBlockAttempts) {
    attempts += 1;
    const x = randomInt(1, gridSize - 2);
    const y = randomInt(1, gridSize - 2);
    const key = `${x},${y}`;
    if (used.has(key)) continue;
    used.add(key);
    blocks.push({ x, y });
  }

  return blocks;
};

const collectCandidateTargets = (laser, blocks, gridSize, minReflections) => {
  const candidates = [];

  const traverse = (startX, startY, dirX, dirY, depth = 0) => {
    if (depth > MAX_RECURSION_DEPTH) return;

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
        if (tLeft > EPSILON && tLeft < minT && Math.abs(yLeft - centerY) < MIDPOINT_TOLERANCE) {
          minT = tLeft;
          hitBlock = block;
          hitSide = "left";
        }

        const tRight = (blockRight - startX) / dirX;
        const yRight = startY + tRight * dirY;
        if (tRight > EPSILON && tRight < minT && Math.abs(yRight - centerY) < MIDPOINT_TOLERANCE) {
          minT = tRight;
          hitBlock = block;
          hitSide = "right";
        }
      }

      if (Math.abs(dirY) > EPSILON) {
        const tTop = (blockTop - startY) / dirY;
        const xTop = startX + tTop * dirX;
        if (tTop > EPSILON && tTop < minT && Math.abs(xTop - centerX) < MIDPOINT_TOLERANCE) {
          minT = tTop;
          hitBlock = block;
          hitSide = "top";
        }

        const tBottom = (blockBottom - startY) / dirY;
        const xBottom = startX + tBottom * dirX;
        if (tBottom > EPSILON && tBottom < minT && Math.abs(xBottom - centerX) < MIDPOINT_TOLERANCE) {
          minT = tBottom;
          hitBlock = block;
          hitSide = "bottom";
        }
      }
    });

    let boundaryT = Infinity;
    if (dirX > EPSILON) boundaryT = Math.min(boundaryT, (gridSize - startX) / dirX);
    if (dirX < -EPSILON) boundaryT = Math.min(boundaryT, -startX / dirX);
    if (dirY > EPSILON) boundaryT = Math.min(boundaryT, (gridSize - startY) / dirY);
    if (dirY < -EPSILON) boundaryT = Math.min(boundaryT, -startY / dirY);

    if (boundaryT < minT) {
      minT = boundaryT;
      hitBlock = null;
    }

    if (!Number.isFinite(minT) || minT <= EPSILON) return;

    const endX = startX + minT * dirX;
    const endY = startY + minT * dirY;

    if (depth >= minReflections - 1) {
      const steps = Math.max(2, Math.floor(minT * 2));
      for (let i = 1; i < steps; i += 1) {
        const t = (i / steps) * minT;
        const px = startX + t * dirX;
        const py = startY + t * dirY;
        if (withinPlayableArea(px, gridSize) && withinPlayableArea(py, gridSize)) {
          candidates.push({ x: px, y: py, depth });
        }
      }
    }

    if (hitBlock) {
      let newDirX = dirX;
      let newDirY = dirY;

      if (hitSide === "left" || hitSide === "right") newDirX = -dirX;
      else if (hitSide === "top" || hitSide === "bottom") newDirY = -dirY;

      traverse(endX, endY, newDirX, newDirY, depth + 1);
    }
  };

  traverse(laser.x, laser.y, laser.dx, laser.dy);
  return candidates;
};

const selectTargets = (candidateTargets, targetCount) => {
  // 去重
  const unique = [];
  const seenKey = new Set();
  for (const cand of candidateTargets) {
    const roundedX = roundToHalf(cand.x);
    const roundedY = roundToHalf(cand.y);
    const key = `${roundedX},${roundedY}`;
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    unique.push({ ...cand, x: roundedX, y: roundedY });
  }

  const result = [];
  const plusUsed = new Set();
  const minusUsed = new Set();

  const dfs = (startIndex) => {
    if (result.length === targetCount) return true;
    if (startIndex >= unique.length) return false;

    for (let i = startIndex; i < unique.length; i++) {
      const cand = unique[i];
      const plus = roundToHalf(cand.y - cand.x).toFixed(1);
      const minus = roundToHalf(cand.y + cand.x).toFixed(1);
      if (plusUsed.has(plus) || minusUsed.has(minus)) continue;

      plusUsed.add(plus);
      minusUsed.add(minus);
      result.push({ x: cand.x, y: cand.y });

      if (dfs(i + 1)) return true;

      result.pop();
      plusUsed.delete(plus);
      minusUsed.delete(minus);
    }

    return false;
  };

  return dfs(0) ? result : null;
};

const segmentContainsPoint = (x1, y1, x2, y2, px, py) => {
  const tol = 1e-6;
  const minX = Math.min(x1, x2) - tol;
  const maxX = Math.max(x1, x2) + tol;
  const minY = Math.min(y1, y2) - tol;
  const maxY = Math.max(y1, y2) + tol;
  if (px < minX || px > maxX || py < minY || py > maxY) return false;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const cross = Math.abs((px - x1) * dy - (py - y1) * dx);
  if (cross > tol) return false;

  let denom = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  if (Math.abs(denom) < tol) return false;
  const u = Math.abs(dx) > Math.abs(dy) ? (px - x1) / dx : (py - y1) / dy;
  if (u <= EPSILON || u >= 1 - EPSILON) return false;

  return true;
};

const computeCandidateBlocks = (laser, blocks, gridSize) => {
  const { beams } = traceLaserBeams({ laser, blocks, targets: [], gridSize });
  const candidates = new Set();
  const existing = new Set(blocks.map((b) => `${b.x},${b.y}`));

  for (let x = 1; x <= gridSize - 2; x++) {
    for (let y = 1; y <= gridSize - 2; y++) {
      const key = `${x},${y}`;
      if (existing.has(key)) continue;

      const midpoints = [
        { px: x, py: y + 0.5 },
        { px: x + 1, py: y + 0.5 },
        { px: x + 0.5, py: y },
        { px: x + 0.5, py: y + 1 },
      ];

      for (const beam of beams) {
        for (const mid of midpoints) {
          if (segmentContainsPoint(beam.x1, beam.y1, beam.x2, beam.y2, mid.px, mid.py)) {
            candidates.add(key);
            break;
          }
        }
        if (candidates.has(key)) break;
      }
    }
  }

  return Array.from(candidates).map((key) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  });
};

const buildSolvedBlocks = (laser, blockCount, gridSize) => {
  const blocks = [];
  for (let i = 0; i < blockCount; i++) {
    const candidates = computeCandidateBlocks(laser, blocks, gridSize);
    if (!candidates.length) return null;
    const choice = candidates[randomInt(0, candidates.length - 1)];
    blocks.push(choice);
  }
  return blocks;
};

const generateInitialBlocks = (blockCount, gridSize, laser, targets, solvedBlocks) => {
  const solvedSet = new Set(solvedBlocks.map((b) => `${b.x},${b.y}`));
  for (let attempt = 0; attempt < MAX_INITIAL_ATTEMPTS; attempt++) {
    const blocks = placeBlocks(blockCount, gridSize);
    if (!blocks.length) continue;
    const { targetsHit } = traceLaserBeams({ laser, blocks, targets, gridSize });
    if (targetsHit.size !== 0) continue;
    const sameAsSolved = blocks.every((b) => solvedSet.has(`${b.x},${b.y}`));
    if (sameAsSolved) continue;
    return blocks;
  }
  return null;
};

export const generateProceduralLevel = (difficulty = 1, defaults = {}, depth = 0) => {
  const gridSize = defaults.gridSize ?? 8;
  const cellSize = defaults.cellSize;

  const normalizedDifficulty = Math.max(1, Math.min(3, difficulty));

  let blockCountRange;
  let targetCountRange;
  let minReflections;

  if (normalizedDifficulty === 1) {
    blockCountRange = [1, 3];
    targetCountRange = [1, 3];
    minReflections = 1;
  } else if (normalizedDifficulty === 2) {
    blockCountRange = [4, 4];
    targetCountRange = [4, 4];
    minReflections = 3;
  } else {
    const maxBlocksByGrid = Math.max(5, Math.min(gridSize - 2, 10));
    blockCountRange = [5, maxBlocksByGrid];
    targetCountRange = [5, 8];
    minReflections = 4;
  }

  const blockCount = randomInt(blockCountRange[0], blockCountRange[1]);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const laser = createLaserOnSide(gridSize);
    const solvedBlocks = buildSolvedBlocks(laser, blockCount, gridSize);
    if (!solvedBlocks || solvedBlocks.length !== blockCount) continue;

    const candidateTargets = collectCandidateTargets(laser, solvedBlocks, gridSize, minReflections);
    if (candidateTargets.length < targetCountRange[0]) continue;

    const allPlus = new Set(candidateTargets.map((cand) => roundToHalf(cand.y - cand.x).toFixed(1)));
    const allMinus = new Set(candidateTargets.map((cand) => roundToHalf(cand.y + cand.x).toFixed(1)));
    const maxFeasibleTargets = Math.min(allPlus.size, allMinus.size, targetCountRange[1]);
    if (maxFeasibleTargets < targetCountRange[0]) continue;

    const targetCount = randomInt(targetCountRange[0], maxFeasibleTargets);

    candidateTargets.sort((a, b) => b.depth - a.depth);
    const selectedTargets = selectTargets(candidateTargets, targetCount);
    if (!selectedTargets) continue;

    const solvedVerification = traceLaserBeams({
      laser,
      blocks: solvedBlocks,
      targets: selectedTargets,
      gridSize,
    });

    if ((solvedVerification.targetsHit?.size ?? 0) !== selectedTargets.length) {
      continue;
    }

    const initialBlocks = generateInitialBlocks(blockCount, gridSize, laser, selectedTargets, solvedBlocks);
    if (!initialBlocks) continue;

    return {
      id: `random-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      difficulty: normalizedDifficulty,
      gridSize,
      ...(cellSize ? { cellSize } : {}),
      laser,
      blocks: initialBlocks,
      targets: selectedTargets,
      solutionBlocks: solvedBlocks,
    };
  }

  if (depth >= 5) {
    throw new Error("Unable to generate a solvable laser maze level with current constraints.");
  }

  // 若当前随机失败，递归重试；递归层数很浅，不会造成性能问题
  return generateProceduralLevel(difficulty, defaults, depth + 1);
};
