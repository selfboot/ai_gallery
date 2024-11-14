"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/app/i18n/client";
import { CustomListbox } from "@/app/components/ListBox";

const TARGET_CELL_SIZE = 20;
const INITIAL_DIRECTION = "RIGHT";

const GAME_STATUS = {
  INIT: "INIT",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  OVER: "OVER",
};

const FOOD_TYPES = ["🍎"];

const DIFFICULTY_LEVELS = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

const DIFFICULTY_PERCENTAGES = {
  [DIFFICULTY_LEVELS.EASY]: { min: 0.001, max: 0.015 },
  [DIFFICULTY_LEVELS.MEDIUM]: { min: 0.015, max: 0.02 },
  [DIFFICULTY_LEVELS.HARD]: { min: 0.02, max: 0.2 },
};

const POWER_UP_TYPES = {
  GHOST: {
    id: "GHOST",
    icon: "🌀",
    name: "ghost_power",
  },
  FOOD_RAIN: {
    id: "FOOD_RAIN",
    icon: "🌳",
    name: "food_rain_power",
  },
  GOLDEN: {
    id: "GOLDEN",
    icon: "👑",
    name: "golden_power",
  },
};

const POWER_UP_CONFIG = {
  SPAWN_INTERVAL: 5000,
  DISPLAY_DURATION: 5000,
};

const FOOD_RAIN_CONFIG = {
  FOOD_COUNT: 10,
  DURATION: 5000,
};

