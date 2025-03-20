"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCcw, Pencil, Save, Trash2 } from "lucide-react";
import { SokobanLogic, ELEMENTS, SPRITE_CONFIG, decodeMapFromId, calculateMapId, validateMap } from "./gameLogic";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { trackEvent, CATEGORIES, EVENTS } from "@/app/utils/analytics";
import {SideAdComponent} from "@/app/components/AdComponent";

const STORAGE_KEY = 'sokoban-progress';

const SokobanGame = ({ lang, levels }) => {
  const { t } = useI18n();
  const [currentLevel, setCurrentLevel] = useState(null);
  const [completedLevels, setCompletedLevels] = useState({});
  const [gameInstance, setGameInstance] = useState(null);
  const [gameState, setGameState] = useState({
    map: [],
    moves: 0,
    isWon: false,
  });
  const [playerDirection, setPlayerDirection] = useState("FRONT");
  const [isMoving, setIsMoving] = useState(false);
  const [leftMoveFrame, setLeftMoveFrame] = useState(0);
  const [rightMoveFrame, setRightMoveFrame] = useState(0);
  const [upMoveFrame, setUpMoveFrame] = useState(0);
  const [downMoveFrame, setDownMoveFrame] = useState(0);
  const [cellSize, setCellSize] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editConfig, setEditConfig] = useState({
    width: 8,
    height: 8,
    selectedElement: ELEMENTS.FLOOR
  });
  const [customMap, setCustomMap] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [customLevelInfo, setCustomLevelInfo] = useState(null);

  const elementTypes = [
    { type: ELEMENTS.EMPTY, name: "Empty" },
    { type: ELEMENTS.FLOOR, name: "Floor" },
    { type: ELEMENTS.WALL, name: "Wall" },
    { type: ELEMENTS.PLAYER, name: "Player" },
    { type: ELEMENTS.BOX, name: "Box" },
    { type: ELEMENTS.TARGET, name: "Target" },
    { type: ELEMENTS.BOX_ON_TARGET, name: "Box on Target" },
  ];

  const resetGame = useCallback(() => {
    if (customLevelInfo) {
      const newGame = new SokobanLogic(0, [customLevelInfo.map]);
      setGameInstance(newGame);
      setGameState(newGame.getState());
      return;
    }

    if (currentLevel === null) return;
    if (!levels[currentLevel]) return;

    const newGame = new SokobanLogic(currentLevel, levels);
    setGameInstance(newGame);
    setGameState(newGame.getState());
  }, [currentLevel, levels, customLevelInfo]);

  const updateLevelURL = useCallback((levelIndex) => {
    const newUrl = new URL(window.location.pathname, window.location.origin);
    newUrl.searchParams.set('level', levelIndex + 1);
    window.history.replaceState({}, '', newUrl);
  }, []);

  const handleLevelChange = useCallback((levelIndex) => {
    setCurrentLevel(levelIndex);
    updateLevelURL(levelIndex);
  }, [updateLevelURL]);

  const initializeEditMap = useCallback(() => {
    const newMap = Array(editConfig.height).fill()
      .map(() => Array(editConfig.width).fill(ELEMENTS.EMPTY));
    setCustomMap(newMap);
  }, [editConfig.width, editConfig.height]);

  const handleCellClick = async (x, y) => {
    if (isEditMode) {
      if (!customMap) return;

      const newMap = customMap.map((row) => [...row]);
      if (editConfig.selectedElement === ELEMENTS.PLAYER) {
        for (let i = 0; i < newMap.length; i++) {
          for (let j = 0; j < newMap[i].length; j++) {
            if ([ELEMENTS.PLAYER, ELEMENTS.PLAYER_ON_TARGET].includes(newMap[i][j])) {
              newMap[i][j] = newMap[i][j] === ELEMENTS.PLAYER_ON_TARGET ? ELEMENTS.TARGET : ELEMENTS.FLOOR;
            }
          }
        }

        newMap[y][x] = newMap[y][x] === ELEMENTS.TARGET ? ELEMENTS.PLAYER_ON_TARGET : ELEMENTS.PLAYER;
      } else {
        newMap[y][x] = editConfig.selectedElement;
      }

      setCustomMap(newMap);
      return;
    }
    const clickedCell = gameState.map[y][x];
    if (selectedBox) {
      const moves = gameInstance.findPushPath(selectedBox, { x, y });
      if (moves) {
        gameInstance.startNewMoveGroup();
        for (const move of moves) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          movePlayer(move.direction);
        }
      }
      setSelectedBox(null);
      return;
    }

    if ([ELEMENTS.BOX, ELEMENTS.BOX_ON_TARGET].includes(clickedCell)) {
      const playerPos = gameInstance.findPlayer();
      const isAdjacent = Math.abs(playerPos.x - x) + Math.abs(playerPos.y - y) === 1;

      if (isAdjacent) {
        setSelectedBox({ x, y });
      }
      return;
    }

    const directions = await gameInstance.autoMoveTo({ x, y });
    if (directions) {
      gameInstance.startNewMoveGroup();
      for (const direction of directions) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        movePlayer(direction);
      }
    }
  };

  // Save custom map
  const saveCustomMap = () => {
    const validation = validateMap(customMap);
    if (!validation.isValid) {
      setModalMessage(t("invalid_map"));
      setShowModal(true);
      return;
    }

    const mapHash = calculateMapId(customMap);
    const newUrl = new URL(window.location.pathname, window.location.origin);
    newUrl.searchParams.set("id", mapHash);
    window.history.replaceState({}, "", newUrl);

    setIsEditMode(false);
    setGameInstance(new SokobanLogic(0, [customMap]));
    setGameState(new SokobanLogic(0, [customMap]).getState());

    trackEvent(CATEGORIES.Sokoban, EVENTS.Sokoban.SaveCustomMap, {
      mapHash: mapHash,
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const levelParam = params.get('level');
    const customId = params.get('id');
    const savedProgress = localStorage.getItem(STORAGE_KEY);
    const savedLevels = savedProgress ? JSON.parse(savedProgress) : {};
    setCompletedLevels(savedLevels);

    let newLevel;

    if (customId) {
      try {
        const customMap = decodeMapFromId(customId);
        const gameInstance = new SokobanLogic(0, [customMap]);
        setGameInstance(gameInstance);
        setGameState(gameInstance.getState());
        setCustomLevelInfo({
          id: customId,
          map: customMap
        });
        return;
      } catch (error) {
        console.error(error);
        setModalMessage(t("invalid_custom_map"));
        setShowModal(true);
        const newUrl = new URL(window.location.pathname, window.location.origin);
        const levelHashes = levels.map(calculateMapId);
        const firstUncompletedLevel = levelHashes.findIndex(hash => !savedLevels[hash]);
        newLevel = firstUncompletedLevel === -1 ? 0 : firstUncompletedLevel;

        newUrl.searchParams.set('level', newLevel + 1);
        window.history.replaceState({}, '', newUrl);
      }
    } else if (levelParam) {
      const requestedLevel = parseInt(levelParam) - 1;
      if (requestedLevel >= 0 && requestedLevel < levels.length) {
        newLevel = requestedLevel;
      }
    }

    if (newLevel === undefined) {
      if (savedProgress) {
        const levelHashes = levels.map(calculateMapId);
        const firstUncompletedLevel = levelHashes.findIndex(hash => !savedLevels[hash]);
        newLevel = firstUncompletedLevel === -1 ? 0 : firstUncompletedLevel;
      } else {
        newLevel = 0;
      }
    }

    handleLevelChange(newLevel);
  }, [levels, handleLevelChange]);

  useEffect(() => {
    resetGame();
  }, [currentLevel]);

  const movePlayer = useCallback(
    (direction) => {
      if (!gameInstance || gameState.isWon) return;
      
      setPlayerDirection(direction);
      setIsMoving(true);

      const animate = () => {
        switch (direction) {
          case "LEFT":
            setLeftMoveFrame((prev) => (prev === 0 ? 1 : 0));
            break;
          case "RIGHT":
            setRightMoveFrame((prev) => (prev === 0 ? 1 : 0));
            break;
          case "UP":
            setUpMoveFrame((prev) => (prev === 2 ? 0 : prev + 1));
            break;
          case "DOWN":
            setDownMoveFrame((prev) => (prev === 2 ? 0 : prev + 1));
            break;
        }
      };
      animate();

      setTimeout(() => {
        setIsMoving(false);
        setLeftMoveFrame(0);
        setRightMoveFrame(0);
        setUpMoveFrame(0);
        setDownMoveFrame(0);
      }, 300);

      const newMap = gameInstance.movePlayer(direction);
      if (newMap) {
        setGameState(gameInstance.getState());
      }
    },
    [gameInstance, gameState.isWon]
  );

  const getBoxStyle = (isSelected) => {
    if (isSelected) {
      return SPRITE_CONFIG.SPRITE_POSITIONS.CRATE.YELLOW;
    }
    return SPRITE_CONFIG.SPRITE_POSITIONS.CRATE.BLUE;
  };

  const getPlayerSprite = (direction) => {
    switch (direction) {
      case "LEFT":
        return isMoving
          ? leftMoveFrame === 0
            ? SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.LEFT
            : SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.LEFT_MOVE
          : SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.LEFT;
      case "RIGHT":
        return isMoving
          ? rightMoveFrame === 0
            ? SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.RIGHT
            : SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.RIGHT_MOVE
          : SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.RIGHT;
      case "UP":
        return isMoving
          ? SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER[`UP_${upMoveFrame}`]
          : SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.UP_0;
      case "DOWN":
        return isMoving
          ? SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER[`DOWN_${downMoveFrame}`]
          : SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.DOWN_0;
      default:
        return SPRITE_CONFIG.SPRITE_POSITIONS.PLAYER.FRONT;
    }
  };

  const renderCell = (value, x, y) => {
    const scale = cellSize / SPRITE_CONFIG.SPRITE_SIZE;

    const getSpriteCss = (position, size = SPRITE_CONFIG.SPRITE_SIZE) => {
      const originalWidth = typeof size === "number" ? size : size.width;
      const originalHeight = typeof size === "number" ? size : size.height;

      return {
        width: `${originalWidth}px`,
        height: `${originalHeight}px`,
        background: `url(${SPRITE_CONFIG.SPRITE_SHEET})`,
        backgroundPosition: `-${position.x}px -${position.y}px`,
        backgroundSize: "auto",
        transform: `scale(${scale})`, // Use transform for overall scaling
        transformOrigin: "top left",
        imageRendering: "pixelated",  // Keep pixelated style clear
      };
    };

    const renderEndpoint = (container) => {
      return (
        <div className="relative">
          {container}
          <div
            className="absolute"
            style={{
              ...getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.ENDPOINT.RED, SPRITE_CONFIG.ENDPOINT_SIZE),
              left: `${(cellSize - SPRITE_CONFIG.ENDPOINT_SIZE * scale) / 2}px`,
              top: `${(cellSize - SPRITE_CONFIG.ENDPOINT_SIZE * scale) / 2}px`,
            }}
            onClick={() => handleCellClick(x, y)}
          />
        </div>
      );
    };

    const renderBox = (isOnTarget, container) => {
      const isSelected = selectedBox && selectedBox.x === x && selectedBox.y === y;
      return (
        <div className="relative">
          {container}
          <div
            className="absolute top-0 left-0"
            style={{
              ...getSpriteCss(getBoxStyle(isSelected), SPRITE_CONFIG.SPRITE_SIZE),
            }}
            onClick={() => handleCellClick(x, y)}
          />
          {isOnTarget && (
            <div
              className="absolute"
              style={{
                ...getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.ENDPOINT.RED, SPRITE_CONFIG.ENDPOINT_SIZE),
                left: `${(cellSize - SPRITE_CONFIG.ENDPOINT_SIZE * scale) / 2}px`,
                top: `${(cellSize - SPRITE_CONFIG.ENDPOINT_SIZE * scale) / 2}px`,
              }}
            />
          )}
        </div>
      );
    };

    const baseCell = (
      <div
        style={{
          width: `${cellSize}px`,
          height: `${cellSize}px`,
          position: "relative",
          overflow: "hidden",
        }}
        onClick={() => handleCellClick(x, y)}
      >
        {value !== ELEMENTS.EMPTY && <div style={getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.GROUND.SAND)} />}
      </div>
    );

    const renderPlayer = (isOnTarget, baseCell) => {
      const sprite = getPlayerSprite(playerDirection);
      const characterSize = {
        width: sprite.width,
        height: sprite.height,
      };

      return (
        <div style={{ width: `${cellSize}px`, height: `${cellSize}px`, position: "relative" }}>
          {baseCell}
          {isOnTarget && (
            <div
              className="absolute"
              style={{
                ...getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.ENDPOINT.RED, SPRITE_CONFIG.ENDPOINT_SIZE),
                left: `${(cellSize - SPRITE_CONFIG.ENDPOINT_SIZE * scale) / 2}px`,
                top: `${(cellSize - SPRITE_CONFIG.ENDPOINT_SIZE * scale) / 2}px`,
              }}
            />
          )}
          <div
            className="absolute"
            style={{
              ...getSpriteCss(sprite, characterSize),
              top: `${(cellSize - characterSize.height * scale) / 2}px`,
              left: `${(cellSize - characterSize.width * scale) / 2}px`,
            }}
          />
        </div>
      );
    };

    switch (value) {
      case ELEMENTS.EMPTY:
        return baseCell;
      case ELEMENTS.WALL:
        return <div style={getSpriteCss(SPRITE_CONFIG.SPRITE_POSITIONS.WALL["BLACK"])} />;
      case ELEMENTS.FLOOR:
        return baseCell;
      case ELEMENTS.BOX:
        return renderBox(false, baseCell);
      case ELEMENTS.TARGET:
        return renderEndpoint(baseCell);
      case ELEMENTS.PLAYER:
        return renderPlayer(false, baseCell);
      case ELEMENTS.PLAYER_ON_TARGET:
        return renderPlayer(true, baseCell);
      case ELEMENTS.BOX_ON_TARGET:
        return renderBox(true, renderEndpoint(baseCell));
      default:
        return baseCell;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (gameState.isWon) return;
      const key = event.key.toLowerCase();
      const keyMap = {
        'arrowup': 'UP',
        'arrowdown': 'DOWN',
        'arrowleft': 'LEFT',
        'arrowright': 'RIGHT',
        'w': 'UP',
        's': 'DOWN',
        'a': 'LEFT',
        'd': 'RIGHT',
      };
  
      if (keyMap[key]) {
        event.preventDefault();
        gameInstance.startNewMoveGroup();
        movePlayer(keyMap[key]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState.isWon, movePlayer]);

  useEffect(() => {
    const updateCellSize = () => {
      if (!gameState.map.length) return;

      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      // Get the width and height of the map
      const mapWidth = gameState.map[0]?.length || 1;
      const mapHeight = gameState.map.length || 1;

      // Calculate the available game area size (considering the layout)
      const maxGameWidth =
        containerWidth >= 1024
          ? containerWidth * 0.6
          : containerWidth - 32; // Leave space on small screens
      const maxGameHeight = containerHeight - 200; // Leave space for top and bottom

      // Calculate the appropriate cell size based on the map's width and height ratio
      const widthBasedSize = Math.floor(maxGameWidth / mapWidth);
      const heightBasedSize = Math.floor(maxGameHeight / mapHeight);

      // Choose the smaller size to ensure full screen fit
      const newCellSize = Math.min(widthBasedSize, heightBasedSize);

      const boundedCellSize = Math.min(
        newCellSize,
        SPRITE_CONFIG.SPRITE_SIZE // Maximum not exceeding the original size
      );

      setCellSize(boundedCellSize);
    };

    updateCellSize();
    window.addEventListener("resize", updateCellSize);
    return () => window.removeEventListener("resize", updateCellSize);
  }, [gameState.map]);

  useEffect(() => {
    if (gameState.isWon) {
      saveProgress(currentLevel, gameState.moves);
      trackEvent(CATEGORIES.Sokoban, EVENTS.Sokoban.Success, {
        level: currentLevel + 1,
        moves: gameState.moves,
      });

      setModalMessage(
        t("sokoban_succmsg", {
          moves: gameState.moves,
        })
      );
      setShowModal(true);
    }
  }, [gameState.isWon]);

  const saveProgress = (levelIndex, moves) => {
    let mapHash;
    
    if (customLevelInfo) {
      mapHash = customLevelInfo.id;
    } else {
      if (levelIndex === null || !levels[levelIndex]) return;
      mapHash = calculateMapId(levels[levelIndex]);
    }

    const newCompletedLevels = {
      ...completedLevels,
      [mapHash]: {
        completedAt: new Date().toISOString(),
        moves: moves
      }
    };
    setCompletedLevels(newCompletedLevels);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCompletedLevels));
  };

  const canUndo = useCallback(() => {
    return gameInstance && gameInstance.history.length > 1;
  }, [gameInstance]);

  const handleUndo = () => {
    if (!gameInstance || !canUndo()) return;
    const newMap = gameInstance.undo();
    if (newMap) {
      setGameState(gameInstance.getState());
    }
  };

  const handleSizeChange = (dimension, value) => {
    const newSize = Math.max(3, Math.min(20, parseInt(value) || 3));
    const newConfig = {
      ...editConfig,
      [dimension]: newSize
    };
    setEditConfig(newConfig);

    if (dimension === 'width') {
      const newMap = customMap.map(row => {
        const newRow = [...row];
        while (newRow.length < newSize) {
          newRow.push(ELEMENTS.EMPTY);
        }
        return newRow.slice(0, newSize);
      });
      setCustomMap(newMap);
    } else {
      const newMap = [...customMap];
      while (newMap.length < newSize) {
        newMap.push(Array(newConfig.width).fill(ELEMENTS.EMPTY));
      }
      const finalMap = newMap.slice(0, newSize);
      setCustomMap(finalMap);
    }
  };

  const LevelSelector = () => {
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold">{t("select_level")}</h2>
          <Link 
            href={`/${lang}/games/sokoban/more`}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            {t("all_levels")}
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="h-[200px] overflow-y-auto pr-2">
          <div className="pl-1 pt-1 grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] gap-[2px]">
            {levels.map((level, index) => {
              const mapHash = calculateMapId(level);
              const isCompleted = completedLevels[mapHash];
              const isCurrentLevel = currentLevel === index;

              return (
                <button
                  key={index}
                  onClick={() => handleLevelChange(index)}
                  className={`
                    aspect-square text-center text-sm transition-all
                    ${isCurrentLevel ? 'ring-1 ring-blue-500' : ''}
                    ${isCompleted
                      ? 'bg-green-100 hover:bg-green-200 text-green-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                  `}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const CurrentLevelInfo = () => {
    let mapId;
    let isCustom = false;

    if (customLevelInfo) {
      mapId = customLevelInfo.id;
      isCustom = true;
    } else if (currentLevel === null) {
      return null;
    } else if (!levels[currentLevel]) {
      return null;
    } else {
      mapId = calculateMapId(levels[currentLevel]);
    }

    const levelInfo = completedLevels[mapId];
    
    return (
      <div className="mb-4">
        <h2 className="fond-bold mb-2">
          {!isCustom && `${t("level")}: ${currentLevel + 1}`}
        </h2>
        {levelInfo && (
          <div className="text-sm text-green-600">
            <div>
              {t("best_record")}: {levelInfo.moves} {t("steps")}
            </div>
            <div>
              {t("completed_at")}: {new Date(levelInfo.completedAt).toLocaleDateString()}
            </div>
          </div>
        )}
        <div className="mt-1">
          <h2 className="fond-bold mb-2"></h2>
          {t("current_steps")}: {gameState.moves}
        </div>
      </div>
    );
  };

  const shouldPlaceAdBelowSettings = gameState.map.length >= 9;

  return (
    <div className="flex flex-col lg:flex-row w-full gap-4 p-4">
      <div className="w-full lg:w-4/5 flex flex-col items-center gap-4">
        {isEditMode ? (
          <div className="overflow-x-auto max-w-full p-2">
            <div className="grid">
              {customMap?.map((row, y) => (
                <div key={y} className="flex">
                  {row.map((cell, x) => (
                    <div
                      key={`${x}-${y}`}
                      onClick={() => handleCellClick(x, y)}
                      className="border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        position: "relative",
                      }}
                    >
                      {cell !== ELEMENTS.EMPTY && renderCell(cell, x, y)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {cellSize && (
              <div className="overflow-x-auto max-w-full p-2">
                <div className="grid">
                  {gameState.map.map((row, y) => (
                    <div key={y} className="flex" style={{ display: "flex" }}>
                      {row.map((cell, x) => (
                        <div
                          key={`${x}-${y}`}
                          style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            position: "relative",
                          }}
                        >
                          {renderCell(cell, x, y)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-2 mt-4 lg:hidden">
              <button 
                className="p-2 bg-gray-200 rounded hover:bg-gray-300" 
                onClick={() => {
                  gameInstance.startNewMoveGroup();
                  movePlayer("UP");
                }}
              >
                <ArrowUp />
              </button>
              <div className="flex gap-2">
                <button 
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300" 
                  onClick={() => {
                    gameInstance.startNewMoveGroup();
                    movePlayer("LEFT");
                  }}
                >
                  <ArrowLeft />
                </button>
                <button 
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300" 
                  onClick={() => {
                    gameInstance.startNewMoveGroup();
                    movePlayer("DOWN");
                  }}
                >
                  <ArrowDown />
                </button>
                <button 
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300" 
                  onClick={() => {
                    gameInstance.startNewMoveGroup();
                    movePlayer("RIGHT");
                  }}
                >
                  <ArrowRight />
                </button>
              </div>
            </div>
          </>
        )}

        {!shouldPlaceAdBelowSettings && ( 
          <div className="hidden md:block w-full bg-gray-100">
            <SideAdComponent format="horizontal" className="absolute inset-0" />
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-1/5 flex flex-col gap-4">
        {!isEditMode && <CurrentLevelInfo />}
        {!isEditMode && <LevelSelector />}

        {/* Base Controls */}
        <div className="flex flex-col gap-2">
          {!isEditMode && <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => {
              trackEvent(CATEGORIES.Sokoban, EVENTS.Sokoban.Restart, {
                level: currentLevel + 1,
                moves: gameState.moves
              });
              resetGame();
            }}
          >
            <RotateCcw size={16} />
            {t("restart_game")}
          </button>
          }

          {!isEditMode &&
            <button
              className={`
              w-full flex items-center justify-center gap-2 px-4 py-2 rounded
              ${canUndo()
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
            `}
              onClick={() => {
                if (canUndo()) {
                  trackEvent(CATEGORIES.Sokoban, EVENTS.Sokoban.Undo, {
                    level: currentLevel + 1,
                    moves: gameState.moves
                  });
                  handleUndo();
                }
              }}
              disabled={!canUndo()}
            >
              <ArrowLeft size={16} />
              {t("undo")}
            </button>
          }

          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            onClick={() => {
              if (!isEditMode) {
                trackEvent(CATEGORIES.Sokoban, EVENTS.Sokoban.EnterEditMode);
                if (gameState.map.length > 0) {
                  setEditConfig(prev => ({
                    ...prev,
                    width: gameState.map[0].length,
                    height: gameState.map.length
                  }));
                  setCustomMap(gameState.map);
                } else {
                  initializeEditMap();
                }
              } else {
                trackEvent(CATEGORIES.Sokoban, EVENTS.Sokoban.ExitEditMode);
              }
              setIsEditMode(!isEditMode);
            }}
          >
            <Pencil size={16} />
            {isEditMode ? t("exit_edit_mode") : t("create_level")}
          </button>
          {isEditMode && (
            <>
              <button
                onClick={saveCustomMap}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <Save size={16} />
                {t("save_map")}
              </button>
              <button
                onClick={() => {
                  const newMap = Array(editConfig.height).fill()
                    .map(() => Array(editConfig.width).fill(ELEMENTS.EMPTY));
                  setCustomMap(newMap);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <Trash2 size={16} />
                {t("clear_map")}
              </button>
            </>
          )}
          {isEditMode && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="w-16">{t("width")}:</label>
                  <input
                    type="number"
                    min="3"
                    max="50"
                    value={editConfig.width}
                    onChange={(e) => handleSizeChange('width', e.target.value)}
                    className="flex-grow p-2 border rounded text-center"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-16">{t("height")}:</label>
                  <input
                    type="number"
                    min="3"
                    max="50"
                    value={editConfig.height}
                    onChange={(e) => handleSizeChange('height', e.target.value)}
                    className="flex-grow p-2 border rounded text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {customMap && (
                  <>
                    {elementTypes.map(({ type, name }) => (
                      <button
                        key={type}
                        onClick={() => setEditConfig(prev => ({ ...prev, selectedElement: type }))}
                        className={`
                          px-3 py-2 rounded transition-colors flex flex-col items-center gap-2
                          ${editConfig.selectedElement === type
                            ? 'bg-blue-50 ring-2 ring-blue-500'
                            : 'hover:bg-gray-50'}
                        `}
                      >
                        <div className="relative" style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                          transform: 'scale(0.8)',
                          transformOrigin: 'center'
                        }}>
                          {renderCell(type)}
                        </div>
                        <span className="text-sm text-gray-600">{t(name.toLowerCase())}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>

            </div>
          )}
        </div>

        {shouldPlaceAdBelowSettings && (
          <div className="hidden md:block w-full bg-gray-100">
            <SideAdComponent/>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        {modalMessage}
      </Modal>
    </div>
  );
};

export default SokobanGame;
