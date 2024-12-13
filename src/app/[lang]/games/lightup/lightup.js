// 格子状态的常量
const CellFlags = {
  BLACK: 1, // 墙壁
  NUMBERED: 2, // 带数字的墙壁
  NUMBERUSED: 4, // 数字已被用于解题
  IMPOSSIBLE: 8, // 不能放置灯泡
  LIGHT: 16, // 灯泡
  MARK: 32, // 标记
};

// 颜色常量
const Colors = {
  BACKGROUND: 0,
  GRID: 1,
  BLACK: 2, // 墙壁颜色
  LIGHT: 3, // 灯泡颜色
  LIT: 4, // 被照亮区域颜色
  ERROR: 5, // 错误提示颜色
  CURSOR: 6,
};

// 对称类型
const Symmetry = {
  NONE: 0,
  REF2: 1, // 2路镜像
  ROT2: 2, // 2路旋转
  REF4: 3, // 4路镜像
  ROT4: 4, // 4路旋转
};

// 游戏状态类
class GameState {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    // For black squares, (optionally) the number
    // of surrounding lights. For non-black squares,
    // the number of times it's lit. size h*w
    this.lights = new Array(width * height).fill(0);

    this.flags = new Array(width * height).fill(0);
    this.nlights = 0;
    this.completed = false;
    this.usedSolve = false;
  }

  // 获取格子状态
  getCell(x, y) {
    const index = y * this.width + x;
    return {
      lights: this.lights[index],
      flags: this.flags[index],
      index: index,
    };
  }

  // 设置格子状态
  setCell(x, y, lights, flags) {
    const index = y * this.width + x;
    this.lights[index] = lights;
    this.flags[index] = flags;
  }

  // 复制游戏状态
  clone() {
    const newState = new GameState(this.width, this.height);
    newState.lights = [...this.lights];
    newState.flags = [...this.flags];
    newState.nlights = this.nlights;
    newState.completed = this.completed;
    newState.usedSolve = this.usedSolve;
    return newState;
  }
}

// 获取一个格子周围的相邻格子
function getSurrounds(state, ox, oy) {
  const points = [];

  // 检查并添加相邻点
  if (ox > 0) points.push({ x: ox - 1, y: oy, f: 0 });
  if (ox < state.width - 1) points.push({ x: ox + 1, y: oy, f: 0 });
  if (oy > 0) points.push({ x: ox, y: oy - 1, f: 0 });
  if (oy < state.height - 1) points.push({ x: ox, y: oy + 1, f: 0 });

  return points;
}

/* Function that executes 'callback' once per light in lld, including
 * the origin if include_origin is specified. 'callback' can use
 * lx and ly as the coords. */
function foreachLit(lightData, callback) {
  const ly = lightData.oy;
  for (let lx = lightData.minx; lx <= lightData.maxx; lx++) {
    if (lx === lightData.ox) continue;
    callback(lx, ly);
  }

  const lx = lightData.ox;
  for (let ly = lightData.miny; ly <= lightData.maxy; ly++) {
    if (!lightData.includeOrigin && ly === lightData.oy) continue;
    callback(lx, ly);
  }
}

// return data with all the tiles that would
// be illuminated by a light at point (ox,oy). If origin=1 then the
// origin is included in this list.
function listLigths(state, ox, oy, includeOrigin = true) {
  const data = {
    ox,
    oy,
    minx: ox,
    maxx: ox,
    miny: oy,
    maxy: oy,
    includeOrigin,
  };

  let y = oy;
  for (let x = ox - 1; x >= 0; x--) {
    const index = y * state.width + x;
    if (state.flags[index] & CellFlags.BLACK) break;
    if (x < data.minx) data.minx = x;
  }

  for (let x = ox + 1; x < state.width; x++) {
    const index = y * state.width + x;
    if (state.flags[index] & CellFlags.BLACK) break;
    if (x > data.maxx) data.maxx = x;
  }

  let x = ox;
  for (let y = oy - 1; y >= 0; y--) {
    const index = y * state.width + x;
    if (state.flags[index] & CellFlags.BLACK) break;
    if (y < data.miny) data.miny = y;
  }

  for (let y = oy + 1; y < state.height; y++) {
    const index = y * state.width + x;
    if (state.flags[index] & CellFlags.BLACK) break;
    if (y > data.maxy) data.maxy = y;
  }

  console.log("listLigths", data);
  return data;
}

// Set light state
function setLight(state, x, y, on) {
  const cell = state.getCell(x, y);

  // Ensure not black cell
  if (cell.flags & CellFlags.BLACK) {
    throw new Error("Cannot set light on black cell");
  }

  let diff = 0;
  let newFlags = cell.flags;

  // Remove light
  if (!on && cell.flags & CellFlags.LIGHT) {
    diff = -1;
    newFlags &= ~CellFlags.LIGHT;
    state.nlights--;
  }
  // Place light
  else if (on && !(cell.flags & CellFlags.LIGHT)) {
    diff = 1;
    newFlags |= CellFlags.LIGHT;
    state.nlights++;
  }

  state.setCell(x, y, cell.lights, newFlags);

  if (diff !== 0) {
    const lightData = listLigths(state, x, y, true);
    foreachLit(lightData, (lx, ly) => {
      const index = ly * state.width + lx;
      state.lights[index] += diff;
    });
  }
}

