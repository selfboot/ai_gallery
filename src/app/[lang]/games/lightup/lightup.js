// 格子状态的常量
const CellFlags = {
  BLACK: 1, // 墙壁
  NUMBERED: 2, // 带数字的墙壁
  NUMBERUSED: 4, // 数字已被用于解题
  IMPOSSIBLE: 8, // 不能放置灯泡
  LIGHT: 16, // 灯泡
  MARK: 32, // 标记
};

const Colors = {
  BACKGROUND: 0,
  GRID: 1,
  BLACK: 2, // 墙壁颜色
  LIGHT: 3, // 灯泡颜色
  LIT: 4, // 被照亮区域颜色
  ERROR: 5, // 错误提示颜色
  CURSOR: 6,
};

const Symmetry = {
  NONE: 0,
  REF2: 1, // 2路镜像
  ROT2: 2, // 2路旋转
  REF4: 3, // 4路镜像
  ROT4: 4, // 4路旋转
};

const F_SOLVE_FORCEUNIQUE = 1;
const F_SOLVE_DISCOUNTSETS = 2;
const F_SOLVE_ALLOWRECURSE = 4;

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

  getCell(x, y) {
    const index = y * this.width + x;
    return {
      lights: this.lights[index],
      flags: this.flags[index],
      index: index,
    };
  }

  setCell(x, y, lights, flags) {
    const index = y * this.width + x;
    this.lights[index] = lights;
    this.flags[index] = flags;
  }

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

function getSurrounds(state, ox, oy) {
  const points = [];

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

// Check if all cells are lit
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

// Check for overlapping lights
function gridOverlap(state) {
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      const cell = state.getCell(x, y);
      // If this position is a light and is lit more than once, there must be overlap
      if (cell.flags & CellFlags.LIGHT && cell.lights > 1) {
        return true;
      }
    }
  }
  return false;
}

// Check if the numbered wall is correct
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

// Check if the game is complete
function isGameComplete(state) {
  if (!isGridLit(state)) return false;
  if (gridOverlap(state)) return false;
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      if (!checkNumberedWall(state, x, y)) return false;
    }
  }

  return true;
}

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

function setBlacks(state, params, randomSeed) {
  let degree = 0,
    rotate = 0;
  let rw, rh;
  const wodd = state.width % 2 ? 1 : 0;
  const hodd = state.height % 2 ? 1 : 0;

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

  cleanBoard(state, false);
  const nblack = Math.floor((rw * rh * params.blackpc) / 100);

  // Generate random positions using Fisher-Yates shuffle
  const positions = [];
  for (let i = 0; i < rw * rh; i++) {
    positions.push(i);
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Place black squares
  for (let i = 0; i < nblack; i++) {
    const pos = positions[i];
    const x = pos % rw;
    const y = Math.floor(pos / rw);
    state.setCell(x, y, 0, state.getCell(x, y).flags | CellFlags.BLACK);
  }

  // Copy black squares based on symmetry
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

  // Special handling for the center point in ROT4 symmetry
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
  foreachLit(lightData, (lx, ly) => {
    const index = ly * state.width + lx;
    if (state.lights[index] === 1) {
      isDark = 1;
    }
  });
  return isDark;
}

/* Sets up an initial random correct position (i.e. every
 * space lit, and no lights lit by other lights) by filling the
 * grid with lights and then removing lights one by one at random. */
function placeLights(state) {
  // Place a light on all grid squares without lights.
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      const index = y * state.width + x;
      state.flags[index] &= ~CellFlags.MARK; // 清除标记
      if (!(state.flags[index] & CellFlags.BLACK)) {
        setLight(state, x, y, true);
      }
    }
  }

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
    const index = y * state.width + x;

    // Skip non-light and marked cells
    if (!(state.flags[index] & CellFlags.LIGHT)) continue;
    if (state.flags[index] & CellFlags.MARK) continue;

    const lightData = listLigths(state, x, y, false);
    // If we're not lighting any lights ourself, don't remove anything.
    let hasLitLights = false;
    foreachLit(lightData, (lx, ly) => {
      const lightIndex = ly * state.width + lx;
      if (state.flags[lightIndex] & CellFlags.LIGHT) {
        hasLitLights = true;
      }
    });
    if (!hasLitLights) continue;

    // Check whether removing lights we're lighting would cause anything
    // to go dark.
    let darkCount = 0;

    foreachLit(lightData, (lx, ly) => {
      const lightIndex = ly * state.width + lx;
      if (state.flags[lightIndex] & CellFlags.LIGHT) {
        if (checkDark(state, lx, ly)) {
          darkCount++;
        }
      }
    });

    if (darkCount === 0) {
      foreachLit(lightData, (lx, ly) => {
        const lightIndex = ly * state.width + lx;
        if (state.flags[lightIndex] & CellFlags.LIGHT) {
          setLight(state, lx, ly, 0);
        }
      });
      state.flags[index] |= CellFlags.MARK;
    }
    /* could get here if the line at [1] continue'd out of the loop. */
    if (!gridOverlap(state)) {
      return;
    }
  }
  if (gridOverlap(state)) {
    console.error("placeLights failed to resolve overlapping lights!");
    debugPrintState(state);
  }
}

