export class HexRenderer {
  constructor(canvas, theme = "classic") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.theme = theme;
    this.cellSize = 30;
    this.padding = 40;
  }

  // 计算整个蜂窝地图所需的尺寸
  calculateGridSize(rows, cols) {
    // 计算六边形的宽度和高度
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;

    // 计算总宽度和高度
    // 宽度需要考虑错位，每列的间距是六边形宽度
    const gridWidth = hexWidth * (cols + 0.5); // 加0.5是为了最后一列的偏移
    // 高度需要考虑重叠，每行的间距是六边形高度的3/4
    const gridHeight = hexHeight * (rows * 0.75 + 0.25);

    return {
      width: Math.ceil(gridWidth + this.padding * 2),
      height: Math.ceil(gridHeight + this.padding * 2),
    };
  }

  setSize(rows, cols) {
    this.rows = rows;
    this.cols = cols;

    const { width, height } = this.calculateGridSize(rows, cols);
    this.canvas.width = width;
    this.canvas.height = height;
    this.originalWidth = width;
    this.originalHeight = height;
    return { width, height };
  }

  setCellSize(size) {
    this.cellSize = size;
  }

  // 计算六边形的顶点
  calculateHexPoints(centerX, centerY) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6; // 旋转30度使六边形竖直
      points.push({
        x: centerX + this.cellSize * Math.cos(angle),
        y: centerY + this.cellSize * Math.sin(angle),
      });
    }
    return points;
  }

  // 计算六边形网格中的单元格中心位置
  calculateCellCenter(row, col) {
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;

    // 计算基础位置
    let x = this.padding + hexWidth * col;
    let y = this.padding + hexHeight * 0.75 * row;

    // 奇数行需要向右偏移半个六边形宽度
    if (row % 2 === 1) {
      x += hexWidth / 2;
    }

    return { x, y };
  }

  getHexCellFromPoint(px, py) {
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;
    const hexVerticalSpacing = hexHeight * 0.75;
  
    const x = px - this.padding;
    const y = py - this.padding;
  
    let row = Math.floor(y / hexVerticalSpacing);
    let adjustedX = x;
    if (row % 2 === 1) {
      adjustedX -= hexWidth / 2;
    }
    let col = Math.floor(adjustedX / hexWidth);
  
    const centerX = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0);
    const centerY = row * hexVerticalSpacing;
  
    const dx = x - centerX;
    const dy = y - centerY;
  
    const relativeX = Math.abs(dx) / (hexWidth / 2);
    const relativeY = Math.abs(dy) / (hexHeight / 2);
  
    if (relativeY > 0.5 * (1 - relativeX)) {
      if (dy < 0) {
        row--;
        if (dx > 0 && row % 2 === 1) col++;
        if (dx < 0 && row % 2 === 0) col--;
      } else {
        row++;
        if (dx > 0 && row % 2 === 1) col++;
        if (dx < 0 && row % 2 === 0) col--;
      }
    }
  
    // 确保行列在有效范围内
    row = Math.max(0, Math.min(this.rows - 1, row));
    col = Math.max(0, Math.min(this.cols - 1, col));
  
    return { row, col };
  }

  // 获取相邻位置
  getNeighborPositions(row, col) {
    const isEvenRow = row % 2 === 0;
    return [
      [row - 1, isEvenRow ? col - 1 : col], // 左上
      [row - 1, isEvenRow ? col : col + 1], // 右上
      [row, col - 1], // 左
      [row, col + 1], // 右
      [row + 1, isEvenRow ? col - 1 : col], // 左下
      [row + 1, isEvenRow ? col : col + 1], // 右下
    ];
  }

  drawCell(row, col, state, value) {
    const { x, y } = this.calculateCellCenter(row, col);
    const points = this.calculateHexPoints(x, y);

    // 设置填充颜色
    let fillColor = "#c0c0c0";
    if (state.revealed) {
      fillColor = "#e0e0e0";
      if (state.exploded) {
        fillColor = "#ff0000";
      }
    }
    if (state.pressed) {
      fillColor = "#a0a0a0";
    }

    // 绘制六边形
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();

    // 填充
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();

    // 边框
    this.ctx.strokeStyle = "#808080";
    this.ctx.stroke();

    // 绘制数字或旗帜
    if (state.revealed && value > 0) {
      this.drawNumber(x, y, value);
    } else if (state.flagged) {
      this.drawFlag(x, y);
    }
  }

  drawNumber(x, y, value) {
    const colors = [
      null,
      "#0000ff", // 1: 蓝色
      "#008000", // 2: 绿色
      "#ff0000", // 3: 红色
      "#000080", // 4: 深蓝色
      "#800000", // 5: 深红色
      "#008080", // 6: 青色
      "#000000", // 7: 黑色
      "#808080", // 8: 灰色
    ];

    this.ctx.fillStyle = colors[value] || "#000000";
    this.ctx.font = `bold ${this.cellSize * 0.5}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(value.toString(), x, y);
  }

  drawFlag(x, y) {
    const flagSize = this.cellSize * 0.4;

    // 绘制旗帜
    this.ctx.fillStyle = "#ff0000";
    this.ctx.beginPath();
    this.ctx.moveTo(x - flagSize / 2, y - flagSize / 2);
    this.ctx.lineTo(x + flagSize / 2, y);
    this.ctx.lineTo(x - flagSize / 2, y + flagSize / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // 绘制旗杆
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - flagSize / 2, y - flagSize / 2);
    this.ctx.lineTo(x - flagSize / 2, y + flagSize / 2);
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
  }
}
