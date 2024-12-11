import { trackEvent, CATEGORIES, EVENTS } from "@/app/utils/analytics";

export const ELEMENTS = {
  EMPTY: 0,
  WALL: 1,
  FLOOR: 2,
  TARGET: 3,
  BOX: 4,
  BOX_ON_TARGET: 5,
  PLAYER: 6,
  PLAYER_ON_TARGET: 7,
};

export const SPRITE_CONFIG = {
  SPRITE_SHEET: "https://slefboot-1251736664.file.myqcloud.com/20241114_ai_gallery_sokoban_sprites.png",
  SPRITE_SIZE: 64,
  ENDPOINT_SIZE: 32,
  SPRITE_POSITIONS: {
    GROUND: {
      CONCRETE: { x: 128, y: 192 },
      DIRT: { x: 128, y: 128 },
      SAND: { x: 128, y: 0 },
    },
    WALL: {
      BEIGE: { x: 64, y: 64 },
      BLACK: { x: 64, y: 0 },
      BROWN: { x: 0, y: 320 },
      GRAY: { x: 0, y: 256 },
    },
    PLAYER: {
      FRONT: { x: 320, y: 186, width: 42, height: 59 },
      LEFT: { x: 320, y: 186, width: 42, height: 59 },
      LEFT_MOVE: { x: 320, y: 304, width: 42, height: 58 },
      RIGHT: { x: 320, y: 128, width: 42, height: 58 },
      RIGHT_MOVE: { x: 320, y: 245, width: 42, height: 59 },
      DOWN_0: { x: 362, y: 248, width: 37, height: 59 },
      DOWN_1: { x: 320, y: 362, width: 37, height: 59 },
      DOWN_2: { x: 357, y: 362, width: 37, height: 59 },
      UP_0: { x: 384, y: 0, width: 37, height: 60 },
      UP_1: { x: 362, y: 188, width: 37, height: 60 },
      UP_2: { x: 362, y: 128, width: 37, height: 60 },
    },
    ENDPOINT: {
      RED: { x: 192, y: 384 },
      BLUE: { x: 128, y: 384 },
      YELLOW: { x: 224, y: 384 },
    },
    CRATE: {
      BLUE: { x: 192, y: 192 },
      YELLOW: { x: 192, y: 0 },
    },
  },
};

// RLE (Run Length Encoding) save map identifier
export const calculateMapId = (map) => {
  const width = map[0].length;
  const height = map.length;
  const flatMap = map.flat();
  let rle = '';
  let count = 1;
  let prev = flatMap[0];

  for (let i = 1; i < flatMap.length; i++) {
    const current = flatMap[i];
    if (current === prev) {
      count++;
    } else {
      rle += count > 1 ? `${count}x${prev},` : `${prev},`;
      count = 1;
      prev = current;
    }
  }
  rle += count > 1 ? `${count}x${prev}` : prev;

  const mapData = `${width},${height};${rle}`;
  return btoa(mapData);
};

export const decodeMapFromId = (id) => {
  try {
    const decodedId = decodeURIComponent(id);
    const mapData = atob(decodedId);
    const [dimensions, rle] = mapData.split(';');
    const [width, height] = dimensions.split(',').map(Number);

    if (!width || !height || width < 3 || height < 3) {
      throw new Error(`Invalid dimensions: ${width}x${height}`);
    }

    const flatMap = [];
    const groups = rle.split(',');

    for (const group of groups) {
      if (group.includes('x')) {
        const [count, element] = group.split('x');
        const num = Number(element);
        if (isNaN(num) || !Object.values(ELEMENTS).includes(num)) {
          throw new Error(`Invalid element: ${element}`);
        }
        flatMap.push(...Array(Number(count)).fill(num));
      } else {
        const num = Number(group);
        if (isNaN(num) || !Object.values(ELEMENTS).includes(num)) {
          throw new Error(`Invalid element: ${group}`);
        }
        flatMap.push(num);
      }
    }

    if (flatMap.length !== width * height) {
      throw new Error(`Invalid map size: expected ${width * height}, got ${flatMap.length}`);
    }

    const map = [];
    for (let y = 0; y < height; y++) {
      map.push(flatMap.slice(y * width, (y + 1) * width));
    }

    return map;
  } catch (error) {
    console.error('Error decoding map:', error);
    throw error;
  }
};

