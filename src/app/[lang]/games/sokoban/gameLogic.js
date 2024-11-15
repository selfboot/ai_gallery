export const ELEMENTS = {
  EMPTY: 0,
  WALL: 1,
  BOX: 2,
  TARGET: 3,
  PLAYER: 4,
  BOX_ON_TARGET: 5,
  PLAYER_ON_TARGET: 6,
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
    },
    CRATE_DARK: {
      BLUE: { x: 256, y: 320 },
    },
  },
};

export class SokobanLogic {
  constructor(difficulty = 100) {
    this.difficulty = difficulty;
    this.map = this.generateMap(difficulty);
    this.moves = 0;
    this.estimatedSteps = Math.floor(difficulty / 10) + 10;
  }

  isInBounds(x, y, size) {
    return x >= 0 && x < size && y >= 0 && y < size;
  }

  isCorner(map, x, y) {
    const size = map.length;
    if (!this.isInBounds(x, y, size)) return false;

    const horizontalWall =
      this.isInBounds(x - 1, y, size) &&
      map[y][x - 1] === ELEMENTS.WALL &&
      this.isInBounds(x + 1, y, size) &&
      map[y][x + 1] === ELEMENTS.WALL;

    const verticalWall =
      this.isInBounds(x, y - 1, size) &&
      map[y - 1][x] === ELEMENTS.WALL &&
      this.isInBounds(x, y + 1, size) &&
      map[y + 1][x] === ELEMENTS.WALL;

    return horizontalWall || verticalWall;
  }

  generateMap(difficulty) {
    // Calculate map size and boxes based on difficulty
    const config = this.calculateMapConfig(difficulty);
    const map = this.initializeEmptyMap(config.size);
    this.addBoundaryWalls(map);
    this.addInternalWalls(map, difficulty);
    
    const boxPositions = this.placeBoxes(map, config.boxes);
    const targetPositions = this.placeTargets(map, config.boxes);
    this.placePlayer(map);

    return map;
  }

  calculateMapConfig(difficulty) {
    if (difficulty <= 200) return { size: 8, boxes: Math.max(1, Math.floor(difficulty / 100)) };
    if (difficulty <= 400) return { size: 10, boxes: Math.max(2, Math.floor(difficulty / 150)) };
    if (difficulty <= 700) return { size: 12, boxes: Math.max(3, Math.floor(difficulty / 200)) };
    return { size: 15, boxes: Math.max(4, Math.floor(difficulty / 250)) };
  }

  initializeEmptyMap(size) {
    return Array(size).fill().map(() => Array(size).fill(ELEMENTS.EMPTY));
  }

  addBoundaryWalls(map) {
    const size = map.length;
    for (let i = 0; i < size; i++) {
      map[0][i] = ELEMENTS.WALL;
      map[size - 1][i] = ELEMENTS.WALL;
      map[i][0] = ELEMENTS.WALL;
      map[i][size - 1] = ELEMENTS.WALL;
    }
  }

