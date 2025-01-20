"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { buildMaze } from "./lib/main";
import {
  SHAPE_SQUARE,
  SHAPE_TRIANGLE,
  SHAPE_HEXAGON,
  SHAPE_CIRCLE,
  ALGORITHM_BINARY_TREE,
  ALGORITHM_SIDEWINDER,
  ALGORITHM_ALDOUS_BRODER,
  ALGORITHM_WILSON,
  ALGORITHM_HUNT_AND_KILL,
  ALGORITHM_RECURSIVE_BACKTRACK,
  ALGORITHM_KRUSKAL,
  ALGORITHM_SIMPLIFIED_PRIMS,
  ALGORITHM_TRUE_PRIMS,
  ALGORITHM_ELLERS,
  EXITS_HARDEST,
  EXITS_HORIZONTAL,
  EXITS_VERTICAL,
  METADATA_START_CELL,
  METADATA_END_CELL,
  METADATA_PATH,
  METADATA_PLAYER_CURRENT,
  METADATA_PLAYER_VISITED,
  DIRECTION_NORTH,
  DIRECTION_SOUTH,
  DIRECTION_EAST,
  DIRECTION_WEST,
  DIRECTION_NORTH_WEST,
  DIRECTION_NORTH_EAST,
  DIRECTION_SOUTH_WEST,
  DIRECTION_SOUTH_EAST,
  DIRECTION_CLOCKWISE,
  DIRECTION_ANTICLOCKWISE,
  DIRECTION_INWARDS,
  DIRECTION_OUTWARDS,
} from "./lib/constants";
import Modal from "@/app/components/Modal";

import { useI18n } from "@/app/i18n/client";
import { drawingSurfaces } from "./lib/drawingSurfaces";
import usePersistentState from '@/app/components/PersistentState';
import { trackEvent, EVENTS, CATEGORIES } from '@/app/utils/analytics';
import { SideAdComponent } from "@/app/components/AdComponent";