// Place numbers on black walls
function placeNumbers(state) {
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      const index = y * state.width + x;
      if (!(state.flags[index] & CellFlags.BLACK)) continue;

      const surrounds = getSurrounds(state, x, y);
      let lightCount = 0;

      for (const point of surrounds) {
        const surroundIndex = point.y * state.width + point.x;
        if (state.flags[surroundIndex] & CellFlags.LIGHT) {
          lightCount++;
        }
      }

      state.lights[index] = lightCount;
      state.flags[index] |= CellFlags.NUMBERED;
    }
  }
}

function flagsFromDifficulty(difficulty) {
  let sflags = F_SOLVE_FORCEUNIQUE;
  if (difficulty >= 1) sflags |= F_SOLVE_DISCOUNTSETS;
  if (difficulty >= 2) sflags |= F_SOLVE_ALLOWRECURSE;
  return sflags;
}

// Remove all lights
function unplaceLights(state) {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const index = y * state.width + x;
      if (state.flags[index] & CellFlags.LIGHT) {
        setLight(state, x, y, false);
      }
      state.flags[index] &= ~CellFlags.IMPOSSIBLE;
      state.flags[index] &= ~CellFlags.NUMBERUSED;
    }
  }
}

function solveSub(state, solveFlags, depth, maxDepth) {
  const MAXRECURSE = 5;
  let maxrecurse = 0;

  if (maxDepth && maxDepth.value < depth) {
    maxDepth.value = depth;
  }
  
  if (solveFlags & F_SOLVE_ALLOWRECURSE) {
    maxrecurse = MAXRECURSE;
  }

  let scratch = null; 
  while (true) {
    /* Our own solver, from scratch, should never cause this to happen
    * (assuming a soluble grid). However, if we're trying to solve
    * from a half-completed *incorrect* grid this might occur; we
    * just return the 'no solutions' code in this case. */
    if (gridOverlap(state)) {
      return 0;
    }

    if (isGameComplete(state)) {
      return 1;
    }

    let ncanplace = 0;
    let didstuff = false;

    /* These 2 loops, and the functions they call, are the critical loops
     * for timing; any optimisations should look here first. */
    for (let x = 0; x < state.width; x++) {
      for (let y = 0; y < state.height; y++) {
        const index = y * state.width + x;
        const flags = state.flags[index];
        const lights = state.lights[index];

        ncanplace += couldPlaceLight(flags, lights);

        if (trySolveLight(state, x, y, flags, lights)) didstuff = true;
        if (trySolveNumber(state, x, y, flags, lights)) didstuff = true;
      }
    }

    if (didstuff) continue;
    if (!ncanplace) {
      /* nowhere to put a light, puzzle is unsoluble. */
      return 0;
    }

    if (solveFlags & F_SOLVE_DISCOUNTSETS) {
      for (let x = 0; x < state.width; x++) {
        for (let y = 0; y < state.height; y++) {
          const index = y * state.width + x;
          const flags = state.flags[index];
          const lights = state.lights[index];
          if (!scratch) {
            scratch = new SetScratch(state.width, state.height);
          }
          if (!(flags & CellFlags.BLACK) && lights === 0) {
            if (discountUnlit(state, x, y, scratch)) {
              didstuff = true;
              break;
            }
          } else if (flags & CellFlags.NUMBERED) {
            if (discountClue(state, x, y, scratch)) {
              didstuff = true;
              break;
            }
          }
        }
        if (didstuff) break;
      }
      if (didstuff) continue;
    }

    if (depth >= maxrecurse) {
      return -1;
    }

    /* Of all the squares that we could place a light, pick the one
    * that would light the most currently unlit squares. 
    * This heuristic was just plucked from the air; there may well be
    * a more efficient way of choosing a square to flip to minimise
    * recursion. */
    let bestx = -1, besty = -1, bestn = 0;
    for (let x = 0; x < state.width; x++) {
      for (let y = 0; y < state.height; y++) {
        const index = y * state.width + x;
        const flags = state.flags[index];
        const lights = state.lights[index];

        if (!couldPlaceLight(flags, lights)) continue;

        const lightData = listLigths(state, x, y, true);
        let n = 0;
        foreachLit(lightData, (lx, ly) => {
          const index = ly * state.width + lx;
          if (state.lights[index] === 0) {
            n++;
          }
        });

        if (n > bestn) {
          bestn = n;
          bestx = x;
          besty = y;
        }
      }
    }

    if (bestn === 0 || bestx < 0 || besty < 0) {
      throw new Error("Invalid best position found");
    }

    // Now we've chosen a plausible (x,y), try to solve it once as 'lit'
    // and once as 'impossible'; we need to make one copy to do this.
    const stateCopy = state.clone();

    state.flags[besty * state.width + bestx] |= CellFlags.IMPOSSIBLE;
    const selfSoluble = solveSub(state, solveFlags, depth + 1, maxDepth);

    if (!(solveFlags & F_SOLVE_FORCEUNIQUE) && selfSoluble > 0) {
      return selfSoluble;
    }

    setLight(stateCopy, bestx, besty, true);
    const copySoluble = solveSub(stateCopy, solveFlags, depth + 1, maxDepth);

    let ret;
    if ((solveFlags & F_SOLVE_FORCEUNIQUE) && 
        (copySoluble < 0 || selfSoluble < 0)) {
      ret = -1;
    } else if (copySoluble <= 0) {
      ret = selfSoluble;
    } else if (selfSoluble <= 0) {
      state.copyFrom(stateCopy);
      ret = copySoluble;
    } else {
      ret = copySoluble + selfSoluble;
    }

    return ret;
  }
}

