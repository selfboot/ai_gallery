"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { SokobanLogic, ELEMENTS, SPRITE_CONFIG } from "./gameLogic";

const SokobanGame = () => {
  const [difficulty, setDifficulty] = useState(100);
  const [gameInstance, setGameInstance] = useState(null);
  const [gameState, setGameState] = useState({
    map: [],
    moves: 0,
    estimatedSteps: 0,
    isWon: false,
  });
  const [playerDirection, setPlayerDirection] = useState("FRONT");

  useEffect(() => {
    resetGame();
  }, [difficulty]);

  const resetGame = () => {
    const newGame = new SokobanLogic(difficulty);
    setGameInstance(newGame);
    setGameState(newGame.getState());
  };

  const movePlayer = useCallback(
    (direction) => {
      if (!gameInstance || gameState.isWon) return;

      setPlayerDirection(direction === "UP" ? "BACK" : 
                        direction === "DOWN" ? "FRONT" : 
                        direction);

      const newMap = gameInstance.movePlayer(direction);
      if (newMap) {
        setGameState(gameInstance.getState());
      }
    },
    [gameInstance, gameState.isWon]
  );

  const getBoxStyle = (isOnTarget) => {
    const boxColors = ['BROWN', 'RED', 'BLUE', 'PURPLE', 'YELLOW'];
    const colorIndex = 2;
    
    return isOnTarget 
      ? SPRITE_CONFIG.SPRITE_POSITIONS.CRATE_DARK[boxColors[colorIndex]]
      : SPRITE_CONFIG.SPRITE_POSITIONS.CRATE[boxColors[colorIndex]];
  };

  const renderCell = (value, x, y, map) => {
    const getSpriteCss = (position, size = SPRITE_CONFIG.SPRITE_SIZE) => ({
      width: typeof size === "number" ? `${size}px` : `${size.width}px`,
      height: typeof size === "number" ? `${size}px` : `${size.height}px`,
      background: `url(${SPRITE_CONFIG.SPRITE_SHEET})`,
      backgroundPosition: `-${position.x}px -${position.y}px`,
      backgroundSize: "auto",
    });

    const baseCell = (
      <div style={getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.GROUND.SAND)} />
    );

    switch (value) {
      case ELEMENTS.WALL:
        return <div style={getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.WALL['BLACK'])} />;

      case ELEMENTS.BOX:
        return (
          <div className="relative">
            {baseCell}
            <div className="absolute top-0 left-0" style={getSpriteCss(getBoxStyle(false))} />
          </div>
        );

      case ELEMENTS.TARGET:
        return (
          <div className="relative">
            {baseCell}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
              style={getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.ENDPOINT.RED, SPRITE_CONFIG.ENDPOINT_SIZE)} 
            />
          </div>
        );

      case ELEMENTS.PLAYER:
      case ELEMENTS.PLAYER_ON_TARGET:
        return (
          <div className="relative">
            {baseCell}
            {value === ELEMENTS.PLAYER_ON_TARGET && (
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                style={getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.ENDPOINT.RED, SPRITE_CONFIG.ENDPOINT_SIZE)} 
              />
            )}
            <div 
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2" 
              style={getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER[playerDirection], SPRITE_CONFIG.CHARACTER_SIZE)} 
            />
          </div>
        );

      case ELEMENTS.BOX_ON_TARGET:
        return (
          <div className="relative">
            {baseCell}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
              style={getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.ENDPOINT.RED, SPRITE_CONFIG.ENDPOINT_SIZE)} 
            />
            <div 
              className="absolute top-0 left-0 animate-pulse" 
              style={getSpriteCss(getBoxStyle(true))} 
            />
          </div>
        );

      default:
        return baseCell;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (gameState.isWon) return;

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          movePlayer("UP");
          break;
        case "ArrowDown":
          event.preventDefault();
          movePlayer("DOWN");
          break;
        case "ArrowLeft":
          event.preventDefault();
          movePlayer("LEFT");
          break;
        case "ArrowRight":
          event.preventDefault();
          movePlayer("RIGHT");
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState.isWon, movePlayer]);

  return (
    <div className="flex flex-col lg:flex-row w-full gap-4 p-4">
      <div className="w-full lg:w-4/5 flex flex-col items-center gap-4">
        <div className="grid bg-gray-300 p-0.5 rounded">
          {gameState.map.map((row, y) => (
            <div key={y} className="flex">
              {row.map((cell, x) => (
                <div key={`${x}-${y}`} className="relative">
                  {renderCell(cell, x, y, gameState.map)}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 mt-4 lg:hidden">
          <button className="p-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => movePlayer("UP")}>
            <ArrowUp />
          </button>
          <div className="flex gap-2">
            <button className="p-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => movePlayer("LEFT")}>
              <ArrowLeft />
            </button>
            <button className="p-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => movePlayer("DOWN")}>
              <ArrowDown />
            </button>
            <button className="p-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => movePlayer("RIGHT")}>
              <ArrowRight />
            </button>
          </div>
        </div>

        {gameState.isWon && (
          <div className="mt-4 text-2xl font-bold text-green-500">
            恭喜你赢了! 总共移动 {gameState.moves} 步，预期步数 {gameState.estimatedSteps} 步
          </div>
        )}
      </div>

      {/* 设置区域 */}
      <div className="w-full lg:w-1/5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">难度系数: {difficulty}</label>
          <input
            type="range"
            min="1"
            max="1000"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-lg">步数: {gameState.moves}</div>
          <div className="text-lg">预计最优步数: {gameState.estimatedSteps}</div>
        </div>

        <button
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={resetGame}
        >
          <RotateCcw size={16} />
          重置
        </button>
      </div>
    </div>
  );
};

export default SokobanGame;
