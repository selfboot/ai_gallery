"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import MinesweeperGame from "./gameLogic";
import { CanvasRenderer, FACE_SVGS } from "./CanvasRenderer";
import { CustomListbox } from "@/app/components/ListBox";
import LEDDigit from './LEDDigit';
import { useI18n } from "@/app/i18n/client";

const DIFFICULTY_LEVELS = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
  custom: "custom",
};

const GameBoard = ({ game, onCellClick, onCellRightClick, onCellDoubleClick, onReset, time }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const containerRef = useRef(null);
  const [isFacePressed, setIsFacePressed] = useState(false);

  const getInitialWindowSize = () => ({
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  });

  const [windowSize, setWindowSize] = useState(getInitialWindowSize);

  useLayoutEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", updateWindowSize);
    return () => window.removeEventListener("resize", updateWindowSize);
  }, []);

  // Dynamic calculation of cell size
  const calculateCellSize = useCallback(() => {
    const maxHeight = windowSize.height * 0.8;
    const maxWidth = windowSize.width * 0.6;
    const padding = 32;
    const minCellSize = 20;
    const maxCellSize = 40;
    const availableHeight = maxHeight - padding;
    const availableWidth = maxWidth - padding;

    const heightBasedSize = Math.floor(availableHeight / game.rows);
    const widthBasedSize = Math.floor(availableWidth / game.cols);
    let cellSize = Math.min(heightBasedSize, widthBasedSize);
    cellSize = Math.max(minCellSize, Math.min(cellSize, maxCellSize));

    return cellSize;
  }, [game.rows, game.cols, windowSize]);

  const [cellSize, setCellSize] = useState(() => calculateCellSize());

  // Use useLayoutEffect to handle size changes
  useLayoutEffect(() => {
    setCellSize(calculateCellSize());
  }, [calculateCellSize, windowSize, game.rows, game.cols]);

  // Calculate canvas dimensions
  const statusBarBottomPadding = 16;
  const canvasWidth = game.cols * cellSize;
  const canvasHeight = game.rows * cellSize;

  const statusLEDHeight = Math.max(44, cellSize);
  const statusBarHeight = statusLEDHeight + statusBarBottomPadding;
  const gameAreaHeight = game.rows * cellSize;

  const totalWidth = canvasWidth;
  const totalHeight = statusBarHeight + gameAreaHeight;

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

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
      onCellClick(row, col);
    }
  };

  // Process right-click events
  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
      onCellRightClick(e, row, col);
    }
  };

  const handleDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
      onCellDoubleClick(row, col);
    }
  };

  // Get face content
  const getFaceContent = () => {
    if (game.gameOver) {
      return game.won ? FACE_SVGS.win : FACE_SVGS.dead;
    }
    return isFacePressed ? FACE_SVGS.pressed : FACE_SVGS.normal;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
      }}
    >
      {/* Status bar */}
      <div
        className="flex justify-between items-center mb-2 bg-[#C0C0C0] "
        style={{
          height: `${statusBarHeight}px`,
          width: `${totalWidth}px`,
          paddingBottom: `${statusBarBottomPadding}px`,
        }}
      >
        <LEDDisplay value={game.minesLeft} />

        <button
          onClick={onReset}
          onMouseDown={(e) => {
            if (e.button === 0) {
              setIsFacePressed(true);
            }
          }}
          onMouseUp={() => setIsFacePressed(false)}
          onMouseLeave={() => setIsFacePressed(false)}
          style={{
            width: `${statusLEDHeight}px`,
            height: `${statusLEDHeight}px`,
            backgroundColor: '#C0C0C0',
            border: '3px solid',
            borderColor: isFacePressed
              ? '#808080 #ffffff #ffffff #808080'
              : '#ffffff #808080 #808080 #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
          }}
        >
          <div style={{
            width: `${Math.floor(cellSize * 0.85)}px`,
            height: `${Math.floor(cellSize * 0.85)}px`
          }}>
            {getFaceContent()}
          </div>
        </button>

        <LEDDisplay value={Math.floor(time)} />
      </div>

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
  const { t } = useI18n();
  
  const levelToTranslation = {
    'easy': t('easy'),
    'medium': t('medium'),
    'expert': t('expert'),
    'custom': t('custom')
  };

  const translationToLevel = Object.fromEntries(
    Object.entries(levelToTranslation).map(([k, v]) => [v, k])
  );

  const [selectedLevel, setSelectedLevel] = useState(() => {
    const currentSettings = `${settings.rows},${settings.cols},${settings.mines}`;
    const matchedLevel = Object.entries(DIFFICULTY_LEVELS).find(([key, config]) => {
      if (key === "custom") return false;
      return `${config.rows},${config.cols},${config.mines}` === currentSettings;
    });
    const level = matchedLevel ? matchedLevel[0] : "custom";
    return levelToTranslation[level];
  });

  const handleLevelChange = (translatedValue) => {
    const level = translationToLevel[translatedValue];
    setSelectedLevel(translatedValue);
    if (level !== "custom") {
      onSettingsChange(DIFFICULTY_LEVELS[level], true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{t('settings')}</h2>
      <div className="space-y-3">
        <div>
          <label className="block mb-1">{t('difficulty')}</label>
          <CustomListbox
            value={selectedLevel}
            onChange={handleLevelChange}
            options={Object.values(levelToTranslation)}
          />
        </div>
        {translationToLevel[selectedLevel] === "custom" && (
          <>
            <div>
              <label className="block text-sm mb-1">{t('rows')}</label>
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
              <label className="block text-sm mb-1">{t('columns')}</label>
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
              <label className="block text-sm mb-1">{t('mines_count')}</label>
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

            <button
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={onReset}
            >
              {t('apply_changes')}
            </button>
          </>
        )}

        <button
          className="w-full px-4 py-2 bg-[#C0C0C0] text-black rounded 
                     border-t-2 border-l-2 border-[#ffffff] 
                     border-r-2 border-b-2 border-[#808080] 
                     hover:bg-[#d4d4d4] active:border-[#808080]"
          onClick={onReset}
        >
          {t('restart_game')}
        </button>
      </div>
    </div>
  );
};

const LEDDisplay = ({ value, width = 90, height = 44 }) => (
  <div
    className="px-2 flex items-center justify-center gap-1"
    style={{
      minWidth: `${width}px`,
      height: `${height}px`,
      backgroundColor: '#300',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
      border: '2px solid #808080',
      borderStyle: 'inset',
    }}
  >
    {String(value)
      .padStart(3, "0")
      .split("")
      .map((digit, i) => (
        <LEDDigit
          key={i}
          value={parseInt(digit)}
          width={Math.floor(width * 0.25)}
          height={Math.floor(height * 0.85)}
        />
      ))}
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

  const handleSettingsChange = useCallback((newSettings, shouldReset) => {
    setSettings(newSettings);
    if (shouldReset) {
      setGame(new MinesweeperGame(newSettings.rows, newSettings.cols, newSettings.mines));
      setTime(0);
      setStartTime(null);
      setTimerActive(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setGame(new MinesweeperGame(settings.rows, settings.cols, settings.mines));
    setTime(0);
    setStartTime(null);
    setTimerActive(false);
  }, [settings]);

  useEffect(() => {
    let animationFrameId;

    const updateTimer = () => {
      if (timerActive && !game.gameOver) {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        setTime(Math.min(999, Math.floor(elapsed)));
        animationFrameId = requestAnimationFrame(updateTimer);
      }
    };

    if (timerActive && !game.gameOver) {
      if (!startTime) {
        setStartTime(Date.now());
      }
      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [timerActive, game.gameOver, startTime]);

  const handleCellClick = (row, col) => {
    if (game.gameOver) return;

    if (!timerActive) {
      setTimerActive(true);
      setStartTime(Date.now());
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

  return (
    <div className="flex flex-col lg:flex-row w-full mx-auto">
      <div className="w-full lg:w-4/5 lg:mr-8 lg:ml-4">
        <div className="flex flex-col items-center overflow-y-auto">
          <div className="bg-[#C0C0C0] p-6 border-t-4 border-l-4 border-[#ffffff] border-r-4 border-b-4 border-[#808080]">
            <GameBoard
              game={game}
              onCellClick={handleCellClick}
              onCellRightClick={handleCellRightClick}
              onCellDoubleClick={handleCellDoubleClick}
              onReset={handleReset}
              time={time}
            />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/5">
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}
