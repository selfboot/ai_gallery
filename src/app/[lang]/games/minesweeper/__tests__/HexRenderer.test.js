import { HexRenderer } from "../HexRenderer";

function getRandomPointInHexagon(centerX, centerY, hexWidth, hexHeight) {
  // Hexagon can be divided into 6 equilateral triangles
  // 1. First, randomly select a triangle (0-5)
  // 2. Then, generate a random point in the triangle
  // 3. Use the barycentric coordinate method to generate a random point uniformly distributed in the triangle
  function getRandomPointInTriangle(x1, y1, x2, y2, x3, y3) {
    const r1 = Math.random();
    const r2 = Math.random();
    const sqrt_r1 = Math.sqrt(r1);
    const a = 1 - sqrt_r1;
    const b = sqrt_r1 * (1 - r2);
    const c = r2 * sqrt_r1;

    return {
      x: a * x1 + b * x2 + c * x3,
      y: a * y1 + b * y2 + c * y3,
    };
  }

  // Calculate the six vertices of the hexagon
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 * Math.PI) / 180;
    vertices.push({
      x: centerX + (hexWidth / 2) * Math.cos(angle),
      y: centerY + (hexWidth / 2) * Math.sin(angle),
    });
  }

  const triangleIndex = Math.floor(Math.random() * 6);

  return getRandomPointInTriangle(
    centerX,
    centerY,
    vertices[triangleIndex].x,
    vertices[triangleIndex].y,
    vertices[(triangleIndex + 1) % 6].x,
    vertices[(triangleIndex + 1) % 6].y
  );
}

