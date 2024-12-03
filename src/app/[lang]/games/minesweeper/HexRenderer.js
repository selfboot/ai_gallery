export class HexRenderer {
  constructor(canvas, theme = "classic") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.theme = theme;
    this.cellSize = 30;
    this.padding = 40;
  }

  // Calculate the size of the grid
  calculateGridSize(rows, cols) {
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;
    const gridWidth = hexWidth * cols;
    const gridHeight = hexHeight * (1 + (rows - 1) * 0.75);
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

  // Calculate the center coordinates of a cell in the hexagon grid
  calculateCellCenter(row, col) {
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;

    // Calculate the base position
    let x = this.padding + hexWidth * col;
    let y = this.padding + hexHeight * 0.75 * row;

    // Odd rows need to shift right by half the hexagon width
    if (row % 2 === 1) {
      x += hexWidth / 2;
    }

    return { x, y };
  }

  getHexCellFromPoint(px, py) {
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;
    const hexVerticalSpacing = hexHeight * 0.75;
  
    // 移除padding得到相对坐标
    const x = px - this.padding;
    const y = py - this.padding;
  
    // 粗略估计行列
    let row = Math.floor(y / hexVerticalSpacing);
    let col = Math.floor(x / hexWidth);
  
    // 找到周围可能的候选格子
    const candidates = [];
    
    // 添加估计的格子及其相邻格子
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          const center = this.calculateCellCenter(r, c);
          const dx = px - center.x;
          const dy = py - center.y;
          // 计算点到中心的距离
          const distance = Math.sqrt(dx * dx + dy * dy);
          candidates.push({ row: r, col: c, distance });
        }
      }
    }
  
    // 按距离排序
    candidates.sort((a, b) => a.distance - b.distance);
  
    // 如果没有找到任何候选格子（这种情况不应该发生），返回最近的有效格子
    if (candidates.length === 0) {
      return { 
        row: Math.max(0, Math.min(this.rows - 1, row)),
        col: Math.max(0, Math.min(this.cols - 1, col))
      };
    }
  
    // 返回距离最近的格子
    return {
      row: candidates[0].row,
      col: candidates[0].col
    };
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