// Fills in the (possibly partially-complete) game_state as far as it can,
// returning the number of possible solutions. If it returns >0 then the
// game_state will be in a solved state, but you won't know which one.
function doSolve(state, solveFlags, maxDepth) {
  for (let x = 0; x < state.width; x++) {
    for (let y = 0; y < state.height; y++) {
      state.flags[y * state.width + x] &= ~CellFlags.NUMBERUSED;
    }
  }
  
  return solveSub(state, solveFlags, 0, maxDepth);
}

// Check if the puzzle is valid
function puzzleIsGood(state, difficulty) {
  let nsol, mdepth = 0;
  const sflags = flagsFromDifficulty(difficulty);

  // Clear all lights
  unplaceLights(state);

  // Try to solve the puzzle
  nsol = doSolve(state, sflags, mdepth);

  // If recursion is not allowed and recursion is used, the puzzle is invalid
  if (!(sflags & F_SOLVE_ALLOWRECURSE) && mdepth > 0) {
    console.debug("Ignoring recursive puzzle.");
    return false;
  }
  console.debug(`${nsol} solutions found.`);
  // There must be exactly one solution
  return nsol === 1;
}

function couldPlaceLight(flags, lights) {
  if (flags & (CellFlags.BLACK | CellFlags.IMPOSSIBLE)) {
    return false;
  }
  return (lights > 0) ? false : true;
}

function trySolveLight(state, x, y, flags, lights) {
  if (lights > 0 || flags & CellFlags.BLACK) {
    return false;
  }

  /* We have an unlit square; count how many ways there are left to
  * place a light that lights us (including this square); if only
  * one, we must put a light there. Squares that could light us
  * are, of course, the same as the squares we would light... */
  let possibleX = -1, possibleY = -1, count = 0;
  const lightData = listLigths(state, x, y, true);

  foreachLit(lightData, (lx, ly) => {
    const index = ly * state.width + lx;
    if (couldPlaceLight(state.flags[index], state.lights[index])) {
      count++;
      possibleX = lx;
      possibleY = ly;
    }
  });

  if (count === 1) {
    setLight(state, possibleX, possibleY, true);
    return true;
  }

  return false;
}

/* For a given number square, determine whether we have enough info
 * to unambiguously place its lights. */
