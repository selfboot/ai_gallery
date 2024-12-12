import { THEMES } from './themes';

export class HexRenderer {
  constructor(canvas, theme = "classic") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.setTheme(theme);
    this.cellSize = 30;
    this.padding = 35;
  }

  setTheme(themeName) {
    this.theme = THEMES[themeName] || THEMES.classic;
  }

  // Calculate the size of the grid
  calculateGridSize(rows, cols) {
    const hexWidth = this.cellSize * Math.sqrt(3);
    const hexHeight = this.cellSize * 2;
    const gridWidth = hexWidth * cols;
    const gridHeight = hexHeight * (1 + (rows - 1) * 0.75);
    return {
      width: Math.ceil(gridWidth + this.padding),
      height: Math.ceil(gridHeight + this.padding),
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

  // Calculate the vertices of a hexagon
  calculateHexPoints(centerX, centerY) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6; // Rotate 30 degrees to make the hexagon vertical
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

    // Remove padding to get relative coordinates
    const x = px - this.padding;
    const y = py - this.padding;

    // Roughly estimate the row and column
    let row = Math.floor(y / hexVerticalSpacing);
    let col = Math.floor(x / hexWidth);

    // Find the surrounding possible candidate cells
    const candidates = [];

    // Add the estimated cell and its neighbors
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          const center = this.calculateCellCenter(r, c);
          const dx = px - center.x;
          const dy = py - center.y;
          // Calculate the distance from the point to the center
          const distance = Math.sqrt(dx * dx + dy * dy);
          candidates.push({ row: r, col: c, distance });
        }
      }
    }

    // Sort by distance
    candidates.sort((a, b) => a.distance - b.distance);

    // If no candidate cells are found (which should not happen), return the nearest valid cell
    if (candidates.length === 0) {
      return {
        row: Math.max(0, Math.min(this.rows - 1, row)),
        col: Math.max(0, Math.min(this.cols - 1, col)),
      };
    }

    // Return the cell closest to the point
    return {
      row: candidates[0].row,
      col: candidates[0].col,
    };
  }

  // Get the neighboring positions
  getNeighborPositions(row, col) {
    const isEvenRow = row % 2 === 0;
    return [
      [row - 1, isEvenRow ? col - 1 : col], // Top left
      [row - 1, isEvenRow ? col : col + 1], // Top right
      [row, col - 1], // Left
      [row, col + 1], // Right
      [row + 1, isEvenRow ? col - 1 : col], // Bottom left
      [row + 1, isEvenRow ? col : col + 1], // Bottom right
    ];
  }

  draw3DEffect(points, isPressed) {
    this.ctx.save();

    const borderWidth = Math.max(1, Math.floor(this.cellSize * 0.1));

    const innerPoints = points.map((p) => {
      const dx = p.x - (points[0].x + points[3].x) / 2;
      const dy = p.y - (points[0].y + points[3].y) / 2;
      const scale = (this.cellSize - borderWidth) / this.cellSize;
      return {
        x: (points[0].x + points[3].x) / 2 + dx * scale,
        y: (points[0].y + points[3].y) / 2 + dy * scale,
      };
    });

    if (isPressed) {
      this.ctx.beginPath();
      this.ctx.moveTo(innerPoints[0].x, innerPoints[0].y);
      this.ctx.lineTo(innerPoints[1].x, innerPoints[1].y);
      this.ctx.lineTo(innerPoints[2].x, innerPoints[2].y);
      this.ctx.lineWidth = borderWidth;
      this.ctx.strokeStyle = this.theme.borderBright;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(innerPoints[2].x, innerPoints[2].y);
      this.ctx.lineTo(innerPoints[3].x, innerPoints[3].y);
      this.ctx.lineTo(innerPoints[4].x, innerPoints[4].y);
      this.ctx.lineTo(innerPoints[5].x, innerPoints[5].y);
      this.ctx.lineWidth = borderWidth;
      this.ctx.strokeStyle = this.theme.borderDark;
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(innerPoints[0].x, innerPoints[0].y);
      this.ctx.lineTo(innerPoints[1].x, innerPoints[1].y);
      this.ctx.lineTo(innerPoints[2].x, innerPoints[2].y);
      this.ctx.lineWidth = borderWidth;
      this.ctx.strokeStyle = this.theme.borderDark;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(innerPoints[2].x, innerPoints[2].y);
      this.ctx.lineTo(innerPoints[3].x, innerPoints[3].y);
      this.ctx.lineTo(innerPoints[4].x, innerPoints[4].y);
      this.ctx.lineTo(innerPoints[5].x, innerPoints[5].y);
      this.ctx.lineWidth = borderWidth;
      this.ctx.strokeStyle = this.theme.borderBright;
      this.ctx.stroke();
    }

    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = this.theme.borderDark;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawCell(row, col, state, value) {
    const { x, y } = this.calculateCellCenter(row, col);
    const points = this.calculateHexPoints(x, y);

    // Set the fill color
    let fillColor = this.theme.cellBackground;
    if (state.revealed) {
      fillColor = this.theme.revealedBackground;
      if (state.exploded) {
        fillColor = this.theme.explodedBackground;
      }
    } 

    // Draw the hexagon
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();

    // Fill the hexagon
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();

    if (!state.revealed) {
      this.draw3DEffect(points, state.pressed);
    }

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = state.revealed ? this.theme.revealedBorder || this.theme.borderDark : this.theme.borderDark;
    this.ctx.stroke();

    // Draw the number, mine or flag
    if (state.revealed) {
      if (value === -1) {
        this.drawMine(x, y);
      } else if (value > 0) {
        this.drawNumber(x, y, value);
      }
    } else if (state.flagged) {
      this.drawFlag(x, y);
    }
  }

  drawNumber(x, y, value) {
    this.ctx.fillStyle = this.theme.numberColors[value];
    this.ctx.font = `bold ${this.cellSize * 0.8}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(value.toString(), x, y);
  }

  drawFlag(x, y) {
    const flagSize = this.cellSize * 0.8;

    // Calculate the center of the flag to ensure it's centered on the cell
    const flagX = x - flagSize / 2;
    const flagY = y - flagSize / 2;

    // Flag pole - Draw from the center
    this.ctx.fillStyle = this.theme.borderDark;
    this.ctx.fillRect(flagX + flagSize / 3, flagY, 2, flagSize);

    // Flag - Draw relative to the center
    this.ctx.fillStyle = this.theme.flagColor;
    this.ctx.beginPath();
    this.ctx.moveTo(flagX + flagSize / 3, flagY);
    this.ctx.lineTo(flagX + flagSize, flagY + flagSize / 3);
    this.ctx.lineTo(flagX + flagSize / 3, flagY + flagSize / 2);
    this.ctx.fill();
  }

  drawMine(x, y) {
    const mineSize = this.cellSize * 0.8;
    const centerX = x;
    const centerY = y;
    this.ctx.save();

    this.ctx.fillStyle = this.theme.mineColor;

    const radius = mineSize / 3;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    const spikeLength = mineSize * 0.45;
    const directions = [
      [0, 1],
      [1, 1],
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
    ];

    // Set the spike width
    const spikeWidth = Math.max(2, this.cellSize * 0.1);
    this.ctx.lineWidth = spikeWidth;
    this.ctx.strokeStyle = this.theme.mineColor;

    // Draw the spikes
    directions.forEach(([dx, dy]) => {
      this.ctx.beginPath();
      this.ctx.moveTo(centerX + dx * radius * 0.8, centerY + dy * radius * 0.8);
      this.ctx.lineTo(centerX + dx * spikeLength, centerY + dy * spikeLength);
      this.ctx.stroke();
    });

    // Draw the highlight point
    const highlightRadius = radius * 0.35;
    this.ctx.fillStyle = this.theme.mineHighlight;
    this.ctx.beginPath();
    this.ctx.arc(centerX - radius * 0.4, centerY - radius * 0.4, highlightRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }
}
