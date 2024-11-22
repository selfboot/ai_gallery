"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import MinesweeperGame from "./gameLogic";
import CanvasRenderer from "./CanvasRenderer";
import { CustomListbox } from "@/app/components/ListBox";

const DIFFICULTY_LEVELS = {
  "初级": { rows: 9, cols: 9, mines: 10 },
  "中级": { rows: 16, cols: 16, mines: 40 },
  "高级": { rows: 16, cols: 30, mines: 99 },
  "自定义": "custom",
};

// 首先定义表情图片映射（移到组件外部）
const FACE_IMAGES = {
  normal: "https://minesweeper.online/img/skins/hd/face_unpressed.svg?v=15",
  pressed: "https://minesweeper.online/img/skins/hd/face_pressed.svg?v=15",
  dead: "https://minesweeper.online/img/skins/hd/face_lose.svg?v=15",
  win: "https://minesweeper.online/img/skins/hd/face_win.svg?v=15",
};

const GameBoard = ({ game, onCellClick, onCellRightClick, onCellDoubleClick, onReset, time }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const containerRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  // 使用函数初始化状态，避免服务端渲染不匹配
  const getInitialWindowSize = () => ({
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  });

  const [windowSize, setWindowSize] = useState(getInitialWindowSize);

  // 使用 useLayoutEffect 替代 useEffect 来避免闪烁
  useLayoutEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // 监听窗口大小变化
    window.addEventListener("resize", updateWindowSize);
    return () => window.removeEventListener("resize", updateWindowSize);
  }, []);

  // 修改动态计算单元格大小的逻辑
  const calculateCellSize = useCallback(() => {
    const maxHeight = windowSize.height * 0.8;
    const maxWidth = windowSize.width * 0.7;
    const statusBarHeight = 40; // 状态栏高度
    const padding = 32; // 外边距总和
    const minCellSize = 20;
    const maxCellSize = 40;

    // 计算可用高度（减去状态栏和边距）
    const availableHeight = maxHeight - statusBarHeight - padding;
    const availableWidth = maxWidth - padding;

    const heightBasedSize = Math.floor(availableHeight / game.rows);
    const widthBasedSize = Math.floor(availableWidth / game.cols);
    let cellSize = Math.min(heightBasedSize, widthBasedSize);
    cellSize = Math.max(minCellSize, Math.min(cellSize, maxCellSize));

    return cellSize;
  }, [game.rows, game.cols, windowSize]);

  // 使用函数初始化 cellSize
  const [cellSize, setCellSize] = useState(() => calculateCellSize());

  // 使用 useLayoutEffect 处理尺寸变化
  useLayoutEffect(() => {
    setCellSize(calculateCellSize());
  }, [calculateCellSize, windowSize]);

  // 计算 canvas 尺寸
  const canvasWidth = game.cols * cellSize + 12;
  const canvasHeight = game.rows * cellSize + 12;

  // 计算游戏区域总宽度
  const totalWidth = game.cols * cellSize + 12;

  // 计算总高度（状态栏 + 游戏区域）
  const statusBarHeight = cellSize + 6;
  const gameAreaHeight = game.rows * cellSize + 12;
  const totalHeight = statusBarHeight + gameAreaHeight + 4; // 4px 为状态栏和游戏区域之间的间距

  // 使用 useLayoutEffect 处理渲染
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvas, "classic");
    }

    const renderer = rendererRef.current;
    renderer.setCellSize(cellSize);
    renderer.setSize(game.rows, game.cols);

    // 渲染所有格子
    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        renderer.drawCell(
          row,
          col,
          {
            revealed: game.revealed[row][col],
            flagged: game.flagged[row][col],
            exploded: game.gameOver && game.board[row][col] === -1 && game.revealed[row][col],
          },
          game.board[row][col]
        );
      }
    }
  }, [game, canvasWidth, canvasHeight, cellSize]);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x - 3) / cellSize);
    const row = Math.floor((y - 3) / cellSize);

    if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
      onCellClick(row, col);
    }
  };

  // 修改其他事件处理器中的坐标计算
  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x - 3) / cellSize);
    const row = Math.floor((y - 3) / cellSize);

    if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
      onCellRightClick(e, row, col);
    }
  };

  const handleDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x - 3) / cellSize);
    const row = Math.floor((y - 3) / cellSize);

    if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
      onCellDoubleClick(row, col);
    }
  };

  // 添加表情状态获取函数
  const getFaceImage = () => {
    if (game.gameOver) {
      return game.won ? FACE_IMAGES.win : FACE_IMAGES.dead;
    }
    return isPressed ? FACE_IMAGES.pressed : FACE_IMAGES.normal;
  };

  // 添加鼠标事件处理
  useEffect(() => {
    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
      }}
    >
      {/* 状态栏 */}
      <div
        className="flex justify-between items-center mb-1 bg-[#C0C0C0] "
        style={{
          height: `${statusBarHeight}px`,
          width: `${totalWidth}px`
        }}
      >
        <LEDDisplay value={game.minesLeft} />

        <button onClick={onReset}>
          <img
            src={getFaceImage()}
            alt="game face"
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
            }}
            draggable="false"
          />
        </button>

        <LEDDisplay value={Math.floor(time)} />
      </div>

      {/* Canvas 部分 */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          width: canvasWidth,
          height: canvasHeight,
        }}
      />
    </div>
  );
};