const MazeGame = () => {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const [currentSeed, setCurrentSeed] = useState("");
  const [settings, setSettings] = usePersistentState('maze-settings', {
    shape: SHAPE_SQUARE,
    algorithm: ALGORITHM_RECURSIVE_BACKTRACK,
    width: 10,
    height: 10,
    layers: 7,
    exitConfig: EXITS_HORIZONTAL,
    seed: "",
  }, 31 * 24 * 60 * 60 * 1000);
  const [maze, setMaze] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });
  const [showingSolution, setShowingSolution] = useState(false);
  const [playState, setPlayState] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const [showingDistances, setShowingDistances] = useState(false);
  const [showGenerationProcess, setShowGenerationProcess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setWindowSize({
      width: window.visualViewport?.width || window.innerWidth,
      height: window.visualViewport?.height || window.innerHeight,
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.visualViewport?.width || window.innerWidth,
        height: window.visualViewport?.height || window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    generateMaze();
  }, [windowSize]);

  const generateMaze = useCallback(
    async (isManual = false) => {
      if (canvasRef.current && windowSize.width > 0 && windowSize.height > 0) {
        let numericSeed;
        if (settings.seed) {
          numericSeed = Number(settings.seed);
        } else if (!isManual && currentSeed) {
          numericSeed = Number(currentSeed);
        } else {
          numericSeed = Math.floor(Math.random() * 1e9);
        }
        setCurrentSeed(numericSeed.toString());

        const config = {
          element: canvasRef.current,
          grid: {
            cellShape: settings.shape,
            width: parseInt(settings.width),
            height: parseInt(settings.height),
            layers: parseInt(settings.layers),
          },
          algorithm: settings.algorithm,
          exitConfig: settings.exitConfig || EXITS_HARDEST,
          randomSeed: numericSeed,
          lineWidth: 2,
        };

        try {
          setIsGenerating(true);
          const newMaze = buildMaze(config);
          if (newMaze && newMaze.runAlgorithm) {
            if (showGenerationProcess) {
              await new Promise((resolve) => {
                const interval = setInterval(() => {
                  const done = newMaze.runAlgorithm.oneStep();
                  newMaze.render();
                  if (done) {
                    clearInterval(interval);
                    resolve();
                  }
                }, 50);
              });
            } else {
              newMaze.runAlgorithm.toCompletion();
            }
            newMaze.render();
            setMaze(newMaze);
            setShowingSolution(false);
            setPlayState(null);
            trackEvent(CATEGORIES.Maze, EVENTS.Maze.Generated, {
              shape: settings.shape,
              algorithm: settings.algorithm,
              seed: currentSeed,
            });
          }
        } catch (error) {
          console.error("Error generating maze:", error);
        } finally {
          setIsGenerating(false);
        }
      }
    },
    [windowSize, settings, canvasRef, currentSeed, showGenerationProcess]
  );

  const findStartAndEndCells = useCallback((maze) => {
    let startCell, endCell;
    
    maze.forEachCell((cell) => {
      if (cell.metadata?.[METADATA_START_CELL]) {
        startCell = cell;
      }
      if (cell.metadata?.[METADATA_END_CELL]) {
        endCell = cell;
      }
    });

    return [startCell, endCell];
  }, []);

  const solveMaze = () => {
    if (maze) {
      try {
        const [startCell, endCell] = findStartAndEndCells(maze);

        if (!(startCell && endCell)) {
          setModalContent(t("maze_no_exits_hint"));
          setModalOpen(true);
          return;
        }

        if (maze.metadata?.[METADATA_PATH]) {
          maze.clearSolution();
          setShowingSolution(false);
        } else {
          console.assert(startCell);
          console.assert(endCell);
          maze.findPathBetween(startCell.coords, endCell.coords);
          setShowingSolution(true);
        }

        maze.render();
      } catch (error) {
        console.error("Error solving maze:", error);
        console.error(error.stack);
      }
    } else {
      console.error("No maze available");
    }
  };

  const startPlaying = () => {
    if (maze) {
      const [startCell, endCell] = findStartAndEndCells(maze);
      if (!(startCell && endCell)) {
        setModalContent(t("maze_no_exits_hint"));
        setModalOpen(true);
        return;
      }

      maze.clearPathAndSolution();
      const newPlayState = {
        startCell,
        endCell,
        currentCell: startCell,
        startTime: Date.now(),
      };

      startCell.metadata[METADATA_PLAYER_CURRENT] = true;
      startCell.metadata[METADATA_PLAYER_VISITED] = true;
      setPlayState(newPlayState);
      maze.render();
    }
  };

  const stopPlaying = () => {
    if (maze) {
      maze.clearMetadata(METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED);
      maze.render();
      setPlayState(null);
    }
  };

  const keyCodeToDirection = {
    38: DIRECTION_NORTH, // Up 
    40: DIRECTION_SOUTH, // Down
    39: DIRECTION_EAST, // Right
    37: DIRECTION_WEST, // Left
    65: DIRECTION_NORTH_WEST, // A
    83: DIRECTION_NORTH_EAST, // S
    90: DIRECTION_SOUTH_WEST, // Z
    88: DIRECTION_SOUTH_EAST, // X
    81: DIRECTION_CLOCKWISE, // Q
    87: DIRECTION_ANTICLOCKWISE, // W
    80: DIRECTION_INWARDS, // P
    76: `${DIRECTION_OUTWARDS}_1`, // L
    186: `${DIRECTION_OUTWARDS}_0`, // ;
  };

  const navigate = (direction, shift, alt) => {
    if (!playState || !direction) return;

    while (true) {
      const currentCell = playState.currentCell;
      const targetCell = currentCell.neighbours[direction];
      const moveOk = targetCell && targetCell.isLinkedTo(currentCell);

      if (moveOk) {
        delete currentCell.metadata[METADATA_PLAYER_CURRENT];
        targetCell.metadata[METADATA_PLAYER_VISITED] = true;
        targetCell.metadata[METADATA_PLAYER_CURRENT] = true;

        setPlayState((prev) => ({
          ...prev,
          previousCell: currentCell,
          currentCell: targetCell,
        }));

        if (targetCell.metadata[METADATA_END_CELL]) {
          onMazeCompleted();
        }

        if (playState.finished) {
          break;
        } else if (!shift) {
          break;
        } else if (alt) {
          const linkedDirections = targetCell.neighbours.linkedDirections();
          if (linkedDirections.length === 2) {
            direction = linkedDirections.find(
              (neighbourDirection) => targetCell.neighbours[neighbourDirection] !== playState.previousCell
            );
          } else {
            break;
          }
        }
      } else {
        break;
      }
    }

    maze.render();
  };

  const onMazeCompleted = () => {
    const timeMs = Date.now() - playState.startTime;
    const time = formatTime(timeMs);
    const { startCell, endCell } = playState;

    setPlayState(null);

    maze.findPathBetween(startCell.coords, endCell.coords);
    const optimalPathLength = maze.metadata[METADATA_PATH].length;
    delete maze.metadata[METADATA_PATH];

    let visitedCells = 0;
    maze.forEachCell((cell) => {
      if (cell.metadata[METADATA_PLAYER_VISITED]) {
        visitedCells++;
      }
    });

    const cellsPerSecond = visitedCells / (timeMs / 1000);
    maze.render();

    setModalContent(t("maze_completion", {
      time,
      visitedCells,
      optimalPathLength,
      optimality: Math.floor((100 * optimalPathLength) / visitedCells),
      cellsPerSecond: Math.round(cellsPerSecond)
    }));
    setModalOpen(true);

    trackEvent(CATEGORIES.Maze, EVENTS.Maze.PathCompleted, {
      time,
      visitedCells,
      optimalPathLength,
    });
  };

  const padNum = (num) => (num < 10 ? `0${num}` : num);

  const formatTime = (millis) => {
    const hours = Math.floor(millis / (1000 * 60 * 60));
    const minutes = Math.floor((millis % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((millis % (1000 * 60)) / 1000);
    return `${padNum(hours)}:${padNum(minutes)}:${padNum(seconds)}`;
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (playState && !playState.finished) {
        if (keyCodeToDirection[event.keyCode]) {
          event.preventDefault();
          const direction = keyCodeToDirection[event.keyCode];
          navigate(direction, event.shiftKey, event.altKey);
          maze.render();
        }
      }
    };

    window.onkeydown = handleKeyDown;
    return () => {
      window.onkeydown = null;
    };
  }, [playState, maze]);

  const handleMouseMove = useCallback((event) => {
    if (!playState || !maze || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const drawingSurface = maze.metadata.drawingSurface;
    const { x, y } = drawingSurface.convertMouseCoords(offsetX, offsetY);

    const cellCoords = maze.coordsFromPixels(x, y);
    if (!cellCoords) return;
    const targetCell = maze.getCellByCoordinates(cellCoords);
    if (targetCell &&
      targetCell !== playState.currentCell &&
      Object.values(playState.currentCell.neighbours).includes(targetCell) &&
      playState.currentCell.isLinkedTo(targetCell)) {

      const direction = Object.entries(playState.currentCell.neighbours)
        .find(([dir, cell]) => cell === targetCell)?.[0];

      if (direction) {
        maze.forEachCell(cell => {
          delete cell.metadata[METADATA_PLAYER_CURRENT];
        });
        navigate(direction, false, false);
        maze.render();
      }
    }
  }, [playState, maze, navigate]);

  useEffect(() => {
    if (playState && maze) {
      const svgElement = canvasRef.current;
      svgElement.addEventListener('mousemove', handleMouseMove);
      return () => {
        svgElement.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [playState, maze, handleMouseMove]);

  const calculateCanvasSize = useCallback(() => {
    const viewportWidth = windowSize.width;
    const viewportHeight = windowSize.height;

    // In wide screens (e.g., desktop devices)
    if (viewportWidth > 768) {
      // 768px is a common mobile device breakpoint
      // Use 50% of the viewport height as the base
      const size = viewportHeight * 0.8;
      return { width: size, height: size };
    } else {
      // In narrow screens (e.g., mobile devices)
      const size = viewportWidth * 0.9;
      return { width: size, height: size };
    }
  }, [windowSize]);

  const startTimer = useCallback(() => {
    if (playState) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - playState.startTime);
      }, 100);
    }
  }, [playState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (playState) {
      startTimer();
    } else {
      stopTimer();
      setElapsedTime(0);
    }
    return () => stopTimer();
  }, [playState, startTimer, stopTimer]);

  const showDistanceMap = useCallback(() => {
    if (!maze) return;
    
    if (showingDistances) {
      maze.clearDistances();
      setShowingDistances(false);
      maze.render();
    } else {
      const [startCell, endCell] = findStartAndEndCells(maze);
      if (startCell) {
        maze.findDistancesFrom(...startCell.coords);
        setShowingDistances(true);
        maze.render();
      } else {
        setModalContent(t("no_start_cell"));
        setModalOpen(true);
      }
    }
  }, [maze, showingDistances]);

  const downloadMaze = useCallback(() => {
    if (!maze) return;

    function saveSvg(svgEl, name) {
      const svgData = svgEl.outerHTML;
      const prolog = '<?xml version="1.0" standalone="no"?>';
      const blob = new Blob([prolog, svgData], {type: 'image/svg+xml;charset=utf-8'});
      const blobAsUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobAsUrl;
      downloadLink.download = name;
      downloadLink.click();
      URL.revokeObjectURL(blobAsUrl);
    }

    trackEvent(CATEGORIES.Maze, EVENTS.Maze.Downloaded, {
      shape: settings.shape,
      width: settings.width,
      seed: currentSeed,
    });

    const SVG_SIZE = 500;
    const elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    elSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    elSvg.setAttribute('width', SVG_SIZE);
    elSvg.setAttribute('height', SVG_SIZE);

    const svgDrawingSurface = drawingSurfaces.svg({el: elSvg});
    const fileName = `maze_${settings.shape}_${settings.width}_${settings.height}_${currentSeed}.svg`;
    
    maze.render(svgDrawingSurface);
    saveSvg(elSvg, fileName);
  }, [maze, settings, currentSeed]);

  return (
    <div className="container mx-auto">
      <div className="lg:flex gap-4">
        <div className="lg:w-4/5 mb-4 lg:mb-0 lg:mr-8">
          <div
            className="aspect-square relative mx-auto"
            style={{
              width: calculateCanvasSize().width,
              height: calculateCanvasSize().height,
            }}
          >
            <svg
              ref={canvasRef}
              className="w-full h-full absolute inset-0"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                margin: "auto",
                display: "block",
              }}
              width={calculateCanvasSize().width}
              height={calculateCanvasSize().height}
              viewBox={`0 0 ${calculateCanvasSize().width} ${calculateCanvasSize().height}`}
            />
          </div>
          <div className="mt-2 text-center">
            <div className="flex justify-center items-center gap-4 flex-wrap text-sm text-gray-600">
              {currentSeed && (
                <div>
                  {t("current_seed")}: {currentSeed}
                </div>
              )}
              {playState && (
                <div>
                  {t("elapsed_time")}: {formatTime(elapsedTime)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-1/5">
          <MazeSettings
            settings={settings}
            onSettingsChange={setSettings}
            onGenerate={() => generateMaze(true)}
            onSolve={solveMaze}
            onPlay={startPlaying}
            onStop={stopPlaying}
            onShowDistances={showDistanceMap}
            showingSolution={showingSolution}
            showingDistances={showingDistances}
            isPlaying={!!playState}
            showGenerationProcess={showGenerationProcess}
            setShowGenerationProcess={setShowGenerationProcess}
            isGenerating={isGenerating}
            onDownload={downloadMaze}
            maze={maze}
          />
          <div className="hidden mt-4 md:relative md:block w-full bg-gray-100">
            <SideAdComponent/>
          </div>
        </div>
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        {modalContent}
      </Modal>
    </div>
  );
};

const MazeSettings = ({
  settings,
  onSettingsChange,
  onGenerate,
  onSolve,
  onPlay,
  onStop,
  onShowDistances,
  showingSolution,
  showingDistances,
  isPlaying,
  showGenerationProcess,
  setShowGenerationProcess,
  isGenerating,
  onDownload,
  maze,
}) => {
  const { t } = useI18n();

  const shapes = [
    { value: SHAPE_SQUARE, label: t("shapes_square") },
    { value: SHAPE_TRIANGLE, label: t("shapes_triangle") },
    { value: SHAPE_HEXAGON, label: t("shapes_hexagon") },
    { value: SHAPE_CIRCLE, label: t("shapes_circle") },
  ];

  const algorithms = [
    { value: ALGORITHM_BINARY_TREE, label: t("binaryTree") },
    { value: ALGORITHM_SIDEWINDER, label: t("sidewinder") },
    { value: ALGORITHM_ALDOUS_BRODER, label: t("aldousBroder") },
    { value: ALGORITHM_WILSON, label: t("wilson") },
    { value: ALGORITHM_HUNT_AND_KILL, label: t("huntAndKill") },
    { value: ALGORITHM_RECURSIVE_BACKTRACK, label: t("recursiveBacktrack") },
    { value: ALGORITHM_KRUSKAL, label: t("kruskal") },
    { value: ALGORITHM_SIMPLIFIED_PRIMS, label: t("simplifiedPrims") },
    { value: ALGORITHM_TRUE_PRIMS, label: t("truePrims") },
    { value: ALGORITHM_ELLERS, label: t("ellers") },
  ];

  const exits = [
    { value: EXITS_HARDEST, label: t("exits_hardest") },
    { value: EXITS_HORIZONTAL, label: t("exits_horizontal") },
    { value: EXITS_VERTICAL, label: t("exits_vertical") },
  ];

  const handleChange = (key, value) => {
    onSettingsChange((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (key === 'algorithm') {
      trackEvent(CATEGORIES.Maze, EVENTS.Maze.AlgorithmChanged, {
        algorithm: value
      });
    }
    else if (key === 'shape') {
      trackEvent(CATEGORIES.Maze, EVENTS.Maze.ShapeChanged, {
        shape: value
      });
    }
  };

  const handleSeedChange = (value) => {
    if (value === "" || /^\d+$/.test(value)) {
      handleChange("seed", value);
      if (value) {
        trackEvent(CATEGORIES.Maze, EVENTS.Maze.SeedEntered, {
          seed: value
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center">
          <label className="w-24 text-sm font-medium text-gray-700">{t("maze_shape")}:</label>
          <select
            value={settings.shape}
            onChange={(e) => handleChange("shape", e.target.value)}
            className="flex-1 border rounded-md p-2"
          >
            {shapes.map((shape) => (
              <option key={shape.value} value={shape.value}>
                {shape.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <label className="w-24 text-sm font-medium text-gray-700">{t("maze_algorithm")}:</label>
          <select
            value={settings.algorithm}
            onChange={(e) => handleChange("algorithm", e.target.value)}
            className="flex-1 border rounded-md p-2"
          >
            {algorithms.map((algo) => (
              <option key={algo.value} value={algo.value}>
                {algo.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <label className="w-24 text-sm font-medium text-gray-700">{t("maze_exit_config")}:</label>
          <select
            value={settings.exitConfig}
            onChange={(e) => handleChange("exitConfig", e.target.value)}
            className="flex-1 border rounded-md p-2"
          >
            {exits.map((exit) => (
              <option key={exit.value} value={exit.value}>
                {exit.label}
              </option>
            ))}
          </select>
        </div>

        {settings.shape !== SHAPE_CIRCLE ? (
          <>
            <div className="flex items-center">
              <label className="w-24 text-sm font-medium text-gray-700">{t("width")}:</label>
              <input
                type="number"
                value={settings.width}
                onChange={(e) => handleChange("width", parseInt(e.target.value))}
                className="flex-1 border rounded-md p-2"
                min="5"
                max="50"
              />
            </div>

            <div className="flex items-center">
              <label className="w-24 text-sm font-medium text-gray-700">{t("height")}:</label>
              <input
                type="number"
                value={settings.height}
                onChange={(e) => handleChange("height", parseInt(e.target.value))}
                className="flex-1 border rounded-md p-2"
                min="5"
                max="50"
              />
            </div>
          </>
        ) : (
          <div className="flex items-center">
            <label className="w-24 text-sm font-medium text-gray-700">{t("layers")}:</label>
            <input
              type="number"
              value={settings.layers}
              onChange={(e) => handleChange("layers", parseInt(e.target.value))}
              className="flex-1 border rounded-md p-2"
              min="2"
              max="10"
            />
          </div>
        )}

        <div className="flex items-center">
          <label className="w-24 text-sm font-medium text-gray-700">{t("seed")}:</label>
          <input
            type="text"
            value={settings.seed}
            onChange={(e) => handleSeedChange(e.target.value)}
            className="flex-1 border rounded-md p-2"
            placeholder={t("input_seed_hint")}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showGenerationProcess"
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          checked={showGenerationProcess}
          onChange={(e) => {
            setShowGenerationProcess(e.target.checked);
            trackEvent(CATEGORIES.Maze, EVENTS.Maze.ShowGenerationProcess, {
              enabled: e.target.checked
            });
          }}
          disabled={isGenerating}
        />
        <label
          htmlFor="showGenerationProcess"
          className="text-sm font-medium text-gray-700 cursor-pointer select-none"
        >
          {t("show_generation_process")}
        </label>
      </div>

      <div className="space-y-2">
        <button
          onClick={onGenerate}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          disabled={isGenerating}
        >
          {isGenerating ? t("generating_maze") : t("generate_maze")}
        </button>

        <button
          onClick={onSolve}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {showingSolution ? t("hide_path") : t("show_path")}
        </button>

        <button
          onClick={onShowDistances}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          disabled={isPlaying}
        >
          {showingDistances ? t("hide_distances") : t("show_distances")}
        </button>

        <button
          onClick={() => {
            if (isPlaying) {
              onStop();
              trackEvent(CATEGORIES.Maze, EVENTS.Maze.GameStopped);
            } else {
              onPlay();
              trackEvent(CATEGORIES.Maze, EVENTS.Maze.GameStarted);
            }
          }}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isPlaying ? t("stop_game") : t("start_game")}
        </button>

        <button
          onClick={onDownload}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          disabled={!maze || isGenerating}
        >
          {t("download_maze")}
        </button>
      </div>
    </div>
  );
};

export default MazeGame;
