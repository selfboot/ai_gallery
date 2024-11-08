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
  prepareBoardInput(gameBoard) {
    const input = new Float32Array(1 * 4 * 15 * 15);
    
    // 创建4个平面：
    // 1. 黑子位置 (1表示有黑子，0表示无)
    // 2. 白子位置 (1表示有白子，0表示无)
    // 3. 最后一手位置 (1表示最后一手，0表示其他)
    // 4. 当前玩家颜色 (全1表示轮到黑棋，全0表示轮到白棋)
    
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        const idx = i * 15 + j;
        // 黑子平面
        input[idx] = gameBoard[i][j] === 'black' ? 1 : 0;
        // 白子平面
        input[idx + 15 * 15] = gameBoard[i][j] === 'white' ? 1 : 0;
        // 最后一手平面暂时留空
        input[idx + 2 * 15 * 15] = 0;
        // 当前玩家颜色平面
        input[idx + 3 * 15 * 15] = 1; // 假设AI始终为黑棋
      }
    }
    
    return input;
  }

  async getNextMove(gameBoard) {
    if (!this.session) {
      throw new Error('AI模型未初始化');
    }

    const input = this.prepareBoardInput(gameBoard);
    const tensor = new ort.Tensor('float32', input, [1, 4, 15, 15]);

    try {
      const results = await this.session.run({
        'input': tensor
      });

      const policy = results.policy_output.data;
      const value = results.value_output.data;

      // 找出最高概率的位置
      let maxProb = -1;
      let bestMove = { row: -1, col: -1 };

      for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
          const idx = i * 15 + j;
          if (policy[idx] > maxProb && gameBoard[i][j] === '') {
            maxProb = policy[idx];
            bestMove = { row: i, col: j };
          }
        }
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
    getNextMove: (gameBoard) => ai.getNextMove(gameBoard)
  };
}