// 检查是否所有格子都被照亮
function isGridLit(state) {
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      const cell = state.getCell(x, y);
      if (!(cell.flags & CellFlags.BLACK) && cell.lights === 0) {
        return false;
      }
    }
  }
  return true;
}

// 检查是否有灯泡相互照射
function hasOverlappingLights(state) {
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      const cell = state.getCell(x, y);
      // 如果这个位置是灯泡，且被照射次数大于1，说明一定有重叠
      if (cell.flags & CellFlags.LIGHT && cell.lights > 1) {
        return true;
      }
    }
  }
  return false;
}

// 检查数字提示是否正确
function checkNumberedWall(state, x, y) {
  const cell = state.getCell(x, y);
  if (!(cell.flags & CellFlags.NUMBERED)) return true;

  const surrounds = getSurrounds(state, x, y);
  let lightCount = 0;

  for (const point of surrounds) {
    if (state.getCell(point.x, point.y).flags & CellFlags.LIGHT) {
      lightCount++;
    }
  }

  return lightCount === cell.lights;
}

// 检查游戏是否完成
function isGameComplete(state) {
  // 检查所有格子是否被照亮
  if (!isGridLit(state)) return false;

  // 检查是否有灯泡相互照射
  if (hasOverlappingLights(state)) return false;

  // 检查所有数字提示是否正确
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      if (!checkNumberedWall(state, x, y)) return false;
    }
  }

  return true;
}

// 清理游戏板
function cleanBoard(state, leaveBlacks) {
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      if (leaveBlacks) {
        state.setCell(x, y, 0, state.getCell(x, y).flags & CellFlags.BLACK);
      } else {
        state.setCell(x, y, 0, 0);
      }
    }
  }
  state.nlights = 0;
}

// 设置黑色墙壁
function setBlacks(state, params, randomSeed) {
  let degree = 0,
    rotate = 0;
  let rw, rh;
  const wodd = state.width % 2 ? 1 : 0;
  const hodd = state.height % 2 ? 1 : 0;

  // 根据对称类型设置参数
  switch (params.symm) {
    case Symmetry.NONE:
      degree = 1;
      rotate = 0;
      break;
    case Symmetry.ROT2:
      degree = 2;
      rotate = 1;
      break;
    case Symmetry.REF2:
      degree = 2;
      rotate = 0;
      break;
    case Symmetry.ROT4:
      degree = 4;
      rotate = 1;
      break;
    case Symmetry.REF4:
      degree = 4;
      rotate = 0;
      break;
  }

  // 计算需要随机填充的区域大小
  if (degree === 4) {
    rw = Math.floor(state.width / 2);
    rh = Math.floor(state.height / 2);
    if (!rotate) rw += wodd;
    rh += hodd;
  } else if (degree === 2) {
    rw = state.width;
    rh = Math.floor(state.height / 2);
    rh += hodd;
  } else {
    rw = state.width;
    rh = state.height;
  }

  // 清理游戏板并随机放置黑色方块
  cleanBoard(state, false);
  const nblack = Math.floor((rw * rh * params.blackpc) / 100);

  // 使用Fisher-Yates洗牌算法生成随机位置
  const positions = [];
  for (let i = 0; i < rw * rh; i++) {
    positions.push(i);
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // 放置黑色方块
  for (let i = 0; i < nblack; i++) {
    const pos = positions[i];
    const x = pos % rw;
    const y = Math.floor(pos / rw);
    state.setCell(x, y, 0, state.getCell(x, y).flags | CellFlags.BLACK);
  }

  // 根据对称性复制黑色方块
  if (params.symm !== Symmetry.NONE) {
    for (let x = 0; x < rw; x++) {
      for (let y = 0; y < rh; y++) {
        const points = [];
        if (degree === 4) {
          points.push({ x: x, y: y });
          points.push({ x: state.width - 1 - (rotate ? y : x), y: rotate ? x : y });
          points.push({ x: rotate ? state.width - 1 - x : x, y: state.height - 1 - y });
          points.push({ x: rotate ? y : state.width - 1 - x, y: state.height - 1 - (rotate ? x : y) });
        } else {
          points.push({ x: x, y: y });
          points.push({ x: rotate ? state.width - 1 - x : x, y: state.height - 1 - y });
        }

        const sourceFlags = state.getCell(points[0].x, points[0].y).flags;
        for (let i = 1; i < degree; i++) {
          state.setCell(points[i].x, points[i].y, 0, sourceFlags);
        }
      }
    }
  }

  // 特殊处理ROT4对称时的中心点
  if (degree === 4 && rotate && wodd && Math.random() < params.blackpc / 100) {
    const cx = Math.floor(state.width / 2);
    const cy = Math.floor(state.height / 2);
    state.setCell(cx, cy, 0, state.getCell(cx, cy).flags | CellFlags.BLACK);
  }
}

// Returns 1 if removing a light at (x,y) would cause a square to go dark.
function checkDark(state, x, y) {
  const lightData = listLigths(state, x, y, true);
  let isDark = 0;
  console.log("In checkDark", x, y, lightData);
  foreachLit(lightData, (lx, ly) => {
    if (state.getCell(lx, ly).lights === 1) {
      console.log("In checkDark", x, y, lx, ly, "only one light");
      isDark = 1;
    }
  });
  if (isDark) {
    console.log("IsDark", x, y, isDark);
  }
  return isDark;
}

/* Sets up an initial random correct position (i.e. every
 * space lit, and no lights lit by other lights) by filling the
 * grid with lights and then removing lights one by one at random. */
function placeLights(state) {
  // Place a light on all grid squares without lights.
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      state.setCell(x, y, 0, state.getCell(x, y).flags & ~CellFlags.MARK);
      if (!(state.getCell(x, y).flags & CellFlags.BLACK)) {
        setLight(state, x, y, 1);
      }
    }
  }
  console.log("placeLights", state.nlights);
  debugPrintState(state);

  const positions = [];
  for (let i = 0; i < state.width * state.height; i++) {
    positions.push(i);
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (const pos of positions) {
    const x = pos % state.width;
    const y = Math.floor(pos / state.width);
    const cell = state.getCell(x, y);

    // Skip non-light and marked cells
    if (!(cell.flags & CellFlags.LIGHT)) continue;
    if (cell.flags & CellFlags.MARK) continue;

    const lightData = listLigths(state, x, y, false);
    console.log("lightData", lightData);
    // If we're not lighting any lights ourself, don't remove anything.
    let hasLitLights = false;
    foreachLit(lightData, (lx, ly) => {
      const index = ly * state.width + lx;
      if (state.flags[index] & CellFlags.LIGHT) {
        hasLitLights = true;
      }
    });
    if (!hasLitLights) continue;

    // Check whether removing lights we're lighting would cause anything
    // to go dark.
    let darkCount = 0;

    foreachLit(lightData, (lx, ly) => {
      const index = ly * state.width + lx;
      if (state.flags[index] & CellFlags.LIGHT) {
        if (checkDark(state, lx, ly)) {
          darkCount++;
        }
      }
    });

    console.log("Out checkDark", x, y, cell.flags, cell.lights, darkCount, lightData);

    if (darkCount === 0) {
      foreachLit(lightData, (lx, ly) => {
        const index = ly * state.width + lx;
        if (state.flags[index] & CellFlags.LIGHT) {
          setLight(state, lx, ly, 0);
        }
      });
      const index = y * state.width + x;
      state.flags[index] |= CellFlags.MARK;
    }
    /* could get here if the line at [1] continue'd out of the loop. */
    if (!hasOverlappingLights(state)) {
      return;
    }
  }
  if (hasOverlappingLights(state)) {
    console.error("placeLights failed to resolve overlapping lights!");
    debugPrintState(state);
  }
}