function trySolveNumber(state, x, y, flags, lights) {
  if (!(flags & CellFlags.NUMBERED)) return false;

  const surrounds = getSurrounds(state, x, y);
  let nlit = 0, npossible = 0;

  for (const point of surrounds) {
    const index = point.y * state.width + point.x;
    if (state.flags[index] & CellFlags.LIGHT) {
      nlit++;
    }
    if (couldPlaceLight(state.flags[index], state.lights[index])) {
      npossible++;
    }
  }

  const target = lights;
  if (nlit > target || nlit + npossible < target) {
    console.debug("Number at (%d,%d) is impossible.", x, y);
    return false;
  }

  if (nlit === target) {
    console.debug("Number at (%d,%d) is trivial; setting unlit to IMPOSSIBLE.", x, y);
    let didstuff = false;
    for (const point of surrounds) {
      const index = point.y * state.width + point.x;
      if (couldPlaceLight(state.flags[index], state.lights[index])) {
        state.flags[index] |= CellFlags.IMPOSSIBLE;
        didstuff = true;
      }
    }
    return didstuff;
  }

  if (nlit + npossible === target) {
    console.debug("Number at (%d,%d) is trivial; setting unlit to LIGHT.", x, y);
    let didstuff = false;
    for (const point of surrounds) {
      const index = point.y * state.width + point.x;
      if (couldPlaceLight(state.flags[index], state.lights[index])) {
        setLight(state, point.x, point.y, true);
        didstuff = true;
      }
    }
    return didstuff;
  }

  return false;
}

class SetScratch {
  constructor(width, height) {
    this.size = width + height;
    this.positions = new Array(this.size).fill(null).map(() => ({
      x: -1,
      y: -1,
      n: 0
    }));
    this.count = 0;
  }

  clear() {
    this.count = 0;
    this.positions.forEach(pos => {
      pos.x = -1;
      pos.y = -1;
      pos.n = 0;
    });
  }
  add(x, y) {
    if (this.count >= this.size) return false;
    this.positions[this.count].x = x;
    this.positions[this.count].y = y;
    this.positions[this.count].n = 0;
    this.count++;
    return true;
  }
}

/* XXX Find all the squares which would rule out (x,y); anything
* that would light it as well as squares adjacent to same clues
* as X assuming that clue only has one remaining light.
* Call the callback with each square. */
function tryRuleOut(state, x, y, scratch, n, callback) {
  const lightData = listLigths(state, x, y, false);

  // Find all squares that would rule out a light at (x,y) and call trl_cb
  foreachLit(lightData, (lx, ly) => {
    if (couldPlaceLight(
      state.flags[ly * state.width + lx],
      state.lights[ly * state.width + lx]
    )) {
      callback(state, lx, ly, scratch, n);
    }
  });

  const surrounds = getSurrounds(state, x, y);
  
  for (const s of surrounds) {
    const sIndex = s.y * state.width + s.x;
    if (!(state.flags[sIndex] & CellFlags.NUMBERED)) {
      continue;
    }
    
    const subSurrounds = getSurrounds(state, s.x, s.y);
    let currentLights = 0;
    for (const ss of subSurrounds) {
      const ssIndex = ss.y * state.width + ss.x;
      if (state.flags[ssIndex] & CellFlags.LIGHT) {
        currentLights++;
      }
    }
    const totalLights = state.lights[sIndex];
    /* We have a clue with tot_lights to fill, and curr_lights currently
      * around it. If adding a light at (x,y) fills up the clue (i.e.
      * curr_lights + 1 = tot_lights) then we need to discount all other
      * unlit squares around the clue. */
    if (currentLights + 1 === totalLights) {
      for (const ss of subSurrounds) {
        if (ss.x === x && ss.y === y) {
          continue;
        }
        if (couldPlaceLight(
          state.flags[ss.y * state.width + ss.x],
          state.lights[ss.y * state.width + ss.x]
        )) {
          callback(state, ss.x, ss.y, scratch, n);
        }
      }
    }
  }
}

function discountUnlit(state, x, y, scratch) {
  scratch.clear();

  const lightData = listLigths(state, x, y, true);

  foreachLit(lightData, (lx, ly) => {
    if (couldPlaceLight(
      state.flags[ly * state.width + lx],
      state.lights[ly * state.width + lx]
    )) {
      scratch.add(lx, ly);
    }
  });

  const didSomething = discountSet(state, scratch);
  return didSomething;
}

function discountSet(state, scratch) {
  let didSomething = false;

  if (scratch.count === 0) {
    return false;
  }

  for (let i = 0; i < scratch.count; i++) {
    const pos = scratch.positions[i];
    pos.n = 0;

    tryRuleOut(state, pos.x, pos.y, scratch, scratch.count,
      (state, rx, ry, scratch, n) => {
        pos.n++;
      }
    );
  }

  let bestIndex = -1;
  let bestCount = Number.MAX_SAFE_INTEGER;

  for (let i = 0; i < scratch.count; i++) {
    const pos = scratch.positions[i];
    if (pos.n < bestCount) {
      bestCount = pos.n;
      bestIndex = i;
    }
  }

  if (bestIndex !== -1) {
    const bestPos = scratch.positions[bestIndex];

    tryRuleOut(state, bestPos.x, bestPos.y, scratch, scratch.count,
      (state, rx, ry, scratch, n) => {
        const index = ry * state.width + rx;
        if (!(state.flags[index] & CellFlags.IMPOSSIBLE)) {
          state.flags[index] |= CellFlags.IMPOSSIBLE;
          didSomething = true;
        }
      }
    );
  }

  return didSomething;
}

