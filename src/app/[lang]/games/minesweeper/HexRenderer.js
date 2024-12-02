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
    // 使用半径计算正六边形的尺寸
    const radius = Math.floor(rows / 2);
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;

    // 计算正六边形的外接矩形
    const gridWidth = hexWidth * (2 * radius - 1);
    const gridHeight = hexHeight * (2 * radius - 1) * 0.75;

    return {
      width: Math.ceil(gridWidth + this.padding * 2),
      height: Math.ceil(gridHeight + this.padding * 2)
    };
  }

  setSize(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    
    // 计算需要的画布大小
    const { width, height } = this.calculateGridSize(rows, cols);
    
    // 设置固定的画布大小
    this.canvas.width = width;
    this.canvas.height = height;
    
    // 保存原始尺寸
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
        y: centerY + this.cellSize * Math.sin(angle)
      });
    }
    return points;
  }

  // 计算六边形网格中的单元格中心位置
  calculateCellCenter(row, col) {
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;
    
    // 计算六边形网格的偏移
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 使用轴向坐标计算位置
    const x = centerX + hexWidth * (col - Math.floor(this.cols/2) + (row - Math.floor(this.rows/2))/2);
    const y = centerY + hexHeight * 0.75 * (row - Math.floor(this.rows/2));
    
    return { x, y };
  }

  // 从点击坐标计算六边形单元格
  getHexCellFromPoint(px, py) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 相对于中心的坐标
    const x = px - centerX;
    const y = py - centerY;
    
    // 转换到轴向坐标
    const q = (x * Math.sqrt(3)/3 - y / 3) / this.cellSize;
    const r = y * 2/3 / this.cellSize;
    
    // 立方坐标转换
    const s = -q - r;
    
    // 四舍五入到最近的六边形
    let [rq, rr, rs] = this.roundCube(q, r, s);
    
    // 转换回网格坐标
    const col = rq + Math.floor(this.cols/2);
    const row = rr + Math.floor(this.rows/2);
    
    return { row, col };
  }

  roundCube(x, y, z) {
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const dx = Math.abs(rx - x);
    const dy = Math.abs(ry - y);
    const dz = Math.abs(rz - z);

    if (dx > dy && dx > dz) {
      rx = -ry - rz;
    } else if (dy > dz) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return [rx, ry, rz];
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
      [row + 1, isEvenRow ? col : col + 1]  // 右下
    ];
  }

  drawCell(row, col, state, value) {
    const { x, y } = this.calculateCellCenter(row, col);
    
    // 使用固定的 cellSize
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
      "#808080"  // 8: 灰色
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
    this.ctx.moveTo(x - flagSize/2, y - flagSize/2);
    this.ctx.lineTo(x + flagSize/2, y);
    this.ctx.lineTo(x - flagSize/2, y + flagSize/2);
    this.ctx.closePath();
    this.ctx.fill();
    
    // 绘制旗杆
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - flagSize/2, y - flagSize/2);
    this.ctx.lineTo(x - flagSize/2, y + flagSize/2);
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
  }
}