export class SokobanLogic {
  constructor(level = 1, levelMaps = null) {
    this.moves = 0;
    this.history = [
      {
        map: [],
        moves: 0,
        groupId: 0,
      },
    ];
    this.currentGroupId = 0;

    if (levelMaps) {
      this.level = level;
      this.levelMaps = levelMaps;
      this.map = this.levelMaps[level];
      this.history[0].map = this.map.map((row) => [...row]);
    }
  }

  setMap(map) {
    this.map = map;
    this.moves = 0;
    this.currentGroupId = 0;
    this.history = [
      {
        map: this.map.map((row) => [...row]),
        moves: 0,
        groupId: 0,
      },
    ];
  }

  startNewMoveGroup() {
    this.currentGroupId++;
  }

  movePlayer(direction) {
    if (this.isGameWon()) return null;

    const { playerPos, newPos, boxNewPos } = this.calculatePositions(direction);
    if (!playerPos) return null;

    const newMap = this.map.map((row) => [...row]);
    if (!this.isValidMove(newMap, newPos, boxNewPos)) return null;

    this.updateMapState(newMap, playerPos, newPos, boxNewPos);
    this.map = newMap;
    this.moves++;
    this.history.push({
      map: this.map.map((row) => [...row]),
      moves: this.moves,
      groupId: this.currentGroupId,
    });

    if (this.moves % 50 === 0) {
      trackEvent(CATEGORIES.Sokoban, EVENTS.Sokoban.GameMoves, {
        moves: this.moves,
      });
    }
    return newMap;
  }

  undo() {
    if (this.history.length <= 1) return null; // No undo steps

    const currentState = this.history[this.history.length - 1];
    const currentGroupId = currentState.groupId;

    let targetIndex = this.history.length - 2;
    if (currentGroupId === this.history[targetIndex].groupId) {
      while (targetIndex > 0 && this.history[targetIndex].groupId === currentGroupId) {
        targetIndex--;
      }
    }

    this.history = this.history.slice(0, targetIndex + 1);
    const lastState = this.history[this.history.length - 1];

    this.map = lastState.map.map((row) => [...row]);
    this.moves = lastState.moves;
    this.currentGroupId = lastState.groupId;

    return this.map;
  }

  calculatePositions(direction) {
    const playerPos = this.findPlayer();
    if (!playerPos) return {};

    const directionOffset = {
      UP: { x: 0, y: -1 },
      DOWN: { x: 0, y: 1 },
      LEFT: { x: -1, y: 0 },
      RIGHT: { x: 1, y: 0 },
    }[direction];

    const newPos = {
      x: playerPos.x + directionOffset.x,
      y: playerPos.y + directionOffset.y,
    };

    const boxNewPos = {
      x: newPos.x + directionOffset.x,
      y: newPos.y + directionOffset.y,
    };

    return { playerPos, newPos, boxNewPos };
  }

