import GomokuAI from "./ai";

const ai = new GomokuAI(2);

self.onmessage = (e) => {
  const { board, isBlack } = e.data;
  const [row, col] = ai.getBestMove(board, isBlack);
  self.postMessage({ row, col });
};