// 为黑色墙壁添加数字
function placeNumbers(state) {
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      if (!(state.getCell(x, y).flags & CellFlags.BLACK)) continue;

      const surrounds = getSurrounds(state, x, y);
      let lightCount = 0;

      for (const point of surrounds) {
        if (state.getCell(point.x, point.y).flags & CellFlags.LIGHT) {
          lightCount++;
        }
      }

      state.setCell(x, y, lightCount, state.getCell(x, y).flags | CellFlags.NUMBERED);
    }
  }
}

// 添加一个调试用的状态打印函数
function debugPrintState(state) {
  let output = "\n当前游戏状态:\n";

  // 打印列号
  output += "  ";
  for (let x = 0; x < state.width; x++) {
    output += `${x} `;
  }
  output += "\n";

  // 打印每一行
  for (let y = 0; y < state.height; y++) {
    // 打印行号
    output += `${y} `;

    // 打印每个格子的状态
    for (let x = 0; x < state.width; x++) {
      const cell = state.getCell(x, y);
      if (cell.flags & CellFlags.BLACK) {
        // 黑色墙壁
        if (cell.lights > 0) {
          output += `${cell.lights}`; // 带数字的墙壁
        } else {
          output += "■"; // 普通墙壁
        }
      } else if (cell.flags & CellFlags.LIGHT) {
        output += "★"; // 灯泡
      } else if (cell.lights > 0) {
        output += "·"; // 被照亮的格子
      } else {
        output += "□"; // 空格子
      }
      output += " ";
    }
    output += "\n";
  }

  // 打印额外信息
  output += `\n灯泡数量: ${state.nlights}`;
  output += `\n游戏是否完成: ${state.completed ? "是" : "否"}`;

  console.log(output);
  return output;
}

// 修改导出方式
export {
  CellFlags,
  Colors,
  Symmetry,
  GameState,
  getSurrounds,
  listLigths,
  setLight,
  isGridLit,
  hasOverlappingLights,
  checkNumberedWall,
  isGameComplete,
  cleanBoard,
  setBlacks,
  placeLights,
  checkDark,
  placeNumbers,
  debugPrintState,
};