describe("HexRenderer", () => {
  let renderer;

  beforeEach(() => {
    // Mock canvas object
    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: jest.fn(),
    };

    renderer = new HexRenderer(mockCanvas);
    renderer.rows = 8;
    renderer.cols = 10;
    renderer.setSize(8, 10);
  });

  test("Iterate through all cells for bidirectional conversion test", () => {
    for (let row = 0; row < renderer.rows; row++) {
      for (let col = 0; col < renderer.cols; col++) {
        const { x, y } = renderer.calculateCellCenter(row, col);
        const result = renderer.getHexCellFromPoint(x, y);
        expect(result).toEqual({ row, col });
        // if (result.row !== row || result.col !== col) {
        //   console.log(`Test failed: Cell (${row}, ${col}): Pixel coordinates (${Math.round(x)}, ${Math.round(y)})  Reverse calculation result (${result.row}, ${result.col})`);
        // }
      }
    }
  });

  test("Iterate through all cells for bidirectional conversion test, including random points", () => {
    const hexWidth = renderer.cellSize * Math.sqrt(3);
    const hexHeight = renderer.cellSize * 2;

    // Test multiple random points in each hexagon
    const pointsPerHex = 10;

    for (let row = 0; row < renderer.rows; row++) {
      for (let col = 0; col < renderer.cols; col++) {
        const center = renderer.calculateCellCenter(row, col);

        const centerResult = renderer.getHexCellFromPoint(center.x, center.y);
        expect(centerResult).toEqual({ row, col });

        for (let i = 0; i < pointsPerHex; i++) {
          const testPoint = getRandomPointInHexagon(center.x, center.y, hexWidth, hexHeight);
          const result = renderer.getHexCellFromPoint(testPoint.x, testPoint.y);
          expect(result).toEqual({ row, col });

          // If the test fails, output detailed information to help with debugging
          //   if (result.row !== row || result.col !== col) {
          //     console.log(
          //       `Failed: Cell (${row}, ${col}), ` +
          //         `Center point (${Math.round(center.x)}, ${Math.round(center.y)}), ` +
          //         `Test point (${Math.round(testPoint.x)}, ${Math.round(testPoint.y)}), ` +
          //         `Relative offset (${Math.round((testPoint.x - center.x) * 100) / 100}, ` +
          //         `${Math.round((testPoint.y - center.y) * 100) / 100}), ` +
          //         `Calculation result (${result.row}, ${result.col})`
          //     );
          //   }
        }
      }
    }
  });

  test("Test hexagon boundary points and vertices", () => {
    for (let row = 1; row < renderer.rows - 1; row++) {
      for (let col = 1; col < renderer.cols - 1; col++) {
        const center = renderer.calculateCellCenter(row, col);
        const vertices = renderer.calculateHexPoints(center.x, center.y);

        for (let i = 0; i < 6; i++) {
          const vertex = vertices[i];
          const nextVertex = vertices[(i + 1) % 6];

          // Test vertices and midpoints of sides
          const testPoints = [
            { ...vertex, type: "vertex" },
            {
              x: (vertex.x + nextVertex.x) / 2,
              y: (vertex.y + nextVertex.y) / 2,
              type: "edge",
            },
          ];

          testPoints.forEach((point) => {
            const offsets = [
              { dx: 0, dy: 0 }, // Exact point
              { dx: 0.5, dy: 0 }, // Right offset
              { dx: -0.5, dy: 0 }, // Left offset
              { dx: 0, dy: 0.5 }, // Down offset
              { dx: 0, dy: -0.5 }, // Up offset
            ];

            offsets.forEach(({ dx, dy }) => {
              const testX = point.x + dx;
              const testY = point.y + dy;
              const result = renderer.getHexCellFromPoint(testX, testY);

              // Find all potential cells near the test point
              const potentialCells = [];
              for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                  if (r >= 0 && r < renderer.rows && c >= 0 && c < renderer.cols) {
                    const cellCenter = renderer.calculateCellCenter(r, c);
                    const dx = testX - cellCenter.x;
                    const dy = testY - cellCenter.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    potentialCells.push({ row: r, col: c, distance });
                  }
                }
              }

              // Sort by distance
              potentialCells.sort((a, b) => a.distance - b.distance);

              if (potentialCells.length === 0) {
                // It shouldn't happen, because we're testing internal cells
                console.error("No potential cells found:", {
                  testPoint: { x: Math.round(testX), y: Math.round(testY) },
                  originalCell: { row, col },
                });
                return;
              }

              // Get the shortest distance
              const minDistance = potentialCells[0].distance;
              // Find all cells with distances very close to the shortest distance (allow 0.1 pixel error)
              const validCells = potentialCells.filter((cell) => Math.abs(cell.distance - minDistance) <= 0.1);

              // Verify that the result cell is one of the valid cells
              const isValidResult = validCells.some((cell) => cell.row === result.row && cell.col === result.col);

              if (!isValidResult) {
                console.log(`Detection failed:`, {
                  type: point.type,
                  originalCell: { row, col },
                  testPoint: { x: Math.round(testX), y: Math.round(testY) },
                  relativeOffset: {
                    x: Math.round((testX - center.x) * 100) / 100,
                    y: Math.round((testY - center.y) * 100) / 100,
                  },
                  microOffset: { dx, dy },
                  result: { row: result.row, col: result.col },
                  validCells: validCells.map(({ row, col, distance }) => ({
                    row,
                    col,
                    distance: Math.round(distance * 100) / 100,
                  })),
                });
              }

              expect(isValidResult).toBeTruthy();
            });
          });
        }
      }
    }
  });

  test("Boundary case test", () => {
    for (let row = 1; row < renderer.rows - 1; row++) {
      for (let col = 1; col < renderer.cols - 1; col++) {
        const testCell = { row, col };
        const { x, y } = renderer.calculateCellCenter(testCell.row, testCell.col);
        const hexWidth = renderer.cellSize * Math.sqrt(3);
        const hexHeight = renderer.cellSize * 2;

        const offsets = [
          { dx: hexWidth / 2, dy: 0 }, // Right
          { dx: hexWidth / 4, dy: -hexHeight / 2 }, // Right top
          { dx: -hexWidth / 4, dy: -hexHeight / 2 }, // Left top
          { dx: -hexWidth / 2, dy: 0 }, // Left
          { dx: -hexWidth / 4, dy: hexHeight / 2 }, // Left bottom
          { dx: hexWidth / 4, dy: hexHeight / 2 }, // Right bottom
        ];

        offsets.forEach((offset, index) => {
          const testX = x + offset.dx;
          const testY = y + offset.dy;
          const result = renderer.getHexCellFromPoint(testX, testY);

          // Verify that the result is reasonable (should be the current cell or an adjacent cell)
          const rowDiff = Math.abs(result.row - testCell.row);
          const colDiff = Math.abs(result.col - testCell.col);
          const isAdjacent = rowDiff <= 1 && colDiff <= 1;
          expect(isAdjacent).toBeTruthy();
          expect(rowDiff + colDiff <= 2).toBeTruthy();
        });
      }
    }
  });
});
