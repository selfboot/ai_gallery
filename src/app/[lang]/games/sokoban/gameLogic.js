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
    },
    CRATE_DARK: {
      BLUE: { x: 256, y: 320 },
    },
  },
};

export class SokobanLogic {
  constructor(level = 1, levelMaps) {
    this.level = level;
    this.levelMaps = levelMaps;
    this.map = this.levelMaps[level];
    this.moves = 0;
    this.history = [{
      map: this.map.map(row => [...row]),
      moves: this.moves
    }];
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
      map: this.map.map(row => [...row]),
      moves: this.moves
    });
    return newMap;
  }

  undo() {
    if (this.history.length <= 1) return null; // 没有可撤销的步骤
  
    this.history.pop();
    const lastState = this.history[this.history.length - 1];
    this.map = lastState.map.map(row => [...row]);
    this.moves = lastState.moves;

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

  findPlayer() {
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === ELEMENTS.PLAYER || this.map[y][x] === ELEMENTS.PLAYER_ON_TARGET) {
          return { x, y };
        }
      }
    }
    return null;
  }

  isValidMove(map, newPos, boxNewPos) {
    // 检查新位置是否是墙或空地
    if (map[newPos.y][newPos.x] === ELEMENTS.WALL || map[newPos.y][newPos.x] === ELEMENTS.EMPTY) {
      return false;
    }

    // 如果新位置是箱子或箱子在目标点上
    if (map[newPos.y][newPos.x] === ELEMENTS.BOX || map[newPos.y][newPos.x] === ELEMENTS.BOX_ON_TARGET) {
      // 检查箱子的新位置是否有效
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
    // console.log("updateMapState", playerPos.y, playerPos.x, newPos.y, newPos.x, boxNewPos.y, boxNewPos.x);

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
    this.history = [{
      map: this.map.map(row => [...row]),
      moves: this.moves
    }];
  }

  getState() {
    return {
      map: this.map,
      moves: this.moves,
      isWon: this.isGameWon(),
    };
  }
}