  findPlayer(mapToSearch = null) {
    const map = mapToSearch || this.map;
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === ELEMENTS.PLAYER || map[y][x] === ELEMENTS.PLAYER_ON_TARGET) {
          return { x, y };
        }
      }
    }
    return null;
  }

  isValidMove(map, newPos, boxNewPos) {
    // Check if the new position is a wall or empty
    if (map[newPos.y][newPos.x] === ELEMENTS.WALL || map[newPos.y][newPos.x] === ELEMENTS.EMPTY) {
      return false;
    }

    // Check If the new position is a box or a box on target
    if (map[newPos.y][newPos.x] === ELEMENTS.BOX || map[newPos.y][newPos.x] === ELEMENTS.BOX_ON_TARGET) {
      // Check if the new position of the box is valid
      if (
        map[boxNewPos.y][boxNewPos.x] === ELEMENTS.WALL ||
        map[boxNewPos.y][boxNewPos.x] === ELEMENTS.EMPTY ||
        map[boxNewPos.y][boxNewPos.x] === ELEMENTS.BOX ||
        map[boxNewPos.y][boxNewPos.x] === ELEMENTS.BOX_ON_TARGET
      ) {
        return false;
      }
    }

    return true;
  }

  updateMapState(map, playerPos, newPos, boxNewPos) {
    if (map[newPos.y][newPos.x] === ELEMENTS.BOX || map[newPos.y][newPos.x] === ELEMENTS.BOX_ON_TARGET) {
      // Process box new position
      map[boxNewPos.y][boxNewPos.x] =
        map[boxNewPos.y][boxNewPos.x] === ELEMENTS.TARGET ? ELEMENTS.BOX_ON_TARGET : ELEMENTS.BOX;
    }

    // Process player original position
    map[playerPos.y][playerPos.x] =
      this.map[playerPos.y][playerPos.x] === ELEMENTS.PLAYER_ON_TARGET
        ? ELEMENTS.TARGET
        : this.map[playerPos.y][playerPos.x] === ELEMENTS.PLAYER
        ? ELEMENTS.FLOOR
        : ELEMENTS.TARGET;

    // Process player new position(box old position)
    map[newPos.y][newPos.x] =
      map[newPos.y][newPos.x] === ELEMENTS.TARGET
        ? ELEMENTS.PLAYER_ON_TARGET
        : map[newPos.y][newPos.x] === ELEMENTS.BOX_ON_TARGET
        ? ELEMENTS.PLAYER_ON_TARGET
        : ELEMENTS.PLAYER;
  }

  isGameWon() {
    // Check if all boxes are on targets
    let targetCount = 0;
    let boxOnTargetCount = 0;

    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (
          this.map[y][x] === ELEMENTS.TARGET ||
          this.map[y][x] === ELEMENTS.BOX_ON_TARGET ||
          this.map[y][x] === ELEMENTS.PLAYER_ON_TARGET
        ) {
          targetCount++;
        }

        if (this.map[y][x] === ELEMENTS.BOX_ON_TARGET) {
          boxOnTargetCount++;
        }
      }
    }

    return targetCount > 0 && targetCount === boxOnTargetCount;
  }

  reset() {
    this.map = this.levelMaps[this.level];
    this.moves = 0;
    this.history = [
      {
        map: this.map.map((row) => [...row]),
        moves: this.moves,
        groupId: 0,
      },
    ];
    this.currentGroupId = 0;
  }

  getState() {
    return {
      map: this.map,
      moves: this.moves,
      isWon: this.isGameWon(),
    };
  }

  floodFill(map, y, x, visited) {
    if (
      y < 0 ||
      y >= map.length ||
      x < 0 ||
      x >= map[0].length ||
      visited[y][x] ||
      map[y][x] === ELEMENTS.WALL ||
      map[y][x] === ELEMENTS.EMPTY
    ) {
      return;
    }

    visited[y][x] = true;

    this.floodFill(map, y - 1, x, visited);
    this.floodFill(map, y + 1, x, visited);
    this.floodFill(map, y, x - 1, visited);
    this.floodFill(map, y, x + 1, visited);
  }

  validateMap(map) {
    if (!map || !map.length || !map[0].length) {
      return { isValid: false, error: "empty_map" };
    }
    const playerPos = this.findPlayer(map);
    if (!playerPos) return { isValid: false, error: "no_player" };

    const height = map.length;
    const width = map[0].length;
    const visited = Array(height)
      .fill()
      .map(() => Array(width).fill(false));
    this.floodFill(map, playerPos.y, playerPos.x, visited);

    // Check if the map is closed and reachable
    const reachableElements = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (visited[y][x]) {
          // If the reachable point is on the boundary, the map is not closed
          if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
            return { isValid: false, error: "wall_incomplete" };
          }
          // Collect elements in the reachable area
          reachableElements.push(map[y][x]);
        } else {
          // Check if there are non-blank elements in the unvisited area
          if (map[y][x] !== ELEMENTS.WALL && map[y][x] !== ELEMENTS.EMPTY) {
            return { isValid: false, error: "unreachable_elements" };
          }
        }
      }
    }

    // Check game element constraints in the reachable area
    const boxes = reachableElements.filter((cell) => [ELEMENTS.BOX, ELEMENTS.BOX_ON_TARGET].includes(cell)).length;
    const targets = reachableElements.filter((cell) =>
      [ELEMENTS.TARGET, ELEMENTS.BOX_ON_TARGET, ELEMENTS.PLAYER_ON_TARGET].includes(cell)
    ).length;

    // Check basic game elements
    if (boxes === 0) return { isValid: false, error: "no_box" };
    if (targets === 0) return { isValid: false, error: "no_target" };
    if (boxes < targets) return { isValid: false, error: "too_many_targets" };

    return { isValid: true };
  }

  // Check if a location is passable
  isWalkable(pos, ignoreBoxes = false) {
    // Check boundaries
    if (pos.x < 0 || pos.x >= this.map[0].length || pos.y < 0 || pos.y >= this.map.length) {
      return false;
    }

    const cell = this.map[pos.y][pos.x];
    // Walls and empty positions are not passable
    if (cell === ELEMENTS.WALL || cell === ELEMENTS.EMPTY) {
      return false;
    }
    // If ignoring boxes, then boxes are not passable
    if (!ignoreBoxes && (cell === ELEMENTS.BOX || cell === ELEMENTS.BOX_ON_TARGET)) {
      return false;
    }
    return true;
  }

  // Find the shortest path from start to end
  findPath(start, end, ignoreBoxes = false) {
    const queue = [[start]];
    const visited = new Set([`${start.x},${start.y}`]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current.x === end.x && current.y === end.y) {
        return path;
      }

      const directions = [
        { x: 0, y: -1, dir: "UP" },
        { x: 0, y: 1, dir: "DOWN" },
        { x: -1, y: 0, dir: "LEFT" },
        { x: 1, y: 0, dir: "RIGHT" },
      ];

      for (const { x, y, dir } of directions) {
        const next = {
          x: current.x + x,
          y: current.y + y,
          dir,
        };

        const key = `${next.x},${next.y}`;
        if (!visited.has(key) && this.isWalkable(next, ignoreBoxes)) {
          visited.add(key);
          queue.push([...path, next]);
        }
      }
    }

    return null;
  }

  // Auto move player to target position
  async autoMoveTo(targetPos) {
    const playerPos = this.findPlayer();
    const path = this.findPath(playerPos, targetPos);

    if (!path || path.length < 2) return false;

    // Return move direction sequence
    return path.slice(1).map((pos) => pos.dir);
  }

  // Check if three points are on the same line and return the direction
  checkStraightLine(playerPos, boxPos, targetPos) {
    if (playerPos.x === boxPos.x && boxPos.x === targetPos.x) {
      if (Math.abs(playerPos.y - boxPos.y) !== 1) return null;
      const direction = targetPos.y > boxPos.y ? "DOWN" : "UP";
      return {
        direction,
        distance: Math.abs(targetPos.y - boxPos.y),
      };
    }
    if (playerPos.y === boxPos.y && boxPos.y === targetPos.y) {
      if (Math.abs(playerPos.x - boxPos.x) !== 1) return null;
      const direction = targetPos.x > boxPos.x ? "RIGHT" : "LEFT";
      return {
        direction,
        distance: Math.abs(targetPos.x - boxPos.x),
      };
    }
    return null;
  }

  checkPathClear(boxPos, targetPos) {
    const dx = Math.sign(targetPos.x - boxPos.x);
    const dy = Math.sign(targetPos.y - boxPos.y);
    let x = boxPos.x + dx;
    let y = boxPos.y + dy;

    while (x !== targetPos.x || y !== targetPos.y) {
      const cell = this.map[y][x];
      if (cell === ELEMENTS.WALL || cell === ELEMENTS.BOX || cell === ELEMENTS.BOX_ON_TARGET) {
        return false;
      }
      x += dx;
      y += dy;
    }
    return true;
  }

  findPushPath(boxPos, targetPos) {
    const playerPos = this.findPlayer();
    const lineCheck = this.checkStraightLine(playerPos, boxPos, targetPos);
    if (!lineCheck) return null;
    if (!this.checkPathClear(boxPos, targetPos)) return null;

    const moves = [];
    for (let i = 0; i < lineCheck.distance; i++) {
      moves.push({
        type: "push",
        direction: lineCheck.direction,
      });
    }

    return moves;
  }
}

export const validateMap = (map) => {
  const logic = new SokobanLogic();
  return logic.validateMap(map);
};