const useGameDimensions = () => {
  const [dimensions, setDimensions] = useState({
    gridWidth: 0,
    gridHeight: 0,
    cellSize: TARGET_CELL_SIZE,
    containerHeight: 0,
    isReady: false,
  });

  useEffect(() => {
    const updateSize = () => {
      const viewportHeight = window.innerHeight;
      const containerHeight = window.innerWidth >= 1024 ? (viewportHeight * 2) / 3 : (viewportHeight * 4) / 5;

      const containerWidth = window.innerWidth >= 1024 ? window.innerWidth * 0.8 * 0.8 : window.innerWidth * 0.95;

      const gridWidth = Math.floor(containerWidth / TARGET_CELL_SIZE);
      const gridHeight = Math.floor(containerHeight / TARGET_CELL_SIZE);
      const cellSize = Math.min(containerWidth / gridWidth, containerHeight / gridHeight);

      setDimensions({
        gridWidth,
        gridHeight,
        cellSize,
        containerHeight,
        isReady: true,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return dimensions;
};

const SnakeGame = () => {
  const { gridWidth, gridHeight, cellSize, containerHeight, isReady } = useGameDimensions();
  const [snake, setSnake] = useState([]);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.INIT);
  const [foodCounts, setFoodCounts] = useState({
    "🍎": 0,
  });
  const [gameTime, setGameTime] = useState(0);
  const [timeInterval, setTimeInterval] = useState(null);
  const [difficulty, setDifficulty] = useState(DIFFICULTY_LEVELS.EASY);
  const [obstacles, setObstacles] = useState([]);
  const [powerUp, setPowerUp] = useState(null);
  const [ghostPowerCount, setGhostPowerCount] = useState(0);
  const { t } = useI18n();

  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  const [enabledPowerUps, setEnabledPowerUps] = useState([
    POWER_UP_TYPES.GHOST.id,
    POWER_UP_TYPES.FOOD_RAIN.id,
    POWER_UP_TYPES.GOLDEN.id,
  ]);

  const [foods, setFoods] = useState([]);
  const [foodRainCount, setFoodRainCount] = useState(0);

  const [isGolden, setIsGolden] = useState(false);
  const [goldenPowerCount, setGoldenPowerCount] = useState(0);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
    });
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 50) {
          setDirection((prev) => (prev !== "LEFT" ? "RIGHT" : prev));
        } else if (deltaX < -50) {
          setDirection((prev) => (prev !== "RIGHT" ? "LEFT" : prev));
        }
      } else {
        if (deltaY > 50) {
          setDirection((prev) => (prev !== "UP" ? "DOWN" : prev));
        } else if (deltaY < -50) {
          setDirection((prev) => (prev !== "DOWN" ? "UP" : prev));
        }
      }
    },
    [touchStart]
  );

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
  }, []);

  const generateRandomFood = useCallback(
    (currentSnake, currentObstacles = []) => {
      let newFood;
      do {
        newFood = {
          x: Math.floor(Math.random() * gridWidth),
          y: Math.floor(Math.random() * gridHeight),
          type: FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)],
        };
      } while (
        currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y) ||
        (Array.isArray(currentObstacles) &&
          currentObstacles.some((obstacle) => obstacle.x === newFood.x && obstacle.y === newFood.y))
      );
      return newFood;
    },
    [gridWidth, gridHeight]
  );

  const generateObstacles = useCallback(
    (currentSnake) => {
      if (!isReady) return [];

      const totalCells = gridWidth * gridHeight;
      const { min, max } = DIFFICULTY_PERCENTAGES[difficulty];
      const obstacleCount = Math.floor(totalCells * (min + Math.random() * (max - min)));

      const obstacles = [];
      const safeZone = 4;

      const snakeHead = currentSnake[0];
      const safeCoords = new Set();
      for (let x = -safeZone; x <= safeZone; x++) {
        for (let y = -safeZone; y <= safeZone; y++) {
          safeCoords.add(`${snakeHead.x + x},${snakeHead.y + y}`);
        }
      }

      while (obstacles.length < obstacleCount) {
        const x = Math.floor(Math.random() * gridWidth);
        const y = Math.floor(Math.random() * gridHeight);
        const coordKey = `${x},${y}`;

        if (
          !safeCoords.has(coordKey) &&
          !currentSnake.some((segment) => segment.x === x && segment.y === y) &&
          !obstacles.some((obs) => obs.x === x && obs.y === y)
        ) {
          obstacles.push({ x, y });
        }
      }

      return obstacles;
    },
    [gridWidth, gridHeight, difficulty, isReady]
  );

  const initializeGame = useCallback(() => {
    if (!isReady) return;

    const initialSnake = [
      { x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) },
      { x: Math.floor(gridWidth / 2) - 1, y: Math.floor(gridHeight / 2) },
      { x: Math.floor(gridWidth / 2) - 2, y: Math.floor(gridHeight / 2) },
    ];

    const newObstacles = generateObstacles(initialSnake);
    setObstacles(newObstacles);
    setSnake(initialSnake);
    setFoods([generateRandomFood(initialSnake, newObstacles)]);
    setDirection(INITIAL_DIRECTION);
    setGameOver(false);
    setIsPlaying(false);
    setGameStatus(GAME_STATUS.INIT);
    setFoodCounts({
      "🍎": 0,
    });
    setGameTime(0);
    setGhostPowerCount(0);
    setPowerUp(null);
  }, [isReady, gridWidth, gridHeight, generateObstacles, generateRandomFood]);

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

  const generatePowerUp = useCallback(() => {
    if (powerUp || enabledPowerUps.length === 0) return;

    const emptySpaces = [];
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const isOccupied =
          snake.some((segment) => segment.x === x && segment.y === y) ||
          foods.some((food) => food.x === x && food.y === y) ||
          obstacles.some((obstacle) => obstacle.x === x && obstacle.y === y);

        if (!isOccupied) {
          emptySpaces.push({ x, y });
        }
      }
    }

    if (emptySpaces.length === 0) return;

    const randomIndex = Math.floor(Math.random() * emptySpaces.length);
    const position = emptySpaces[randomIndex];

    // Choose a random power-up from the enabled ones
    const randomPowerUpId = enabledPowerUps[Math.floor(Math.random() * enabledPowerUps.length)];
    const powerUpType = POWER_UP_TYPES[randomPowerUpId];

    setPowerUp({
      ...position,
      type: powerUpType.icon,
    });

    setTimeout(() => {
      setPowerUp((prev) => (prev && prev.x === position.x && prev.y === position.y ? null : prev));
    }, POWER_UP_CONFIG.DISPLAY_DURATION);
  }, [gridWidth, gridHeight, enabledPowerUps, snake, foods, obstacles]);

  useEffect(() => {
    if (!isPlaying) {
      setPowerUp(null);
      return;
    }

    console.log("isPlaying now", isPlaying);
    generatePowerUp();

    const spawnInterval = setInterval(() => {
      generatePowerUp();
    }, POWER_UP_CONFIG.SPAWN_INTERVAL);

    return () => {
      clearInterval(spawnInterval);
    };
  }, [isPlaying, generatePowerUp]);

  const generateFoodRain = useCallback(() => {
    const newFoods = [];
    for (let i = 0; i < FOOD_RAIN_CONFIG.FOOD_COUNT; i++) {
      newFoods.push(generateRandomFood(snake, obstacles));
    }
    setFoods(newFoods);

    setTimeout(() => {
      setFoods([generateRandomFood(snake, obstacles)]);
    }, FOOD_RAIN_CONFIG.DURATION);
  }, [snake, obstacles, generateRandomFood]);

  const moveSnake = useCallback(() => {
    if (gameOver) return;

    const newSnake = [...snake];
    const head = { ...newSnake[0] };

    switch (direction) {
      case "UP":
        head.y -= 1;
        break;
      case "DOWN":
        head.y += 1;
        break;
      case "LEFT":
        head.x -= 1;
        break;
      case "RIGHT":
        head.x += 1;
        break;
    }

    // Check boundary collision
    if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
      console.log("Fail", head.x, head.y, gridWidth, gridHeight);
      setGameOver(true);
      setIsPlaying(false);
      setGameStatus(GAME_STATUS.OVER);
      return;
    }

    // Check self collision
    if (newSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
      setGameOver(true);
      setIsPlaying(false);
      setGameStatus(GAME_STATUS.OVER);
      return;
    }

    // Check obstacle collision
    if (obstacles.some((obstacle) => obstacle.x === head.x && obstacle.y === head.y)) {
      if (isGolden) {
        // Golden state removes obstacles
        setObstacles((prev) => prev.filter((obs) => !(obs.x === head.x && obs.y === head.y)));
      } else if (ghostPowerCount > 0) {
        setGhostPowerCount((prev) => prev - 1);
      } else {
        setGameOver(true);
        setIsPlaying(false);
        setGameStatus(GAME_STATUS.OVER);
        return;
      }
    }

    // Check if the snake eats the power-up
    if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
      if (powerUp.type === POWER_UP_TYPES.GHOST.icon) {
        setGhostPowerCount((prev) => prev + 1);
        setPowerUp(null);
      } else if (powerUp.type === POWER_UP_TYPES.FOOD_RAIN.icon) {
        setFoodRainCount((prev) => prev + 1);
        generateFoodRain();
        setPowerUp(null);
      } else if (powerUp.type === POWER_UP_TYPES.GOLDEN.icon) {
        setGoldenPowerCount((prev) => prev + 1);
        setIsGolden(true);
        setPowerUp(null);
        // Cancel golden state after 5 seconds
        setTimeout(() => {
          setIsGolden(false);
        }, POWER_UP_CONFIG.DISPLAY_DURATION);
      }
    }

    // Check if the snake eats any food
    const eatenFood = foods.find((f) => f.x === head.x && f.y === head.y);
    if (eatenFood) {
      setFoodCounts((prev) => ({
        ...prev,
        [eatenFood.type]: prev[eatenFood.type] + 1,
      }));
      // Remove the eaten food and generate new food if needed
      setFoods((prev) => {
        const remaining = prev.filter((f) => f !== eatenFood);
        // If there are still foods left, return the remaining ones
        if (remaining.length > 0) {
          return remaining;
        }
        return [generateRandomFood(newSnake, obstacles)];
      });
    } else {
      newSnake.pop();
    }

    newSnake.unshift(head);
    setSnake(newSnake);
  }, [
    snake,
    direction,
    foods,
    gameOver,
    gridWidth,
    gridHeight,
    obstacles,
    generateRandomFood,
    powerUp,
    ghostPowerCount,
    generateFoodRain,
  ]);

  const handleKeyPress = useCallback((e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case "ArrowUp":
        setDirection((prevDirection) => (prevDirection !== "DOWN" ? "UP" : prevDirection));
        break;
      case "ArrowDown":
        setDirection((prevDirection) => (prevDirection !== "UP" ? "DOWN" : prevDirection));
        break;
      case "ArrowLeft":
        setDirection((prevDirection) => (prevDirection !== "RIGHT" ? "LEFT" : prevDirection));
        break;
      case "ArrowRight":
        setDirection((prevDirection) => (prevDirection !== "LEFT" ? "RIGHT" : prevDirection));
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
        setGameTime((prev) => prev + 1);
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
          className: "bg-green-500 hover:bg-green-600 text-white",
        };
      case GAME_STATUS.PLAYING:
        return {
          text: t("pause_game"),
          action: pauseGame,
          className: "bg-yellow-500 hover:bg-yellow-600 text-white",
        };
      case GAME_STATUS.PAUSED:
        return {
          text: t("resume_game"),
          action: resumeGame,
          className: "bg-blue-500 hover:bg-blue-600 text-white",
        };
      case GAME_STATUS.OVER:
        return {
          text: t("restart_game"),
          action: resetGame,
          className: "bg-green-500 hover:bg-green-600 text-white",
        };
      default:
        return {
          text: t("start_game"),
          action: startGame,
          className: "bg-green-500 hover:bg-green-600 text-white",
        };
    }
  }, [gameStatus, t, startGame, pauseGame, resumeGame, resetGame]);

  const renderSnakeSegment = (segment, index, snake, direction, cellSize) => {
    const isHead = index === 0;
    const prevSegment = snake[index - 1] || segment;

    let rotation = 0;
    if (prevSegment.x < segment.x || (isHead && direction === "RIGHT")) rotation = 0;
    else if (prevSegment.y < segment.y || (isHead && direction === "DOWN")) rotation = 90;
    else if (prevSegment.x > segment.x || (isHead && direction === "LEFT")) rotation = 180;
    else if (prevSegment.y > segment.y || (isHead && direction === "UP")) rotation = 270;

    const radius = cellSize / 2;
    const snakeColor = isGolden ? "gold" : "blue"; // Set color based on golden state

    return (
      <g
        key={index}
        transform={`translate(${segment.x * cellSize}, ${segment.y * cellSize}) rotate(${rotation}, ${cellSize / 2}, ${
          cellSize / 2
        })`}
      >
        <circle
          cx={cellSize / 2}
          cy={cellSize / 2}
          r={radius}
          fill={snakeColor}
          filter={isGolden ? "url(#golden-glow)" : "none"} // Add golden glow effect
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
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const renderObstacles = useCallback(() => {
    return obstacles.map((obstacle, index) => (
      <rect
        key={`obstacle-${index}`}
        x={obstacle.x * cellSize}
        y={obstacle.y * cellSize}
        width={cellSize}
        height={cellSize}
        fill="#666"
      />
    ));
  }, [obstacles, cellSize]);

  return (
    <div className="container mx-auto">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <div
          className="lg:w-4/5 flex flex-col items-left"
          tabIndex={0}
          onKeyDown={(e) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
              e.preventDefault();
            }
          }}
          style={{ outline: "none" }}
        >
          {isReady && (
            <>
              <div
                className="game-container relative w-full bg-green-50 rounded-lg shadow-lg overflow-hidden"
                style={{
                  height: containerHeight,
                  width: gridWidth * cellSize,
                  touchAction: "none",
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {snake.length > 0 && foods && (
                  <svg
                    width={gridWidth * cellSize}
                    height={gridHeight * cellSize}
                    className="w-full h-full"
                    viewBox={`0 0 ${gridWidth * cellSize} ${gridHeight * cellSize}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {renderObstacles()}
                    {snake.map((segment, index) => renderSnakeSegment(segment, index, snake, direction, cellSize))}
                    {foods.map((food, index) => (
                      <text
                        key={`food-${index}`}
                        x={food.x * cellSize + cellSize / 2}
                        y={food.y * cellSize + cellSize / 2}
                        fontSize={cellSize}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {food.type}
                      </text>
                    ))}
                    {powerUp && (
                      <text
                        x={powerUp.x * cellSize + cellSize / 2}
                        y={powerUp.y * cellSize + cellSize / 2}
                        fontSize={cellSize}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {powerUp.type}
                      </text>
                    )}
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
                  {FOOD_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <span className="text-xl">{type}</span>
                      <span className="text-xl min-w-[2ch]">{foodCounts[type].toString()}</span>
                    </div>
                  ))}
                  {Object.values(POWER_UP_TYPES).map(
                    (powerUp) =>
                      enabledPowerUps.includes(powerUp.id) && (
                        <div key={powerUp.id} className="flex items-center space-x-2">
                          <span className="text-xl">{powerUp.icon}</span>
                          <span className="text-xl min-w-[2ch]">
                            {powerUp.id === "GHOST"
                              ? ghostPowerCount
                              : powerUp.id === "FOOD_RAIN"
                              ? foodRainCount
                              : powerUp.id === "GOLDEN"
                              ? goldenPowerCount
                              : 0}
                          </span>
                        </div>
                      )
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="lg:w-1/5 mt-8 lg:mt-0">
          <h2 className="text-xl font-bold mb-4">{t("game_settings")}</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-700 mb-2">{t("obstacles_difficulty")}</label>
              <CustomListbox
                value={t(difficulty)}
                onChange={(value) => {
                  const newDifficulty = Object.keys(DIFFICULTY_LEVELS).find(
                    (key) => t(DIFFICULTY_LEVELS[key]) === value
                  );
                  setDifficulty(DIFFICULTY_LEVELS[newDifficulty]);
                  if (gameStatus !== GAME_STATUS.PLAYING) {
                    initializeGame();
                  }
                }}
                options={Object.values(DIFFICULTY_LEVELS).map((level) => t(level))}
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-2">{t("power_ups")}</label>
              <div className="space-y-2">
                {Object.values(POWER_UP_TYPES).map((powerUp) => (
                  <label key={powerUp.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enabledPowerUps.includes(powerUp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEnabledPowerUps((prev) => [...prev, powerUp.id]);
                        } else {
                          setEnabledPowerUps((prev) => prev.filter((id) => id !== powerUp.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      {powerUp.icon} {t(powerUp.name)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
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
