class CanvasRenderer {
  constructor(canvas, theme = "classic") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.theme = theme;
    this.cellSize = 24; // Default size
    this.borderSize = 3;
    this.innerBorder = 2;
    this.rows = 0;
    this.cols = 0;
  }

  // Set cell size
  setCellSize(size) {
    this.cellSize = size;
    this.borderSize = Math.max(2, Math.floor(size / 8));
    this.innerBorder = Math.max(1, Math.floor(size / 12));
  }

  // Set game board size
  setSize(rows, cols) {
    this.rows = rows;
    this.cols = cols;
  }

  // Draw a single cell
  drawCell(row, col, state, value) {
    const x = col * this.cellSize;
    const y = row * this.cellSize;
    const size = this.cellSize;

    // Clear cell area
    this.ctx.clearRect(x, y, size, size);

    if (!state.revealed) {
      // Unrevealed cell
      this.drawUnrevealedCell(x, y, size);
      if (state.flagged) {
        this.drawFlag(x, y, size);
      }
    } else {
      // Revealed cell
      this.drawRevealedCell(x, y, size, value, state.exploded);
    }
  }

  // Draw unrevealed cell
  drawUnrevealedCell(x, y, size) {
    // Draw cell background
    this.ctx.fillStyle = "#C0C0C0";
    this.ctx.fillRect(x, y, size, size);

    const borderWidth = Math.max(1, Math.floor(size * 0.1));

    // Left and top bright border (white)
    this.ctx.beginPath();
    this.ctx.moveTo(x + size - borderWidth, y + borderWidth);
    this.ctx.lineTo(x + borderWidth, y + borderWidth);
    this.ctx.lineTo(x + borderWidth, y + size - borderWidth);
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = "#FFFFFF";
    this.ctx.stroke();

    // Right and bottom dark border (gray)
    this.ctx.beginPath();
    this.ctx.moveTo(x + borderWidth, y + size - borderWidth);
    this.ctx.lineTo(x + size - borderWidth, y + size - borderWidth);
    this.ctx.lineTo(x + size - borderWidth, y + borderWidth);
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = "#808080";
    this.ctx.stroke();

    this.ctx.strokeStyle = "#808080";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);
  }

  // Draw revealed cell
  drawRevealedCell(x, y, size, value, exploded) {
    this.ctx.fillStyle = "#C0C0C0";
    this.ctx.fillRect(x, y, size, size);

    this.ctx.strokeStyle = "#808080";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);

    if (value === -1) {
      if (exploded) {
        this.ctx.fillStyle = "#FF0000";
        this.ctx.fillRect(x, y, size, size);
      }
      this.drawMine(x, y, size);
    } else if (value > 0) {
      this.drawNumber(x, y, size, value);
    }
  }

  // Draw number
  drawNumber(x, y, size, value) {
    const colors = ["", "#0000FF", "#008000", "#FF0000", "#000080", "#800000", "#008080", "#000000", "#808080"];
    this.ctx.fillStyle = colors[value];
    this.ctx.font = `bold ${Math.floor(size * 0.7)}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(value.toString(), x + size / 2, y + size / 2);
  }

  // Draw mine
  drawMine(x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const mineSize = size * 0.6;

    this.ctx.fillStyle = "#000000";

    // Draw center circle
    const radius = mineSize / 3;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw eight spikes in eight directions
    const spikeLength = mineSize * 0.45; // Increase spike length ratio
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

    // Increase spike width
    const spikeWidth = Math.max(2, size * 0.1);
    this.ctx.lineWidth = spikeWidth;
    this.ctx.strokeStyle = "#000000";

    directions.forEach(([dx, dy]) => {
      this.ctx.beginPath();
      this.ctx.moveTo(
        centerX + dx * radius * 0.8, // Start from the circle edge
        centerY + dy * radius * 0.8
      );
      this.ctx.lineTo(centerX + dx * spikeLength, centerY + dy * spikeLength);
      this.ctx.stroke();
    });

    // Draw highlight point
    const highlightRadius = radius * 0.35;
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.beginPath();
    this.ctx.arc(centerX - radius * 0.4, centerY - radius * 0.4, highlightRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Draw flag
  drawFlag(x, y, size) {
    const flagX = x + size / 4;
    const flagY = y + size / 4;
    const flagSize = size / 2;

    // Flag pole
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(flagX + flagSize / 3, flagY, 2, flagSize);

    // Flag
    this.ctx.fillStyle = "#FF0000";
    this.ctx.beginPath();
    this.ctx.moveTo(flagX + flagSize / 3, flagY);
    this.ctx.lineTo(flagX + flagSize, flagY + flagSize / 3);
    this.ctx.lineTo(flagX + flagSize / 3, flagY + flagSize / 2);
    this.ctx.fill();
  }
}

export default CanvasRenderer;
