"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import MinesweeperGame from "./gameLogic";
import { CanvasRenderer, FACE_SVGS } from "./CanvasRenderer";
import { CustomListbox } from "@/app/components/ListBox";
import LEDDigit from './LEDDigit';
import { useI18n } from "@/app/i18n/client";
import { HexRenderer } from "./HexRenderer";
import HexMinesweeperGame from './hexGameLogic';
import Modal from "@/app/components/Modal";
import usePersistentState from '@/app/components/PersistentState';
import { trackEvent, EVENTS, CATEGORIES } from '@/app/utils/analytics';
import { THEMES, THEME_OPTIONS } from './themes';
import { SideAdComponent } from "@/app/components/AdComponent";

const DIFFICULTY_LEVELS = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
  custom: "custom",
};

const GameBoard = ({ game, onCellClick, onCellRightClick, onCellDoubleClick, onReset, time, isHexagonal = false, theme }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const containerRef = useRef(null);
  const [isFacePressed, setIsFacePressed] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    const isMobile = windowSize.width < 768;
    const widthRatio = isMobile ? 0.8 : 0.65;
    const heightRatio = 0.8;
    const maxHeight = windowSize.height * heightRatio;
    const maxWidth = windowSize.width * widthRatio;
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
  const canvasWidth = mounted ? game.cols * cellSize : 'auto';
  const canvasHeight = mounted ? game.rows * cellSize : 'auto';

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

    rendererRef.current = isHexagonal
      ? new HexRenderer(canvas, theme)
      : new CanvasRenderer(canvas, theme);

    const renderer = rendererRef.current;
    renderer.setCellSize(cellSize);
    renderer.setSize(game.rows, game.cols);

    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (!isHexagonal || game.isValidCell?.(row, col)) {
          const isPressed = game.pressedCells.some(
            ([r, c]) => r === row && c === col
          );

          renderer.drawCell(
            row,
            col,
            {
              revealed: game.revealed[row][col],
              flagged: game.flagged[row][col],
              exploded: game.gameOver && game.board[row][col] === -1 && game.revealed[row][col],
              pressed: isPressed,
            },
            game.board[row][col]
          );
        }
      }
    }
  }, [game, canvasWidth, canvasHeight, cellSize, isHexagonal, theme]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = rendererRef.current;
    if (renderer) {
      renderer.setTheme(theme);
      for (let row = 0; row < game.rows; row++) {
        for (let col = 0; col < game.cols; col++) {
          if (!isHexagonal || game.isValidCell?.(row, col)) {
            const isPressed = game.pressedCells.some(
              ([r, c]) => r === row && c === col
            );

            renderer.drawCell(
              row,
              col,
              {
                revealed: game.revealed[row][col],
                flagged: game.flagged[row][col],
                exploded: game.gameOver && game.board[row][col] === -1 && game.revealed[row][col],
                pressed: isPressed,
              },
              game.board[row][col]
            );
          }
        }
      }
    }
  }, [theme, game, isHexagonal]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    if (isHexagonal) {
      const renderer = rendererRef.current;
      if (renderer && renderer.getHexCellFromPoint) {
        const { row, col } = renderer.getHexCellFromPoint(canvasX, canvasY);
        if (game.isValidCell?.(row, col)) {
          onCellClick(row, col);
        }
      }
    } else {
      const col = Math.floor(canvasX / cellSize);
      const row = Math.floor(canvasY / cellSize);
      if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
        onCellClick(row, col);
      }
    }
  };

  // Process right-click events
  const handleContextMenu = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    if (isHexagonal) {
      const renderer = rendererRef.current;
      if (renderer && renderer.getHexCellFromPoint) {
        const { row, col } = renderer.getHexCellFromPoint(canvasX, canvasY);
        if (game.isValidCell?.(row, col)) {
          onCellRightClick(e, row, col);
        }
      }
    } else {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
        onCellRightClick(e, row, col);
      }
    }
  };

  const handleDoubleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    if (isHexagonal) {
      const renderer = rendererRef.current;
      if (renderer) {
        const { row, col } = renderer.getHexCellFromPoint(canvasX, canvasY);
        if (game.isValidCell?.(row, col)) {
          onCellDoubleClick(row, col);
        }
      }
    } else {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (row >= 0 && row < game.rows && col >= 0 && col < game.cols) {
        onCellDoubleClick(row, col);
      }
    }
  };

  // Get face content
  const getFaceContent = () => {
    if (game.gameOver) {
      return game.won ? FACE_SVGS.win : FACE_SVGS.dead;
    }
    return isFacePressed ? FACE_SVGS.pressed : FACE_SVGS.normal;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const statusBarStyle = {
    height: `${statusBarHeight}px`,
    width: mounted ? `${totalWidth}px` : "auto",
    paddingBottom: `${statusBarBottomPadding}px`,
    backgroundColor: THEMES[theme].outerBackground,
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: mounted ? `${totalWidth}px` : 'auto',
        height: mounted ? `${totalHeight}px` : 'auto',
      }}
    >
      {/* Status bar */}
      <div
        className="flex justify-between items-center mb-2"
        style={statusBarStyle}
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
            backgroundColor: THEMES[theme].outerBackground,
            border: '3px solid',
            borderColor: isFacePressed
              ? THEMES[theme].borderDark + ' ' + THEMES[theme].borderBright + ' ' + THEMES[theme].borderBright + ' ' + THEMES[theme].borderDark
              : THEMES[theme].borderBright + ' ' + THEMES[theme].borderDark + ' ' + THEMES[theme].borderDark + ' ' + THEMES[theme].borderBright,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
          }}
        >
          <div style={{
            width: mounted ? `${Math.floor(cellSize * 0.85)}px` : 'auto',
            height: mounted ? `${Math.floor(cellSize * 0.85)}px` : 'auto',
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
          width: mounted ? canvasWidth : 'auto',
          height: mounted ? canvasHeight : 'auto',
        }}
      />
    </div>
  );
};