function generateCombinations(r, n) {
  if (r > n) return [];
  if (r === 0) return [[]];
  if (r === n) {
    return [[...Array(n).keys()]];
  }

  const combinations = [];

  function combine(current, start) {
    if (current.length === r) {
      combinations.push([...current]);
      return;
    }

    for (let i = start; i < n; i++) {
      current.push(i);
      combine(current, i + 1);
      current.pop();
    }
  }

  combine([], 0);
  return combinations;
}

function discountClue(state, x, y, scratch) {
  const index = y * state.width + x;
  let m = state.lights[index];
  if (m === 0) return false;
  const surrounds = getSurrounds(state, x, y);
  let emptySpaces = [];

  for (const s of surrounds) {
    const sIndex = s.y * state.width + s.x;
    const flags = state.flags[sIndex];
    const lights = state.lights[sIndex];
    if (flags & CellFlags.LIGHT) {
      m--;
    }
    if (couldPlaceLight(flags, lights)) {
      emptySpaces.push(s);
    }
  }
  const n = emptySpaces.length;
  if (n === 0) return false;
  if (m < 0 || m > n) return false;

  let didSomething = false;
  const combinations = generateCombinations(n - m + 1, n);
  for (const combination of combinations) {
    discountClear(state, scratch);

    for (const index of combination) {
      const space = emptySpaces[index];
      scratch.add(space.x, space.y);
    }

    if (discountSet(state, scratch)) {
      didSomething = true;
    }
  }
  return didSomething;
}


function generateNewGame(params, random) {
  const MAX_TRIES = 20;
  
  // Generate random positions sequence
  const positions = [];
  for(let i = 0; i < params.w * params.h; i++) {
    positions.push(i);
  }
  shuffleArray(positions, random);
  
  while(true) {
    for(let tries = 0; tries < MAX_TRIES; tries++) {
      const state = new GameState(params.w, params.h);
      
      setBlacks(state, {
        w: params.w,
        h: params.h,
        blackpc: params.blackpc,
        symm: params.symm
      });

      placeLights(state);
      placeNumbers(state);

      if (!puzzleIsGood(state, params.difficulty)) {
        continue;
      }
      
      // Optimize puzzle - remove unnecessary numbers
      for(const pos of positions) {
        const x = pos % params.w;
        const y = Math.floor(pos / params.w);
        
        if(!(state.flags[y * params.w + x] & CellFlags.NUMBERED)) {
          continue;
        }
        
        // Try removing the number
        const oldNumber = state.lights[y * params.w + x];
        state.lights[y * params.w + x] = 0;
        state.flags[y * params.w + x] &= ~CellFlags.NUMBERED;
        
        // If removing the number makes the puzzle invalid, restore it
        if(!puzzleIsGood(state, params.difficulty)) {
          state.lights[y * params.w + x] = oldNumber;
          state.flags[y * params.w + x] |= CellFlags.NUMBERED;
        }
      }
      
      return state;
    }
    
    // If generation fails, increase black square percentage
    params.blackpc = Math.min(90, params.blackpc + 5);
  }
}

// Debug print the game state
function debugPrintState(state) {
  let output = "\nGame State:\n";

  output += "      ";
  for (let x = 0; x < state.width; x++) {
    output += `${x}   `;
  }
  output += "\n";

  for (let y = 0; y < state.height; y++) {
    output += `${y}   `;

    for (let x = 0; x < state.width; x++) {
      const cell = state.getCell(x, y);
      if (cell.flags & CellFlags.BLACK) {
        output += "■";
      } else if (cell.flags & CellFlags.LIGHT) {
        output += "★";
      } else if (cell.lights > 0) {
        output += "·";
      } else {
        output += "□";
      }
      output += "," + cell.lights;
      output += " ";
    }
    output += "\n";
  }

  output += `\nLights: ${state.nlights}`;
  output += `\nCompleted: ${state.completed ? "Yes" : "No"}`;

  console.log(output);
  return output;
}

export {
  CellFlags,
  Colors,
  Symmetry,
  GameState,
  getSurrounds,
  listLigths,
  setLight,
  isGridLit,
  gridOverlap,
  checkNumberedWall,
  isGameComplete,
  cleanBoard,
  setBlacks,
  placeLights,
  checkDark,
  placeNumbers,
  generateNewGame,
  debugPrintState,
  generateCombinations,
};
