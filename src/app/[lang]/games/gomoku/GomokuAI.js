import { useEffect, useState } from 'react';
import * as ort from 'onnxruntime-web';

export class GomokuAIService {
  constructor() {
    this.session = null;
    this.isLoading = true;
    this.error = null;
  }

  async initialize() {
    try {
      this.session = await ort.InferenceSession.create('https://slefboot-1251736664.file.myqcloud.com/gomoku_model_1108.onnx');
      this.isLoading = false;
    } catch (err) {
      this.error = err;
      this.isLoading = false;
      console.error('AI模型加载失败:', err);
    }
  }

  // 将棋盘转换为模型输入格式
  prepareBoardInput(gameBoard, lastMove = null, isFirstPlayer = false) {
    const input = new Float32Array(1 * 4 * 15 * 15);

    // 创建4个平面：
    // 1. 当前玩家的棋子位置
    // 2. 对手的棋子位置
    // 3. 最后一手位置
    // 4. 当前玩家是否是先手 (如果是先手则整个平面都是1，否则都是0)

    const currentColor = 'white'; // AI是白棋
    const opponentColor = 'black';

    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        const idx = i * 15 + j;
        // 当前玩家的棋子位置
        input[idx] = gameBoard[i][j] === currentColor ? 1 : 0;
        // 对手的棋子位置
        input[idx + 15 * 15] = gameBoard[i][j] === opponentColor ? 1 : 0;
        // 最后一手位置
        if (lastMove && lastMove.row === i && lastMove.col === j) {
          input[idx + 2 * 15 * 15] = 1;
        } else {
          input[idx + 2 * 15 * 15] = 0;
        }
        // 当前玩家是否是先手
        input[idx + 3 * 15 * 15] = isFirstPlayer ? 1 : 0;
      }
    }

    return input;
  }

  async getNextMove(gameBoard, lastMove, isFirstPlayer = false) {
    if (!this.session) {
      throw new Error('AI模型未初始化');
    }

    console.log("lastMove:", lastMove, "isFirstPlayer:", isFirstPlayer);
    const input = this.prepareBoardInput(gameBoard, lastMove, isFirstPlayer);
    const tensor = new ort.Tensor('float32', input, [1, 4, 15, 15]);

    try {
      const results = await this.session.run({
        'input': tensor
      });

      const policy = results.policy_output.data;
      const value = results.value_output.data;

      // 找出最高概率的位置
      let maxProb = Number.NEGATIVE_INFINITY;
      let bestMove = { row: -1, col: -1 };
      let availableMoves = [];

      // 收集所有可用的移动
      for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
          const idx = i * 15 + j;
          if (gameBoard[i][j] === '') {
            availableMoves.push({ row: i, col: j, prob: policy[idx] });
            if (policy[idx] > maxProb) {
              maxProb = policy[idx];
              bestMove = { row: i, col: j };
            }
          }
        }
      }

      if (bestMove.row === -1 || bestMove.col === -1) {
        throw new Error(`AI无法找到有效移动。可用位置: ${availableMoves.length}, 最大概率: ${maxProb}`);
      }

      return {
        move: bestMove,
        confidence: value[0]
      };
    } catch (err) {
      console.error('AI预测失败:', err);
      throw err;
    }
  }
}

// React Hook用于在组件中使用AI
export function useGomokuAI() {
  const [ai] = useState(() => new GomokuAIService());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    ai.initialize().then(() => {
      setIsReady(!ai.isLoading);
      if (ai.error) {
        setError(ai.error);
      }
    });
  }, [ai]);

  return {
    isReady,
    error,
    getNextMove: (gameBoard, lastMove, isFirstPlayer = false) => ai.getNextMove(gameBoard, lastMove, isFirstPlayer)
  };
}
