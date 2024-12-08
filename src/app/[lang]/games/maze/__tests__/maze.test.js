import { buildMaze } from '../lib/main';
import {
  SHAPE_SQUARE,
  SHAPE_TRIANGLE,
  SHAPE_HEXAGON,
  SHAPE_CIRCLE,
  ALGORITHM_BINARY_TREE,
  ALGORITHM_SIDEWINDER,
  ALGORITHM_ALDOUS_BRODER,
  ALGORITHM_WILSON,
  ALGORITHM_HUNT_AND_KILL,
  ALGORITHM_RECURSIVE_BACKTRACK,
  ALGORITHM_KRUSKAL,
  ALGORITHM_SIMPLIFIED_PRIMS,
  ALGORITHM_TRUE_PRIMS,
  ALGORITHM_ELLERS,
  EXITS_HORIZONTAL,
  EXITS_VERTICAL,
  EXITS_HARDEST,
  METADATA_START_CELL,
  METADATA_END_CELL,
  METADATA_PATH,
} from '../lib/constants';

describe('Maze Generation', () => {
  const createMockSvgElement = () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('width', '500');
    el.setAttribute('height', '500');
    return el;
  };

  const shapes = [
    { shape: SHAPE_SQUARE, name: 'Square' },
    { shape: SHAPE_TRIANGLE, name: 'Triangle' },
    { shape: SHAPE_HEXAGON, name: 'Hexagon' },
    { shape: SHAPE_CIRCLE, name: 'Circle' }
  ];

  const algorithms = [
    { algo: ALGORITHM_BINARY_TREE, name: 'Binary Tree' },
    { algo: ALGORITHM_SIDEWINDER, name: 'Sidewinder' },
    { algo: ALGORITHM_ALDOUS_BRODER, name: 'Aldous Broder' },
    { algo: ALGORITHM_WILSON, name: 'Wilson' },
    { algo: ALGORITHM_HUNT_AND_KILL, name: 'Hunt and Kill' },
    { algo: ALGORITHM_RECURSIVE_BACKTRACK, name: 'Recursive Backtrack' },
    { algo: ALGORITHM_KRUSKAL, name: 'Kruskal' },
    { algo: ALGORITHM_SIMPLIFIED_PRIMS, name: 'Simplified Prims' },
    { algo: ALGORITHM_TRUE_PRIMS, name: 'True Prims' },
    { algo: ALGORITHM_ELLERS, name: 'Ellers' }
  ];

  const exitConfigs = [
    { config: EXITS_HORIZONTAL, name: 'Horizontal' },
    { config: EXITS_VERTICAL, name: 'Vertical' },
    { config: EXITS_HARDEST, name: 'Hardest' }
  ];

  describe('Maze Shapes', () => {
    shapes.forEach(({ shape, name }) => {
      test(`should generate ${name} maze correctly`, () => {
        const config = {
          element: createMockSvgElement(),
          grid: {
            cellShape: shape,
            width: shape === SHAPE_CIRCLE ? undefined : 5,
            height: shape === SHAPE_CIRCLE ? undefined : 5,
            layers: shape === SHAPE_CIRCLE ? 5 : undefined,
          },
          algorithm: ALGORITHM_RECURSIVE_BACKTRACK,
          exitConfig: EXITS_HORIZONTAL,
          randomSeed: 12345,
        };

        const maze = buildMaze(config);
        expect(maze).toBeTruthy();

        if (shape === SHAPE_CIRCLE) {
          expect(maze.metadata.layers).toBe(5);
        } else {
          expect(maze.metadata.width).toBe(5);
          expect(maze.metadata.height).toBe(5);
        }

        expect(maze.cellCount).toBeGreaterThan(0);

        if (shape === SHAPE_SQUARE) {
          expect(maze.isSquare).toBe(true);
        } else {
          expect(maze.isSquare).toBe(false);
        }

        maze.runAlgorithm.toCompletion();
        let unlinkedCells = 0;
        maze.forEachCell(cell => {
          if (cell.links.length === 0) {
            unlinkedCells++;
          }
        });
        expect(unlinkedCells).toBe(0);
      });
    });
  });

  describe('Maze Algorithms', () => {
    algorithms.forEach(({ algo, name }) => {
      test(`should generate maze using ${name} algorithm`, () => {
        const config = {
          element: createMockSvgElement(),
          grid: {
            cellShape: SHAPE_SQUARE,
            width: 5,
            height: 5,
          },
          algorithm: algo,
          exitConfig: EXITS_HORIZONTAL,
          randomSeed: 12345,
        };

        const maze = buildMaze(config);
        maze.runAlgorithm.toCompletion();

        expect(maze).toBeTruthy();

        let unvisitedCells = 0;
        maze.forEachCell(cell => {
          if (cell.links.length === 0) {
            unvisitedCells++;
          }
        });
        expect(unvisitedCells).toBe(0);
      });
    });
  });

  describe('Exit Configurations', () => {
    exitConfigs.forEach(({ config, name }) => {
      test(`should generate maze with ${name} exits`, () => {
        const mazeConfig = {
          element: createMockSvgElement(),
          grid: {
            cellShape: SHAPE_SQUARE,
            width: 5,
            height: 5,
          },
          algorithm: ALGORITHM_RECURSIVE_BACKTRACK,
          exitConfig: config,
          randomSeed: 12345,
        };

        const maze = buildMaze(mazeConfig);
        maze.runAlgorithm.toCompletion();

        let hasStart = false;
        let hasEnd = false;
        maze.forEachCell(cell => {
          if (cell.metadata[METADATA_START_CELL]) hasStart = true;
          if (cell.metadata[METADATA_END_CELL]) hasEnd = true;
        });

        expect(hasStart).toBe(true);
        expect(hasEnd).toBe(true);
      });
    });
  });

  test('should generate consistent maze with same seed', () => {
    const seed = 12345;
    const config = {
      element: createMockSvgElement(),
      grid: {
        cellShape: SHAPE_SQUARE,
        width: 5,
        height: 5,
      },
      algorithm: ALGORITHM_RECURSIVE_BACKTRACK,
      exitConfig: EXITS_HORIZONTAL,
      randomSeed: seed,
    };

    const maze1 = buildMaze(config);
    const maze2 = buildMaze(config);

    maze1.runAlgorithm.toCompletion();
    maze2.runAlgorithm.toCompletion();

    let cellsMatch = true;
    maze1.forEachCell(cell1 => {
      const cell2 = maze2.getCellByCoordinates(cell1.coords);
      if (cell1.links.length !== cell2.links.length) {
        cellsMatch = false;
      }
    });

    expect(cellsMatch).toBe(true);
  });

  test('should generate fully connected maze', () => {
    const config = {
      element: createMockSvgElement(),
      grid: {
        cellShape: SHAPE_SQUARE,
        width: 5,
        height: 5,
      },
      algorithm: ALGORITHM_RECURSIVE_BACKTRACK,
      exitConfig: EXITS_HORIZONTAL,
      randomSeed: 12345,
    };

    const maze = buildMaze(config);
    maze.runAlgorithm.toCompletion();

    let startCell;
    maze.forEachCell((cell) => {
      if (cell.metadata?.[METADATA_START_CELL]) {
        startCell = cell;
      }
    });

    expect(startCell).toBeTruthy();

    const visited = new Set();
    function dfs(cell) {
      visited.add(cell.id);
      cell.links.forEach(neighbor => {
        if (!visited.has(neighbor.id)) {
          dfs(neighbor);
        }
      });
    }

    dfs(startCell);
    expect(visited.size).toBe(maze.cellCount);
  });

  describe('Maze Path Validation', () => {
    const createBasicConfig = (shape = SHAPE_SQUARE) => ({
      element: createMockSvgElement(),
      grid: {
        cellShape: shape,
        width: shape === SHAPE_CIRCLE ? undefined : 5,
        height: shape === SHAPE_CIRCLE ? undefined : 5,
        layers: shape === SHAPE_CIRCLE ? 5 : undefined,
      },
      algorithm: ALGORITHM_RECURSIVE_BACKTRACK,
      exitConfig: EXITS_HORIZONTAL,
      randomSeed: 12345,
    });

    test('should have valid path from start to end', () => {
      const maze = buildMaze(createBasicConfig());
      maze.runAlgorithm.toCompletion();

      let startCell, endCell;
      maze.forEachCell((cell) => {
        if (cell.metadata[METADATA_START_CELL]) startCell = cell;
        if (cell.metadata[METADATA_END_CELL]) endCell = cell;
      });

      expect(startCell).toBeTruthy();
      expect(endCell).toBeTruthy();

      maze.findPathBetween(startCell.coords, endCell.coords);
      const path = maze.metadata[METADATA_PATH];

      expect(path).toBeTruthy();
      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBeGreaterThan(1);

      for (let i = 1; i < path.length; i++) {
        const currentCoords = path[i];
        const previousCoords = path[i - 1];
        const currentCell = maze.getCellByCoordinates(currentCoords);
        const previousCell = maze.getCellByCoordinates(previousCoords);

        expect(currentCell.isLinkedTo(previousCell)).toBe(true);
      }
    });

    test('should have valid paths for all shapes', () => {
      shapes.forEach(({ shape, name }) => {
        const maze = buildMaze(createBasicConfig(shape));
        maze.runAlgorithm.toCompletion();

        let startCell, endCell;
        maze.forEachCell((cell) => {
          if (cell.metadata[METADATA_START_CELL]) startCell = cell;
          if (cell.metadata[METADATA_END_CELL]) endCell = cell;
        });

        expect(startCell).toBeTruthy();
        expect(endCell).toBeTruthy();

        maze.findPathBetween(startCell.coords, endCell.coords);
        const path = maze.metadata[METADATA_PATH];

        expect(path).toBeTruthy();
        expect(path.length).toBeGreaterThan(1);
      });
    });

    test('should have valid paths for all algorithms', () => {
      algorithms.forEach(({ algo, name }) => {
        const config = {
          ...createBasicConfig(),
          algorithm: algo,
        };

        const maze = buildMaze(config);
        maze.runAlgorithm.toCompletion();

        let startCell, endCell;
        maze.forEachCell((cell) => {
          if (cell.metadata[METADATA_START_CELL]) startCell = cell;
          if (cell.metadata[METADATA_END_CELL]) endCell = cell;
        });

        expect(startCell).toBeTruthy();
        expect(endCell).toBeTruthy();

        maze.findPathBetween(startCell.coords, endCell.coords);
        const path = maze.metadata[METADATA_PATH];

        expect(path).toBeTruthy();
        expect(path.length).toBeGreaterThan(1);
      });
    });

    test('should have optimal path length', () => {
      const maze = buildMaze(createBasicConfig());
      maze.runAlgorithm.toCompletion();

      let startCell, endCell;
      maze.forEachCell((cell) => {
        if (cell.metadata[METADATA_START_CELL]) startCell = cell;
        if (cell.metadata[METADATA_END_CELL]) endCell = cell;
      });

      maze.findPathBetween(startCell.coords, endCell.coords);
      const path = maze.metadata[METADATA_PATH];

      expect(path.length).toBeLessThanOrEqual(maze.cellCount);

      const pathSet = new Set(path.map(coords => maze.getCellByCoordinates(coords).id));
      expect(pathSet.size).toBe(path.length);
    });

    test('should have different paths for different exit configurations', () => {
      const paths = exitConfigs.map(({ config }) => {
        const mazeConfig = {
          ...createBasicConfig(),
          exitConfig: config,
        };

        const maze = buildMaze(mazeConfig);
        maze.runAlgorithm.toCompletion();

        let startCell, endCell;
        maze.forEachCell((cell) => {
          if (cell.metadata[METADATA_START_CELL]) startCell = cell;
          if (cell.metadata[METADATA_END_CELL]) endCell = cell;
        });

        maze.findPathBetween(startCell.coords, endCell.coords);
        return maze.metadata[METADATA_PATH];
      });

      const pathStrings = paths.map(path => JSON.stringify(path));
      const uniquePaths = new Set(pathStrings);
      expect(uniquePaths.size).toBeGreaterThan(1);
    });
  });
}); 