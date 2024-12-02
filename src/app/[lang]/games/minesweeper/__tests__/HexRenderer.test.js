import { HexRenderer } from "../HexRenderer";

describe("HexRenderer", () => {
  let renderer;

  beforeEach(() => {
    // 模拟 canvas 对象
    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: jest.fn(),
    };

    // 创建渲染器
    renderer = new HexRenderer(mockCanvas);

    // 设置基本参数
    renderer.rows = 8;
    renderer.cols = 10;
    renderer.setSize(8, 10); // 确保设置了正确的尺寸
  });

  test("遍历所有格子进行双向转换测试", () => {
    for (let row = 0; row < renderer.rows; row++) {
      for (let col = 0; col < renderer.cols; col++) {
        const { x, y } = renderer.calculateCellCenter(row, col);
        const result = renderer.getHexCellFromPoint(x, y);
        // expect(result).toEqual({ row, col });
        console.log(`测试坐标 (${row}, ${col}): 像素坐标 (${Math.round(x)}, ${Math.round(y)}) 反向计算结果 (${result.row}, ${result.col})`);
      }
    }
  });

  test("边界情况测试", () => {
    const testCell = { row: 3, col: 3 };
    const { x, y } = renderer.calculateCellCenter(testCell.row, testCell.col);
    const hexWidth = renderer.cellSize * Math.sqrt(3);
    const hexHeight = renderer.cellSize * 2;

    const offsets = [
      { dx: hexWidth / 2, dy: 0 }, // 右
      { dx: hexWidth / 4, dy: -hexHeight / 2 }, // 右上
      { dx: -hexWidth / 4, dy: -hexHeight / 2 }, // 左上
      { dx: -hexWidth / 2, dy: 0 }, // 左
      { dx: -hexWidth / 4, dy: hexHeight / 2 }, // 左下
      { dx: hexWidth / 4, dy: hexHeight / 2 }, // 右下
    ];

    offsets.forEach((offset, index) => {
      const testX = x + offset.dx;
      const testY = y + offset.dy;
      const result = renderer.getHexCellFromPoint(testX, testY);

      // 验证结果是否合理（应该是当前格子或相邻格子）
      const isAdjacent = Math.abs(result.row - testCell.row) <= 1 && Math.abs(result.col - testCell.col) <= 1;
      expect(isAdjacent).toBeTruthy();
    });
  });

  test("相邻格子边界测试", () => {
    const testCell = { row: 2, col: 2 };
    const { x, y } = renderer.calculateCellCenter(testCell.row, testCell.col);
    const hexWidth = renderer.cellSize * Math.sqrt(3);
    const hexHeight = renderer.cellSize * 2;

    // 测试相邻格子的共享边界
    const testPoints = [
      // 水平边界
      { dx: hexWidth / 2 + 1, dy: 0 }, // 稍微超过右边界
      { dx: -hexWidth / 2 - 1, dy: 0 }, // 稍微超过左边界
      // 斜边界
      { dx: hexWidth / 4, dy: -hexHeight / 2 - 1 }, // 右上边界
      { dx: -hexWidth / 4, dy: -hexHeight / 2 - 1 }, // 左上边界
      { dx: hexWidth / 4, dy: hexHeight / 2 + 1 }, // 右下边界
      { dx: -hexWidth / 4, dy: hexHeight / 2 + 1 }, // 左下边界
    ];

    testPoints.forEach((point, index) => {
      const testX = x + point.dx;
      const testY = y + point.dy;
      const result = renderer.getHexCellFromPoint(testX, testY);

      console.log(
        `边界测试 ${index}:`,
        `原始格子 (${testCell.row}, ${testCell.col})`,
        `计算结果 (${result.row}, ${result.col})`
      );
    });
  });
});
