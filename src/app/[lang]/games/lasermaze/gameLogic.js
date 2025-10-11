export const EPSILON = 1e-6;

const TARGET_EPSILON = 0.1;
const REFLECTION_LIMIT = 20;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const isPointOnSegment = (x1, y1, x2, y2, px, py, epsilon = TARGET_EPSILON) => {
  const cross = Math.abs((px - x1) * (y2 - y1) - (py - y1) * (x2 - x1));
  if (cross > epsilon) {
    return false;
  }

  const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
  return dot <= epsilon;
};

const cloneBlocks = (blocks = []) =>
  blocks.map((block, index) => ({
    id: block.id ?? `block-${index}`,
    x: block.x,
    y: block.y,
  }));

const cloneTargets = (targets = []) =>
  targets.map((target, index) => ({
    id: target.id ?? `target-${index}`,
    x: target.x,
    y: target.y,
  }));

const cloneLaser = (laser) =>
  laser
    ? {
        x: laser.x,
        y: laser.y,
        dx: laser.dx,
        dy: laser.dy,
      }
    : null;

export const targetKey = (target) => `${target.x},${target.y}`;

export const normalizeLevel = (level, defaults = {}) => {
  if (!level) {
    throw new Error("Level configuration is required");
  }

  const gridSize = clamp(level.gridSize ?? defaults.gridSize ?? 8, 3, 20);
  const cellSize = clamp(level.cellSize ?? defaults.cellSize ?? 72, 32, 120);

  return {
    id: level.id ?? "custom-level",
    name: level.name ?? defaults.name ?? "",
    nameKey: level.nameKey ?? defaults.nameKey ?? null,
    difficulty: level.difficulty ?? defaults.difficulty ?? null,
    gridSize,
    cellSize,
    laser: cloneLaser(level.laser),
    blocks: cloneBlocks(level.blocks),
    targets: cloneTargets(level.targets),
  };
};

export const traceLaserBeams = ({ laser, blocks, targets, gridSize }) => {
  if (!laser) {
    return { beams: [], targetsHit: new Set() };
  }

  const beams = [];
  const targetsHit = new Set();

  const trace = (startX, startY, dirX, dirY, depth = 0) => {
    if (depth > REFLECTION_LIMIT) {
      return;
    }

    let minT = Infinity;
    let hitBlockIndex = -1;
    let hitSide = null;

    blocks.forEach((block, index) => {
      const blockLeft = block.x;
      const blockRight = block.x + 1;
      const blockTop = block.y;
      const blockBottom = block.y + 1;
      const blockCenterX = block.x + 0.5;
      const blockCenterY = block.y + 0.5;

      if (Math.abs(dirX) > EPSILON) {
        const tLeft = (blockLeft - startX) / dirX;
        const hitYLeft = startY + tLeft * dirY;
        if (
          tLeft > EPSILON &&
          tLeft < minT &&
          Math.abs(hitYLeft - blockCenterY) < 0.01
        ) {
          minT = tLeft;
          hitBlockIndex = index;
          hitSide = "left";
        }

        const tRight = (blockRight - startX) / dirX;
        const hitYRight = startY + tRight * dirY;
        if (
          tRight > EPSILON &&
          tRight < minT &&
          Math.abs(hitYRight - blockCenterY) < 0.01
        ) {
          minT = tRight;
          hitBlockIndex = index;
          hitSide = "right";
        }
      }

      if (Math.abs(dirY) > EPSILON) {
        const tTop = (blockTop - startY) / dirY;
        const hitXTop = startX + tTop * dirX;
        if (
          tTop > EPSILON &&
          tTop < minT &&
          Math.abs(hitXTop - blockCenterX) < 0.01
        ) {
          minT = tTop;
          hitBlockIndex = index;
          hitSide = "top";
        }

        const tBottom = (blockBottom - startY) / dirY;
        const hitXBottom = startX + tBottom * dirX;
        if (
          tBottom > EPSILON &&
          tBottom < minT &&
          Math.abs(hitXBottom - blockCenterX) < 0.01
        ) {
          minT = tBottom;
          hitBlockIndex = index;
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
      hitBlockIndex = -1;
    }

    if (!Number.isFinite(minT) || minT <= EPSILON) {
      return;
    }

    const endX = startX + minT * dirX;
    const endY = startY + minT * dirY;

    beams.push({ x1: startX, y1: startY, x2: endX, y2: endY });

    targets.forEach((target) => {
      if (isPointOnSegment(startX, startY, endX, endY, target.x, target.y)) {
        targetsHit.add(targetKey(target));
      }
    });

    if (hitBlockIndex !== -1) {
      let newDirX = dirX;
      let newDirY = dirY;

      if (hitSide === "left" || hitSide === "right") {
        newDirX = -dirX;
      } else if (hitSide === "top" || hitSide === "bottom") {
        newDirY = -dirY;
      }

      trace(endX, endY, newDirX, newDirY, depth + 1);
    }
  };

  trace(laser.x, laser.y, laser.dx, laser.dy);

  return {
    beams,
    targetsHit,
  };
};

export const initializeGameState = (level, defaults) => {
  const normalizedLevel = normalizeLevel(level, defaults);
  const { beams, targetsHit } = traceLaserBeams({
    laser: normalizedLevel.laser,
    blocks: normalizedLevel.blocks,
    targets: normalizedLevel.targets,
    gridSize: normalizedLevel.gridSize,
  });

  return {
    ...normalizedLevel,
    beams,
    targetsHit,
  };
};

export const moveBlock = (state, blockIndex, { x, y }) => {
  const nextBlocks = state.blocks.map((block, index) =>
    index === blockIndex
      ? {
          ...block,
          x,
          y,
        }
      : block
  );

  const { beams, targetsHit } = traceLaserBeams({
    laser: state.laser,
    blocks: nextBlocks,
    targets: state.targets,
    gridSize: state.gridSize,
  });

  return {
    ...state,
    blocks: nextBlocks,
    beams,
    targetsHit,
  };
};

export const updateGameState = (state) => {
  const { beams, targetsHit } = traceLaserBeams({
    laser: state.laser,
    blocks: state.blocks,
    targets: state.targets,
    gridSize: state.gridSize,
  });

  return {
    ...state,
    beams,
    targetsHit,
  };
};
