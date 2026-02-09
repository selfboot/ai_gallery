import { Engine as WukongEngine } from "./wukong";

const FILES = "abcdefghi";

const ROLE_TO_FEN = {
  rook: "r",
  horse: "n",
  elephant: "b",
  advisor: "a",
  general: "k",
  cannon: "c",
  pawn: "p",
};

export const AI_LEVELS = {
  novice: { mode: "depth", depth: 1 },
  expert: { mode: "depth", depth: 3 },
  master: { mode: "time", timeMs: 2000, fallbackDepth: 64 },
};

const toFenChar = (piece) => {
  const base = ROLE_TO_FEN[piece.role];
  return piece.color === "red" ? base.toUpperCase() : base;
};

export const stateToFen = (state) => {
  const rows = state.board.map((row) => {
    let fenRow = "";
    let empties = 0;

    row.forEach((piece) => {
      if (!piece) {
        empties++;
        return;
      }

      if (empties > 0) {
        fenRow += String(empties);
        empties = 0;
      }

      fenRow += toFenChar(piece);
    });

    if (empties > 0) {
      fenRow += String(empties);
    }

    return fenRow;
  });

  const side = state.currentPlayer === "red" ? "w" : "b";
  const fullMove = Math.floor(state.moveCount / 2) + 1;
  return `${rows.join("/")} ${side} - - 0 ${fullMove}`;
};

export const parseWukongMove = (moveString) => {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(moveString)) return null;

  const parsePoint = (fileChar, rankChar) => ({
    row: 9 - Number(rankChar),
    col: FILES.indexOf(fileChar),
  });

  const from = parsePoint(moveString[0], moveString[1]);
  const to = parsePoint(moveString[2], moveString[3]);

  if (from.col < 0 || to.col < 0) return null;
  return { from, to };
};

export class WukongAI {
  constructor() {
    this.engine = new WukongEngine();
  }

  getBestMove(state, rank = "expert") {
    const level = AI_LEVELS[rank] || AI_LEVELS.expert;

    this.engine.setBoard(stateToFen(state));
    this.engine.resetTimeControl();

    let searchDepth = level.depth || 1;
    if (level.mode === "time") {
      const timing = this.engine.getTimeControl();
      timing.timeSet = 1;
      timing.time = level.timeMs;
      timing.stopTime = Date.now() + level.timeMs;
      this.engine.setTimeControl(timing);
      searchDepth = level.fallbackDepth || 64;
    }

    const bestMove = this.engine.search(searchDepth);
    if (!bestMove) return null;

    return parseWukongMove(this.engine.moveToString(bestMove));
  }
}
