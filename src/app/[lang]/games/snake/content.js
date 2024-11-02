"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/app/i18n/client";

const TARGET_CELL_SIZE = 20;
const INITIAL_DIRECTION = "RIGHT";

const GAME_STATUS = {
  INIT: 'INIT',      // 初始状态
  PLAYING: 'PLAYING', // 游戏中
  PAUSED: 'PAUSED',  // 暂停
  OVER: 'OVER'       // 游戏结束
};

const FOOD_TYPES = ['🍎', '🍌', '🥔', '🍇', '🍊'];

const useGameDimensions = () => {
  const [dimensions, setDimensions] = useState({
    gridWidth: 0,
    gridHeight: 0,
    cellSize: TARGET_CELL_SIZE,
    containerHeight: 0,
    isReady: false
  });

  useEffect(() => {
    const updateSize = () => {
      const viewportHeight = window.innerHeight;
      const containerHeight = window.innerWidth >= 1024
        ? viewportHeight * 2 / 3
        : viewportHeight * 4 / 5;

      const containerWidth = window.innerWidth >= 1024
        ? window.innerWidth * 0.8 * 0.8
        : window.innerWidth * 0.95;

      const gridWidth = Math.floor(containerWidth / TARGET_CELL_SIZE);
      const gridHeight = Math.floor(containerHeight / TARGET_CELL_SIZE);
      const cellSize = Math.min(
        containerWidth / gridWidth,
        containerHeight / gridHeight
      );

      setDimensions({
        gridWidth,
        gridHeight,
        cellSize,
        containerHeight,
        isReady: true
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return dimensions;
};

const SnakeGame = () => {
  const { gridWidth, gridHeight, cellSize, containerHeight, isReady } = useGameDimensions();
  const [snake, setSnake] = useState([]);
  const [food, setFood] = useState(null);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.INIT);
  const [foodCounts, setFoodCounts] = useState({
    '🍎': 0, '🍌': 0, '🥔': 0, '🍇': 0, '🍊': 0
  });
  const [gameTime, setGameTime] = useState(0);
  const [timeInterval, setTimeInterval] = useState(null);
  const { t } = useI18n();

  // 添加触摸相关状态
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  // 处理触摸开始
  const handleTouchStart = useCallback((e) => {
    // 阻止默认行为
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY
    });
  }, []);

  // 处理触摸结束
  const handleTouchEnd = useCallback((e) => {
    // 阻止默认行为
    e.preventDefault();
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // 确定主要的滑动方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (deltaX > 50) {
        setDirection(prev => prev !== "LEFT" ? "RIGHT" : prev);
      } else if (deltaX < -50) {
        setDirection(prev => prev !== "RIGHT" ? "LEFT" : prev);
      }
    } else {
      // 垂直滑动
      if (deltaY > 50) {
        setDirection(prev => prev !== "UP" ? "DOWN" : prev);
      } else if (deltaY < -50) {
        setDirection(prev => prev !== "DOWN" ? "UP" : prev);
      }
    }
  }, [touchStart]);

  // 添加触摸移动事件处理
  const handleTouchMove = useCallback((e) => {
    // 阻止默认行为
    e.preventDefault();
  }, []);

  const generateRandomFood = useCallback((currentSnake) => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight),
        type: FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)]
      };
    } while (
      currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      )
    );
    return newFood;
  }, [gridWidth, gridHeight]);

  const initializeGame = useCallback(() => {
    if (!isReady) return;

    const initialSnake = [
      { x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) },
      { x: Math.floor(gridWidth / 2) - 1, y: Math.floor(gridHeight / 2) },
      { x: Math.floor(gridWidth / 2) - 2, y: Math.floor(gridHeight / 2) },
    ];

    setSnake(initialSnake);
    setFood(generateRandomFood(initialSnake));
    setDirection(INITIAL_DIRECTION);
    setGameOver(false);
    setIsPlaying(false);
    setGameStatus(GAME_STATUS.INIT);
    setFoodCounts({
      '🍎': 0, '🍌': 0, '🥔': 0, '🍇': 0, '🍊': 0
    });
    setGameTime(0);
  }, [isReady, gridWidth, gridHeight, generateRandomFood]);

  useEffect(() => {
    initializeGame();
  }, [isReady, initializeGame]);

  const startGame = useCallback(() => {
    setIsPlaying(true);
    setGameStatus(GAME_STATUS.PLAYING);
  }, []);

  const pauseGame = useCallback(() => {
    setIsPlaying(false);
    setGameStatus(GAME_STATUS.PAUSED);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPlaying(true);
    setGameStatus(GAME_STATUS.PLAYING);
  }, []);

  const resetGame = useCallback(() => {
    initializeGame();
    startGame();
  }, [initializeGame, startGame]);

  const moveSnake = useCallback(() => {
    if (gameOver) return;

    const newSnake = [...snake];
    const head = { ...newSnake[0] };

    switch (direction) {
      case "UP": head.y -= 1; break;
      case "DOWN": head.y += 1; break;
      case "LEFT": head.x -= 1; break;
      case "RIGHT": head.x += 1; break;
    }

    if (
      head.x < 0 ||
      head.x >= gridWidth ||
      head.y < 0 ||
      head.y >= gridHeight
    ) {
      setGameOver(true);
      setIsPlaying(false);
      setGameStatus(GAME_STATUS.OVER);
      return;
    }

    if (
      newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
    ) {
      setGameOver(true);
      setIsPlaying(false);
      setGameStatus(GAME_STATUS.OVER);
      return;
    }

    newSnake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      setFoodCounts(prev => ({
        ...prev,
        [food.type]: prev[food.type] + 1
      }));
      generateFood(newSnake);
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [snake, direction, food, gameOver, gridWidth, gridHeight]);

  const generateFood = useCallback((currentSnake) => {
    setFood(generateRandomFood(currentSnake));
  }, [generateRandomFood]);

  const handleKeyPress = useCallback((e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case "ArrowUp":
        setDirection((prevDirection) =>
          prevDirection !== "DOWN" ? "UP" : prevDirection
        );
        break;
      case "ArrowDown":
        setDirection((prevDirection) =>
          prevDirection !== "UP" ? "DOWN" : prevDirection
        );
        break;
      case "ArrowLeft":
        setDirection((prevDirection) =>
          prevDirection !== "RIGHT" ? "LEFT" : prevDirection
        );
        break;
      case "ArrowRight":
        setDirection((prevDirection) =>
          prevDirection !== "LEFT" ? "RIGHT" : prevDirection
        );
        break;
    }
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const gameLoop = setInterval(moveSnake, 150);
    window.addEventListener("keydown", handleKeyPress);

    return () => {
      clearInterval(gameLoop);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [moveSnake, handleKeyPress, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
      setTimeInterval(interval);
    } else if (timeInterval) {
      clearInterval(timeInterval);
      setTimeInterval(null);
    }
    return () => {
      if (timeInterval) {
        clearInterval(timeInterval);
      }
    };
  }, [isPlaying]);

  const getButtonConfig = useCallback(() => {
    switch (gameStatus) {
      case GAME_STATUS.INIT:
        return {
          text: t("start_game"),
          action: startGame,
          className: 'bg-green-500 hover:bg-green-600 text-white'
        };
      case GAME_STATUS.PLAYING:
        return {
          text: t("pause_game"),
          action: pauseGame,
          className: 'bg-yellow-500 hover:bg-yellow-600 text-white'
        };
      case GAME_STATUS.PAUSED:
        return {
          text: t("resume_game"),
          action: resumeGame,
          className: 'bg-blue-500 hover:bg-blue-600 text-white'
        };
      case GAME_STATUS.OVER:
        return {
          text: t("restart_game"),
          action: resetGame,
          className: 'bg-green-500 hover:bg-green-600 text-white'
        };
      default:
        return {
          text: t("start_game"),
          action: startGame,
          className: 'bg-green-500 hover:bg-green-600 text-white'
        };
    }
  }, [gameStatus, t, startGame, pauseGame, resumeGame, resetGame]);

  const renderSnakeSegment = (segment, index, snake, direction, cellSize) => {
    const isHead = index === 0;
    const prevSegment = snake[index - 1] || segment;

    let rotation = 0;
    if (prevSegment.x < segment.x || (isHead && direction === "RIGHT"))
      rotation = 0;
    else if (prevSegment.y < segment.y || (isHead && direction === "DOWN"))
      rotation = 90;
    else if (prevSegment.x > segment.x || (isHead && direction === "LEFT"))
      rotation = 180;
    else if (prevSegment.y > segment.y || (isHead && direction === "UP"))
      rotation = 270;

    const radius = cellSize / 2;

    return (
      <g
        key={index}
        transform={`translate(${segment.x * cellSize}, ${segment.y * cellSize}) rotate(${rotation}, ${cellSize / 2}, ${cellSize / 2})`}
      >
        <circle
          cx={cellSize / 2}
          cy={cellSize / 2}
          r={radius}
          fill="blue"
        />
        {isHead && (
          <>
            <circle cx={cellSize / 3} cy={cellSize / 3} r="2" fill="white" />
            <circle cx={(cellSize * 2) / 3} cy={cellSize / 3} r="2" fill="white" />
            <circle cx={cellSize / 3} cy={cellSize / 3} r="1" fill="black" />
            <circle cx={(cellSize * 2) / 3} cy={cellSize / 3} r="1" fill="black" />
          </>
        )}
      </g>
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <div className="lg:w-4/5 flex flex-col items-center"
          tabIndex={0}
          onKeyDown={(e) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
              e.preventDefault();
            }
          }}
          style={{ outline: 'none' }}
        >
          {isReady && (
            <>
              <div
                className="game-container relative w-full bg-green-50 rounded-lg shadow-lg overflow-hidden"
                style={{
                  height: containerHeight,
                  touchAction: 'none'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {snake.length > 0 && food && (
                  <svg
                    width={gridWidth * cellSize}
                    height={gridHeight * cellSize}
                    className="w-full h-full"
                    viewBox={`0 0 ${gridWidth * cellSize} ${gridHeight * cellSize}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {snake.map((segment, index) =>
                      renderSnakeSegment(segment, index, snake, direction, cellSize)
                    )}
                    <text
                      x={food.x * cellSize + cellSize / 2}
                      y={food.y * cellSize + cellSize / 2}
                      fontSize={cellSize}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {food.type}
                    </text>
                  </svg>
                )}
                {gameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <p className="text-3xl font-bold mb-4">{t("game_over")}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 w-full">
                <div className="flex flex-wrap gap-4 items-center justify-center lg:justify-start">
                  <div className="flex items-center space-x-2 pl-0">
                    <span className="text-xl">⏱️</span>
                    <span className="text-xl min-w-[4ch]">{formatTime(gameTime)}</span>
                  </div>
                  {FOOD_TYPES.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <span className="text-xl">{type}</span>
                      <span className="text-xl min-w-[2ch]">
                        {foodCounts[type].toString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="lg:w-1/5 mt-8 lg:mt-0">
          <h2 className="text-xl font-bold mb-4">{t('game_settings')}</h2>
          <div>
            <button
              className={`w-full px-4 py-2 rounded transition ${getButtonConfig().className}`}
              onClick={getButtonConfig().action}
            >
              {getButtonConfig().text}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
