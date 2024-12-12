import { THEMES } from './themes';

class CanvasRenderer {
  constructor(canvas, theme = "classic") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.setTheme(theme);
    this.cellSize = 24;
    this.borderSize = 3;
    this.innerBorder = 2;
    this.rows = 0;
    this.cols = 0;
  }

  setTheme(themeName) {
    this.theme = THEMES[themeName] || THEMES.classic;
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
      if (state.pressed) {
        this.drawPressedCell(x, y, size);
      } else {
        // Unrevealed cell
        this.drawUnrevealedCell(x, y, size);
      }
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
    this.ctx.fillStyle = this.theme.cellBackground;
    this.ctx.fillRect(x, y, size, size);

    const borderWidth = Math.max(1, Math.floor(size * 0.1));

    // Left and top bright border
    this.ctx.beginPath();
    this.ctx.moveTo(x + size - borderWidth, y + borderWidth);
    this.ctx.lineTo(x + borderWidth, y + borderWidth);
    this.ctx.lineTo(x + borderWidth, y + size - borderWidth);
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = this.theme.borderBright;
    this.ctx.stroke();

    // Right and bottom dark border
    this.ctx.beginPath();
    this.ctx.moveTo(x + borderWidth, y + size - borderWidth);
    this.ctx.lineTo(x + size - borderWidth, y + size - borderWidth);
    this.ctx.lineTo(x + size - borderWidth, y + borderWidth);
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = this.theme.borderDark;
    this.ctx.stroke();

    this.ctx.strokeStyle = this.theme.borderDark;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);
  }

  drawPressedCell(x, y, size) {
    // Draw base background
    this.ctx.fillStyle = this.theme.cellBackground;
    this.ctx.fillRect(x, y, size, size);

    const borderWidth = Math.max(1, Math.floor(size * 0.1));

    // Right and bottom borders use light color (opposite to the unpressed state)
    this.ctx.beginPath();
    this.ctx.moveTo(x + size - borderWidth, y + borderWidth);
    this.ctx.lineTo(x + size - borderWidth, y + size - borderWidth);
    this.ctx.lineTo(x + borderWidth, y + size - borderWidth);
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = this.theme.borderBright;
    this.ctx.stroke();

    // Left and top borders use dark color (opposite to the unpressed state)
    this.ctx.beginPath();
    this.ctx.moveTo(x + borderWidth, y + size - borderWidth);
    this.ctx.lineTo(x + borderWidth, y + borderWidth);
    this.ctx.lineTo(x + size - borderWidth, y + borderWidth);
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = this.theme.borderDark;
    this.ctx.stroke();

    // Outer border
    this.ctx.strokeStyle = this.theme.borderDark;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);
  }

  // Draw revealed cell
  drawRevealedCell(x, y, size, value, exploded) {
    this.ctx.fillStyle = this.theme.revealedBackground;
    this.ctx.fillRect(x, y, size, size);

    this.ctx.strokeStyle = this.theme.revealedBorder || this.theme.borderDark;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);

    if (value === -1) {
      if (exploded) {
        this.ctx.fillStyle = this.theme.explodedBackground;
        this.ctx.fillRect(x, y, size, size);
      }
      this.drawMine(x, y, size);
    } else if (value > 0) {
      this.drawNumber(x, y, size, value);
    }
  }

  // Draw number
  drawNumber(x, y, size, value) {
    this.ctx.fillStyle = this.theme.numberColors[value];
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

    this.ctx.fillStyle = this.theme.mineColor;

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
    this.ctx.strokeStyle = this.theme.mineColor;

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
    this.ctx.fillStyle = this.theme.mineHighlight;
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
    this.ctx.fillStyle = this.theme.borderDark;
    this.ctx.fillRect(flagX + flagSize / 3, flagY, 2, flagSize);

    // Flag
    this.ctx.fillStyle = this.theme.flagColor;
    this.ctx.beginPath();
    this.ctx.moveTo(flagX + flagSize / 3, flagY);
    this.ctx.lineTo(flagX + flagSize, flagY + flagSize / 3);
    this.ctx.lineTo(flagX + flagSize / 3, flagY + flagSize / 2);
    this.ctx.fill();
  }
}

const FACE_SVGS = {
  normal: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="12" cy="12" r="10" fill="#FFE87C" />
      <circle cx="8" cy="9" r="1.5" fill="#000" />
      <circle cx="16" cy="9" r="1.5" fill="#000" />
      <path d="M7.5 14.5a4.5 4.5 0 0 0 9 0" stroke="#000" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  pressed: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="12" cy="12" r="10" fill="#FFE87C" />
      <path d="M7.5 8h2v2h-2zM14.5 8h2v2h-2z" fill="#000" />
      <path d="M7.5 14.5a4.5 4.5 0 0 0 9 0" stroke="#000" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  dead: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="12" cy="12" r="10" fill="#FFE87C" />
      <path d="M6.5 7.5l3 3M9.5 7.5l-3 3" stroke="#000" strokeWidth="1.5" />
      <path d="M14.5 7.5l3 3M17.5 7.5l-3 3" stroke="#000" strokeWidth="1.5" />
      <path d="M7.5 15.5c2.25-0.8 6.75-0.8 9 0" stroke="#000" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  win: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="12" cy="12" r="10" fill="#FFE87C" />
      <path d="M8 9a0.8 0.8 0 1 0 0-1.6 0.8 0.8 0 0 0 0 1.6z" fill="#000" />
      <path d="M16 9a0.8 0.8 0 1 0 0-1.6 0.8 0.8 0 0 0 0 1.6z" fill="#000" />
      <path d="M7.5 13a4.5 4.5 0 0 0 9 0" stroke="#000" strokeWidth="1.5" fill="none" />
      <path d="M4.5 4.5l1.5 1.5M19.5 4.5l-1.5 1.5" stroke="#000" strokeWidth="1" />
    </svg>
  ),
};

export { CanvasRenderer, FACE_SVGS };