  addInternalWalls(map, difficulty) {
    const size = map.length;
    const wallDensity = Math.min(0.3, difficulty / 3000);
    
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (Math.random() < wallDensity) {
          map[y][x] = ELEMENTS.WALL;
        }
      }
    }
  }

  placeBoxes(map, boxCount) {
    const positions = [];
    for (let i = 0; i < boxCount; i++) {
      const pos = this.findRandomEmptyPosition(map);
      if (pos && !this.isCorner(map, pos.x, pos.y)) {
        map[pos.y][pos.x] = ELEMENTS.BOX;
        positions.push(pos);
      }
    }
    return positions;
  }

  placeTargets(map, targetCount) {
    const positions = [];
    for (let i = 0; i < targetCount; i++) {
      const pos = this.findRandomEmptyPosition(map);
      if (pos && !this.isCorner(map, pos.x, pos.y)) {
        map[pos.y][pos.x] = ELEMENTS.TARGET;
        positions.push(pos);
      }
    }
    return positions;
  }

  placePlayer(map) {
    const pos = this.findRandomEmptyPosition(map);
    if (pos && !this.isCorner(map, pos.x, pos.y)) {
      map[pos.y][pos.x] = ELEMENTS.PLAYER;
    }
  }

  findRandomEmptyPosition(map) {
    const size = map.length;
    let attempts = 0;
    while (attempts < 100) {
      const x = 1 + Math.floor(Math.random() * (size - 2));
      const y = 1 + Math.floor(Math.random() * (size - 2));
      if (map[y][x] === ELEMENTS.EMPTY) {
        return { x, y };
      }
      attempts++;
    }
    return null;
  }

  movePlayer(direction) {
    if (this.isGameWon()) return null;

    const { playerPos, newPos, boxNewPos } = this.calculatePositions(direction);
    if (!playerPos) return null;

    const newMap = this.map.map(row => [...row]);
    if (!this.isValidMove(newMap, newPos, boxNewPos)) return null;

    this.updateMapState(newMap, playerPos, newPos, boxNewPos);
    this.map = newMap;
    this.moves++;
    
    return newMap;
  }

  calculatePositions(direction) {
    const playerPos = this.findPlayer();
    if (!playerPos) return {};

    const directionOffset = {
      UP: { x: 0, y: -1 },
      DOWN: { x: 0, y: 1 },
      LEFT: { x: -1, y: 0 },
      RIGHT: { x: 1, y: 0 }
    }[direction];

    const newPos = {
      x: playerPos.x + directionOffset.x,
      y: playerPos.y + directionOffset.y
    };

    const boxNewPos = {
      x: newPos.x + directionOffset.x,
      y: newPos.y + directionOffset.y
    };

    return { playerPos, newPos, boxNewPos };
  }

  findPlayer() {
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === ELEMENTS.PLAYER || 
            this.map[y][x] === ELEMENTS.PLAYER_ON_TARGET) {
          return { x, y };
        }
      }
    }
    return null;
  }

  isValidMove(map, newPos, boxNewPos) {
    if (map[newPos.y][newPos.x] === ELEMENTS.WALL) return false;

    if (map[newPos.y][newPos.x] === ELEMENTS.BOX || 
        map[newPos.y][newPos.x] === ELEMENTS.BOX_ON_TARGET) {
      if (map[boxNewPos.y][boxNewPos.x] === ELEMENTS.WALL ||
          map[boxNewPos.y][boxNewPos.x] === ELEMENTS.BOX ||
          map[boxNewPos.y][boxNewPos.x] === ELEMENTS.BOX_ON_TARGET) {
        return false;
      }
    }

    return true;
  }

  updateMapState(map, playerPos, newPos, boxNewPos) {
    if (map[newPos.y][newPos.x] === ELEMENTS.BOX || 
        map[newPos.y][newPos.x] === ELEMENTS.BOX_ON_TARGET) {
      map[boxNewPos.y][boxNewPos.x] = 
        map[boxNewPos.y][boxNewPos.x] === ELEMENTS.TARGET ? 
        ELEMENTS.BOX_ON_TARGET : ELEMENTS.BOX;
    }

    map[playerPos.y][playerPos.x] = 
      this.map[playerPos.y][playerPos.x] === ELEMENTS.PLAYER_ON_TARGET ? 
      ELEMENTS.TARGET : ELEMENTS.EMPTY;

    map[newPos.y][newPos.x] = 
      map[newPos.y][newPos.x] === ELEMENTS.TARGET ? 
      ELEMENTS.PLAYER_ON_TARGET : ELEMENTS.PLAYER;
  }

  isGameWon() {
    // Check if all boxes are on targets
    let targetCount = 0;
    let boxOnTargetCount = 0;

    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === ELEMENTS.TARGET || 
            this.map[y][x] === ELEMENTS.BOX_ON_TARGET || 
            this.map[y][x] === ELEMENTS.PLAYER_ON_TARGET) {
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
    this.map = this.generateMap(this.difficulty);
    this.moves = 0;
    this.estimatedSteps = Math.floor(this.difficulty / 10) + 10;
  }

  getState() {
    return {
      map: this.map,
      moves: this.moves,
      estimatedSteps: this.estimatedSteps,
      isWon: this.isGameWon()
    };
  }
}