const Settings = ({ settings, onSettingsChange, onReset }) => {
  const [selectedLevel, setSelectedLevel] = useState(() => {
    // 根据当前设置判断难度级别
    const currentSettings = `${settings.rows},${settings.cols},${settings.mines}`;
    const matchedLevel = Object.entries(DIFFICULTY_LEVELS).find(([_, config]) => {
      if (config === "custom") return false;
      return `${config.rows},${config.cols},${config.mines}` === currentSettings;
    });
    return matchedLevel ? matchedLevel[0] : "自定义";
  });

  const handleLevelChange = (level) => {
    setSelectedLevel(level);
    if (level !== "自定义") {
      // 直接传递新设置和重置指令
      onSettingsChange(DIFFICULTY_LEVELS[level], true);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-bold">扫雷设置</h2>
      <div className="space-y-3">
        <div>
          <label className="block mb-1">难度级别</label>
          <CustomListbox value={selectedLevel} onChange={handleLevelChange} options={Object.keys(DIFFICULTY_LEVELS)} />
        </div>

        <button
          className="w-full px-4 py-2 bg-[#C0C0C0] text-black rounded 
                     border-t-2 border-l-2 border-[#ffffff] 
                     border-r-2 border-b-2 border-[#808080] 
                     hover:bg-[#d4d4d4] active:border-[#808080] 
                     active:border-t-2 active:border-l-2 
                     active:border-r-2 active:border-b-2"
          onClick={onReset}
        >
          重新开始
        </button>

        {selectedLevel === "自定义" && (
          <>
            <div>
              <label className="block text-sm mb-1">行数</label>
              <input
                type="number"
                value={settings.rows}
                onChange={(e) => {
                  const rows = parseInt(e.target.value);
                  onSettingsChange({ ...settings, rows }, false);
                }}
                className="w-full px-2 py-1 border rounded"
                min="5"
                max="30"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">列数</label>
              <input
                type="number"
                value={settings.cols}
                onChange={(e) => {
                  const cols = parseInt(e.target.value);
                  onSettingsChange({ ...settings, cols }, false);
                }}
                className="w-full px-2 py-1 border rounded"
                min="5"
                max="30"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">地雷数</label>
              <input
                type="number"
                value={settings.mines}
                onChange={(e) => {
                  const mines = parseInt(e.target.value);
                  onSettingsChange({ ...settings, mines }, false);
                }}
                className="w-full px-2 py-1 border rounded"
                min="1"
                max={settings.rows * settings.cols - 1}
              />
            </div>

            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={onReset}>
              应用设置并重新开始
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const LEDDisplay = ({ value }) => (
  <div 
    className="font-['Digital-7'] text-[#FF0000] text-2xl tracking-wider px-2 min-w-[80px] text-center h-full flex items-center justify-center"
    style={{
      backgroundColor: '#300',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
      border: '2px solid #808080',
      borderStyle: 'inset',
      textShadow: '0 0 5px rgba(255,0,0,0.8)',
    }}
  >
    {String(value).padStart(3, "0")}
  </div>
);

export default function Minesweeper() {
  const [settings, setSettings] = useState({
    rows: 9,
    cols: 9,
    mines: 10,
  });
  const [game, setGame] = useState(new MinesweeperGame(settings.rows, settings.cols, settings.mines));
  const [startTime, setStartTime] = useState(null);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const emojiCanvasRef = useRef(null);
  const emojiRendererRef = useRef(null);

  // 添加表情渲染逻辑
  useLayoutEffect(() => {
    const canvas = emojiCanvasRef.current;
    if (!canvas) return;

    if (!emojiRendererRef.current) {
      emojiRendererRef.current = new CanvasRenderer(canvas, "classic");
    }

    const renderer = emojiRendererRef.current;

    // 确定表情状态
    let emojiState = "normal";
    if (game.gameOver) {
      emojiState = game.won ? "win" : "dead";
    }

    // 绘制表情
    renderer.drawEmoji(0, 0, 40, emojiState);
  }, [game.gameOver, game.won]);

  // 添加鼠标按下状态
  const handleMouseDown = useCallback(() => {
    const canvas = emojiCanvasRef.current;
    if (!canvas || game.gameOver) return;

    const renderer = emojiRendererRef.current;
    renderer.drawEmoji(0, 0, 40, "worried"); // 添加担心表情
  }, [game.gameOver]);

  // 添加鼠标抬起状态
  const handleMouseUp = useCallback(() => {
    const canvas = emojiCanvasRef.current;
    if (!canvas || game.gameOver) return;

    const renderer = emojiRendererRef.current;
    renderer.drawEmoji(0, 0, 40, "normal");
  }, [game.gameOver]);

  // 在组件挂载时添加鼠标事件监听
  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseDown, handleMouseUp]);

  useEffect(() => {
    let animationFrameId;

    if (timerActive && !game.gameOver) {
      if (!startTime) {
        setStartTime(Date.now());
      }

      const updateTimer = () => {
        const now = Date.now();
        setTime((now - startTime) / 1000); // 转换为秒
        animationFrameId = requestAnimationFrame(updateTimer);
      };

      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [timerActive, game.gameOver, startTime]);

  // 修改设置处理函数
  const handleSettingsChange = useCallback((newSettings, shouldReset) => {
    setSettings(newSettings);
    if (shouldReset) {
      // 在设置更新后立即重置游戏
      setTimeout(() => {
        setGame(new MinesweeperGame(newSettings.rows, newSettings.cols, newSettings.mines));
        setTime(0);
        setStartTime(null);
        setTimerActive(false);
      }, 0);
    }
  }, []);

  const handleCellClick = (row, col) => {
    if (game.gameOver) return;

    if (!timerActive) {
      setTimerActive(true);
    }

    const newGame = MinesweeperGame.copyState(game);
    newGame.reveal(row, col);
    setGame(newGame);
  };

  const handleCellRightClick = (e, row, col) => {
    e.preventDefault();
    if (game.gameOver) return;

    if (!timerActive) {
      setTimerActive(true);
    }

    const newGame = MinesweeperGame.copyState(game);
    newGame.toggleFlag(row, col);
    setGame(newGame);
  };

  const handleCellDoubleClick = useCallback(
    (row, col) => {
      if (game.gameOver) return;

      if (!timerActive) {
        setTimerActive(true);
      }

      const newGame = MinesweeperGame.copyState(game);
      newGame.handleDoubleClick(row, col);
      setGame(newGame);
    },
    [game, timerActive]
  );

  const resetGame = useCallback(() => {
    setGame(new MinesweeperGame(settings.rows, settings.cols, settings.mines));
    setTime(0);
    setTimerActive(false);
  }, [settings]);

  return (
    <div className="flex flex-col lg:flex-row w-full mx-auto">
      <div className="w-full lg:w-4/5 lg:mr-8 lg:ml-4">
        <div className="flex flex-col items-center p-4 overflow-y-auto">
          <div className="bg-[#C0C0C0] p-4 border-t-4 border-l-4 border-[#ffffff] border-r-4 border-b-4 border-[#808080]">
            <GameBoard
              game={game}
              onCellClick={handleCellClick}
              onCellRightClick={handleCellRightClick}
              onCellDoubleClick={handleCellDoubleClick}
              onReset={resetGame}
              time={time}
            />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/5">
        <Settings settings={settings} onSettingsChange={handleSettingsChange} onReset={resetGame} />
      </div>
    </div>
  );
}