const Settings = ({ settings, onSettingsChange, onReset, onContinue, canContinue, isHexagonal, onHexagonalChange, theme, setTheme }) => {
  const { t } = useI18n();

  const levelToTranslation = {
    'easy': t('easy'),
    'medium': t('medium'),
    'expert': t('expert'),
    'custom': t('custom')
  };

  const modeToTranslation = {
    'classic': t('classic_mode'),
    'hexagonal': t('hexagonal_mode')
  };

  const translationToLevel = Object.fromEntries(
    Object.entries(levelToTranslation).map(([k, v]) => [v, k])
  );

  const translationToMode = Object.fromEntries(
    Object.entries(modeToTranslation).map(([k, v]) => [v, k])
  );

  const [selectedLevel, setSelectedLevel, clearSelectedLevel, isInitialized] = usePersistentState(
    "minesweeper-difficulty",
    'medium',
    365 * 24 * 60 * 60 * 1000
  );

  useEffect(() => {
    if (isInitialized && selectedLevel !== "custom" && DIFFICULTY_LEVELS[selectedLevel]) {
      onSettingsChange(DIFFICULTY_LEVELS[selectedLevel], true);
    }
  }, [selectedLevel, isInitialized]);

  const displayLevel = levelToTranslation[selectedLevel] || levelToTranslation.custom;

  const handleLevelChange = (translatedValue) => {
    const level = translationToLevel[translatedValue];
    trackEvent(
      CATEGORIES.Minesweeper,
      EVENTS.Minesweeper.DifficultyChanged,
      {
        from: selectedLevel,
        to: level
      }
    );
    setSelectedLevel(level);
    if (level !== "custom") {
      onSettingsChange(DIFFICULTY_LEVELS[level], true);
    } else {
      onSettingsChange({
        rows: settings.rows,
        cols: settings.cols,
        mines: settings.mines
      }, false);
    }
  };

  const handleModeChange = (translatedValue) => {
    const mode = translationToMode[translatedValue];
    const isHex = mode === 'hexagonal';
    trackEvent(
      CATEGORIES.Minesweeper,
      EVENTS.Minesweeper.ModeChanged,
      {
        from: isHexagonal ? 'hexagonal' : 'classic',
        to: isHex ? 'hexagonal' : 'classic'
      }
    );
    onHexagonalChange(isHex);
  };

  const getValidatedSettings = (container) => {
    const getValue = (className) => {
      const input = container.querySelector(`.${className}`);
      return parseInt(input.value) || 0;
    };

    const rows = Math.max(5, Math.min(100, getValue('rows-input') || 5));
    const cols = Math.max(5, Math.min(100, getValue('cols-input') || 5));
    const maxMines = rows * cols - 1;
    const mines = Math.max(1, Math.min(maxMines, getValue('mines-input') || 1));

    // Update input values to reflect validated numbers
    const updateInput = (className, value) => {
      const input = container.querySelector(`.${className}`);
      input.value = value;
    };

    updateInput('rows-input', rows);
    updateInput('cols-input', cols);
    updateInput('mines-input', mines);

    return { rows, cols, mines };
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold mt-4 md:mt-0">{t('settings')}</h2>
      <div className="space-y-3">
        <div>
          <label className="block mb-1">{t('game_mode')}</label>
          <CustomListbox
            value={modeToTranslation[isHexagonal ? 'hexagonal' : 'classic']}
            onChange={handleModeChange}
            options={Object.values(modeToTranslation)}
          />
        </div>

        <div>
          <label className="block mb-1">{t('difficulty')}</label>
          <CustomListbox
            value={displayLevel}
            onChange={handleLevelChange}
            options={Object.values(levelToTranslation)}
          />
        </div>
        {selectedLevel === "custom" && (
          <div className="custom-settings space-y-4 my-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('rows')}</label>
                <input
                  type="number"
                  defaultValue={settings.rows}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 rows-input"
                  min="5"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('columns')}</label>
                <input
                  type="number"
                  defaultValue={settings.cols}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 cols-input"
                  min="5"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('mines_count')}</label>
                <input
                  type="number"
                  defaultValue={settings.mines}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 mines-input"
                  min="1"
                  max={settings.rows * settings.cols - 1}
                />
              </div>
            </div>

            <button
              className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 
                         transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
                         focus:ring-offset-2 focus:ring-blue-500"
              onClick={(e) => {
                const container = e.target.closest('.custom-settings');
                const newSettings = getValidatedSettings(container);
                trackEvent(
                  CATEGORIES.Minesweeper,
                  EVENTS.Minesweeper.CustomSettings,
                  {
                    rows: newSettings.rows,
                    cols: newSettings.cols,
                    mines: newSettings.mines
                  }
                );
                onSettingsChange(newSettings, true);
              }}
            >
              {t('apply_changes')}
            </button>
          </div>
        )}

        <div>
          <label className="block mb-1">{t('theme')}</label>
          <CustomListbox
            value={THEME_OPTIONS(t).find(t => t.value === theme).label}
            onChange={(translatedValue) => {
              const selectedTheme = THEME_OPTIONS(t).find(t => t.label === translatedValue).value;
              trackEvent(
                CATEGORIES.Minesweeper,
                EVENTS.Minesweeper.ThemeChanged,
                {
                  from: theme,
                  to: selectedTheme
                }
              );
              setTheme(selectedTheme);
            }}
            options={THEME_OPTIONS(t).map(t => t.label)}
          />
        </div>

        <button
          className="w-full px-4 py-2 bg-[#C0C0C0] text-black rounded 
                     border-t-2 border-l-2 border-[#ffffff] 
                     border-r-2 border-b-2 border-[#808080] 
                     hover:bg-[#d4d4d4] active:border-[#808080]"
          onClick={onReset}
        >
          {t('restart_game')}
        </button>

        <button
          className={`w-full px-4 py-2 text-black rounded 
                     ${canContinue
              ? 'bg-[#C0C0C0] border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-[#808080] hover:bg-[#d4d4d4] active:border-[#808080]'
              : 'bg-[#e0e0e0] text-[#a0a0a0] border-2 border-[#d0d0d0] cursor-not-allowed opacity-50'}`}
          onClick={onContinue}
          disabled={!canContinue}
        >
          {t('continue_game')}
        </button>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.autoFlag}
              onChange={(e) => onSettingsChange({ autoFlag: e.target.checked })}
              className="mr-2"
            />
            <span>{t('auto_flag_mines')}</span>
          </label>
        </div>

        <div className="hidden md:relative md:block w-full bg-gray-100">
          <SideAdComponent/>
        </div>
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

export const __TEST_HOOKS__ = {
  getGameInstance: null
};

export default function Minesweeper() {
  const [settings, setSettings] = usePersistentState(
    "minesweeper-settings",
    {
      rows: 9,
      cols: 9,
      mines: 10,
      autoFlag: false,
    },
    365 * 24 * 60 * 60 * 1000
  );
  const [isHexagonal, setIsHexagonal] = usePersistentState("minesweeper-isHexagonal", false, 365 * 24 * 60 * 60 * 1000);
  const [game, setGame] = useState(new MinesweeperGame(settings.rows, settings.cols, settings.mines));
  const [startTime, setStartTime] = useState(null);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const emojiCanvasRef = useRef(null);
  const emojiRendererRef = useRef(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    message: "",
    title: "",
  });
  const { t } = useI18n();
  const [flagMode, setFlagMode] = useState(false);
  const [theme, setTheme] = usePersistentState(
    "minesweeper-theme",
    "classic",
    365 * 24 * 60 * 60 * 1000
  );

  useEffect(() => {
    const GameClass = isHexagonal ? HexMinesweeperGame : MinesweeperGame;
    const newGame = new GameClass(settings.rows, settings.cols, settings.mines);
    newGame.setAutoFlag(settings.autoFlag);
    setGame(newGame);
  }, [settings?.rows, settings?.cols, settings?.mines, isHexagonal]);

  useEffect(() => {
    if (game && settings) {
      game.setAutoFlag(settings.autoFlag);
    }
  }, [settings?.autoFlag]);

  // Add emoji rendering logic
  useLayoutEffect(() => {
    const canvas = emojiCanvasRef.current;
    if (!canvas) return;

    if (!emojiRendererRef.current) {
      emojiRendererRef.current = new CanvasRenderer(canvas, theme);
    }

    const renderer = emojiRendererRef.current;

    let emojiState = "normal";
    if (game.gameOver) {
      emojiState = game.won ? "win" : "dead";
    }

    renderer.drawEmoji(0, 0, 40, emojiState);
  }, [game.gameOver, game.won, theme]);

  const handleMouseDown = useCallback(() => {
    const canvas = emojiCanvasRef.current;
    if (!canvas || game.gameOver) return;

    const renderer = emojiRendererRef.current;
    renderer.drawEmoji(0, 0, 40, "worried");
  }, [game.gameOver]);

  const handleMouseUp = useCallback(() => {
    const canvas = emojiCanvasRef.current;
    if (!canvas || game.gameOver) return;

    const renderer = emojiRendererRef.current;
    renderer.drawEmoji(0, 0, 40, "normal");
  }, [game.gameOver]);

  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseDown, handleMouseUp]);

  const handleSettingsChange = useCallback(
    (newSettings, shouldReset) => {
      if ("autoFlag" in newSettings) {
        setSettings((prev) => ({ ...prev, autoFlag: newSettings.autoFlag }));
        const GameClass = isHexagonal ? HexMinesweeperGame : MinesweeperGame;
        const newGame = GameClass.copyState(game);
        newGame.setAutoFlag(newSettings.autoFlag);
        setGame(newGame);
      } else {
        const validatedSettings = {
          ...settings,
          rows: Math.max(5, Math.min(100, newSettings.rows)),
          cols: Math.max(5, Math.min(100, newSettings.cols)),
          mines: Math.min(newSettings.mines, (newSettings.rows * newSettings.cols) - 1)
        };

        setSettings(validatedSettings);
        if (shouldReset) {
          const GameClass = isHexagonal ? HexMinesweeperGame : MinesweeperGame;
          const newGame = new GameClass(
            validatedSettings.rows,
            validatedSettings.cols,
            validatedSettings.mines
          );
          newGame.setAutoFlag(validatedSettings.autoFlag);
          setGame(newGame);
          setTime(0);
          setStartTime(null);
          setTimerActive(false);
        }
      }
    },
    [game, settings, isHexagonal]
  );

  const handleReset = useCallback(() => {
    const GameClass = isHexagonal ? HexMinesweeperGame : MinesweeperGame;
    const newGame = new GameClass(settings.rows, settings.cols, settings.mines);
    newGame.setAutoFlag(settings.autoFlag);
    setGame(newGame);
    setTime(0);
    setStartTime(null);
    setTimerActive(false);
  }, [settings, isHexagonal]);

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

    const GameClass = isHexagonal ? HexMinesweeperGame : MinesweeperGame;
    const newGame = GameClass.copyState(game);
    if (flagMode) {
      newGame.toggleFlag(row, col);
    } else {
      newGame.reveal(row, col);
    }
    setGame(newGame);
  };

  const handleCellRightClick = (e, row, col) => {
    e.preventDefault();
    if (game.gameOver) return;

    if (!timerActive) {
      setTimerActive(true);
    }

    const GameClass = isHexagonal ? HexMinesweeperGame : MinesweeperGame;
    const newGame = GameClass.copyState(game);
    newGame.toggleFlag(row, col);
    setGame(newGame);
  };

  const handleCellDoubleClick = useCallback(
    (row, col) => {
      if (game.gameOver) return;

      if (!timerActive) {
        setTimerActive(true);
      }

      const GameClass = isHexagonal ? HexMinesweeperGame : MinesweeperGame;
      const newGame = GameClass.copyState(game);
      newGame.handleDoubleClick(row, col);
      setGame(newGame);

      // If there is a pressed effect, set a timer to clear it
      if (newGame.pressedCells.length > 0) {
        setTimeout(() => {
          const clearedGame = GameClass.copyState(newGame);
          clearedGame.clearPressedCells();
          setGame(clearedGame);
        }, 300);
      }
    },
    [game, timerActive, isHexagonal]
  );

  const handleContinue = useCallback(() => {
    const GameClass = isHexagonal ? HexMinesweeperGame : MinesweeperGame;
    const newGame = GameClass.copyState(game);
    if (newGame.continueGame()) {
      setGame(newGame);
    }
  }, [game, isHexagonal]);

  const handleHexagonalChange = (checked) => {
    setIsHexagonal(checked);
    const GameClass = checked ? HexMinesweeperGame : MinesweeperGame;
    const newGame = new GameClass(settings.rows, settings.cols, settings.mines);
    newGame.setAutoFlag(settings.autoFlag);
    setGame(newGame);
    setTime(0);
    setStartTime(null);
    setTimerActive(false);
  };

  useEffect(() => {
    if (game.gameOver) {
      setTimerActive(false);
      if (game.won && !modalState.isOpen) {
        setModalState({
          isOpen: true,
          message: `${t("congratulations")}\n${t("completion_time", { time: formatTime(time) })}`,
          title: t("victory"),
        });

        trackEvent(
          CATEGORIES.Minesweeper,
          EVENTS.Minesweeper.Success,
          {
            time: time,
            mode: isHexagonal ? "hexagonal" : "classic",
          }
        );
      } else if (!game.won && !modalState.isOpen) {
        setModalState({
          isOpen: true,
          message: t("minesweeper_fail"),
          title: t("game_over"),
        });

        trackEvent(CATEGORIES.Minesweeper, EVENTS.Minesweeper.Fail, {
          time: time,
          mode: isHexagonal ? "hexagonal" : "classic",
        });
      }
    }
  }, [game.gameOver, game.won, time, t, isHexagonal]);

  const closeModal = () => {
    setModalState({
      isOpen: false,
      message: "",
      title: "",
    });
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      __TEST_HOOKS__.getGameInstance = () => game;
    }
  }, [game]);

  return (
    <div className="flex flex-col lg:flex-row w-full mx-auto">
      <div className="w-full lg:w-4/5 lg:mr-8 overflow-auto">
        <div className="flex justify-center mb-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={flagMode}
              onChange={() => setFlagMode(!flagMode)}
              className="sr-only peer"
            />
            <div
              className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer 
                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all 
                            peer-checked:bg-red-500"
            ></div>
            <span className="ml-2 flex items-center gap-1">
              {flagMode ? "🚩" : "👆"}
              <span className="text-sm">{t(flagMode ? "flag_mode" : "dig_mode")}</span>
            </span>
          </label>
        </div>
        <div className="flex flex-col items-center min-w-fit">
          <div
            className="p-6"
            style={{
              backgroundColor: THEMES[theme].outerBackground,
            }}
          >
            <GameBoard
              game={game}
              theme={theme}
              onCellClick={handleCellClick}
              onCellRightClick={handleCellRightClick}
              onCellDoubleClick={handleCellDoubleClick}
              onReset={handleReset}
              time={time}
              isHexagonal={isHexagonal}
            />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/5">
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onReset={handleReset}
          onContinue={handleContinue}
          canContinue={game.gameOver && !game.won && game.lastRevealedMine !== null}
          isHexagonal={isHexagonal}
          onHexagonalChange={handleHexagonalChange}
          theme={theme}
          setTheme={setTheme}
        />
      </div>

      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title}>
        {modalState.message}
      </Modal>
    </div>
  );
}
