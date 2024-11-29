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
  EXITS_NONE,
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

// Calculate the initial canvas size
const calculateInitialCanvasSize = () => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

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
};

const MazeGame = ({ lang }) => {
  const canvasRef = useRef(null);
  const [currentSeed, setCurrentSeed] = useState("");
  const [settings, setSettings] = useState({
    shape: SHAPE_SQUARE,
    algorithm: ALGORITHM_RECURSIVE_BACKTRACK,
    width: 20,
    height: 20,
    layers: 5,
    exitConfig: EXITS_HARDEST,
    seed: "",
  });
  const [maze, setMaze] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.visualViewport?.width || window.innerWidth,
    height: window.visualViewport?.height || window.innerHeight,
  });
  const [showingSolution, setShowingSolution] = useState(false);
  const [playState, setPlayState] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");

  // 监听窗口大小变化
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

  // 当窗口大小变化时重新生成迷宫
  useEffect(() => {
    generateMaze();
  }, [windowSize]); // 依赖于 windowSize

  const generateMaze = useCallback(
    (isManual = false) => {
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
          const newMaze = buildMaze(config);
          if (newMaze && newMaze.runAlgorithm) {
            newMaze.runAlgorithm.toCompletion();
            newMaze.render();
            setMaze(newMaze);
            setShowingSolution(false);
            setPlayState(null);
          }
        } catch (error) {
          console.error("Error generating maze:", error);
        }
      }
    },
    [windowSize, settings, canvasRef, currentSeed]
  );

  const findStartAndEndCells = (maze) => {
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
  };

  const solveMaze = () => {
    if (maze) {
      try {
        const [startCell, endCell] = findStartAndEndCells(maze);

        if (!(startCell && endCell)) {
          setModalContent("你必须先生成一个带有出入口的迷宫");
          setModalOpen(true);
          return;
        }

        // 如果已经有路径，清除它
        if (maze.metadata?.[METADATA_PATH]) {
          maze.clearPathAndSolution();
          setShowingSolution(false);
        } else {
          // 确保起点和终点存在
          console.assert(startCell);
          console.assert(endCell);
          // 查找路径
          maze.findPathBetween(startCell.coords, endCell.coords);
          setShowingSolution(true);
        }

        // 重新渲染迷宫
        maze.render();
      } catch (error) {
        console.error("Error solving maze:", error);
        console.error(error.stack);
      }
    } else {
      console.error("No maze available");
    }
  };

  // 开始游戏
  const startPlaying = () => {
    if (maze) {
      const [startCell, endCell] = findStartAndEndCells(maze);
      if (!(startCell && endCell)) {
        setModalContent("你必须先生成一个带有出入口的迷宫");
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

  // 停止游戏
  const stopPlaying = () => {
    if (maze) {
      maze.clearMetadata(METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED);
      maze.render();
      setPlayState(null);
    }
  };

  // 键盘按键到方向的映射
  const keyCodeToDirection = {
    38: DIRECTION_NORTH, // 上箭头
    40: DIRECTION_SOUTH, // 下箭头
    39: DIRECTION_EAST, // 右箭头
    37: DIRECTION_WEST, // 左箭头
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

  // 导航函数
  const navigate = (direction, shift, alt) => {
    if (!playState || !direction) return;

    while (true) {
      const currentCell = playState.currentCell;
      const targetCell = currentCell.neighbours[direction];
      const moveOk = targetCell && targetCell.isLinkedTo(currentCell);

      if (moveOk) {
        // 清除当前位置标记
        delete currentCell.metadata[METADATA_PLAYER_CURRENT];
        // 标记新位置
        targetCell.metadata[METADATA_PLAYER_VISITED] = true;
        targetCell.metadata[METADATA_PLAYER_CURRENT] = true;

        // 更新游戏状态
        setPlayState((prev) => ({
          ...prev,
          previousCell: currentCell,
          currentCell: targetCell,
        }));

        // 检查是否到达终点
        if (targetCell.metadata[METADATA_END_CELL]) {
          onMazeCompleted();
        }

        // 处理连续移动
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

    // 重新渲染迷宫
    maze.render();
  };

  // 完成迷宫时的处理函数
  const onMazeCompleted = () => {
    const timeMs = Date.now() - playState.startTime;
    const time = formatTime(timeMs);
    const { startCell, endCell } = playState;

    // 重置游戏状态
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

    setModalContent(`
      完成时间: ${time}
      访问格子数: ${visitedCells}
      最优路径长度: ${optimalPathLength}
      最优率: ${Math.floor((100 * optimalPathLength) / visitedCells)}%
      每秒移动格子数: ${Math.round(cellsPerSecond)}
    `);
    setModalOpen(true);
  };

  const padNum = (num) => (num < 10 ? `0${num}` : num);

  const formatTime = (millis) => {
    const hours = Math.floor(millis / (1000 * 60 * 60));
    const minutes = Math.floor((millis % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((millis % (1000 * 60)) / 1000);
    return `${padNum(hours)}:${padNum(minutes)}:${padNum(seconds)}`;
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (playState && !playState.finished) {
        const direction = keyCodeToDirection[event.keyCode];
        navigate(direction, event.shiftKey, event.altKey);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [playState, maze]);

  return (
    <div className="container mx-auto">
      <div className="lg:flex gap-4">
        <div className="lg:w-4/5 mb-4 lg:mb-0 lg:mr-8">
          <div
            className="aspect-square relative mx-auto"
            style={{
              width: calculateInitialCanvasSize().width,
              height: calculateInitialCanvasSize().height,
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
              width={calculateInitialCanvasSize().width}
              height={calculateInitialCanvasSize().height}
              viewBox={`0 0 ${calculateInitialCanvasSize().width} ${calculateInitialCanvasSize().height}`}
            />
          </div>
          {currentSeed && <div className="mt-2 text-sm text-gray-600">当前种子: {currentSeed}</div>}
        </div>

        <div className="lg:w-1/5">
          <MazeSettings
            settings={settings}
            onSettingsChange={setSettings}
            onGenerate={() => generateMaze(true)}
            onSolve={solveMaze}
            onPlay={startPlaying}
            onStop={stopPlaying}
            showingSolution={showingSolution}
            isPlaying={!!playState}
          />
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
  showingSolution,
  isPlaying,
}) => {
  const shapes = [
    { value: SHAPE_SQUARE, label: "方形" },
    { value: SHAPE_TRIANGLE, label: "三角形" },
    { value: SHAPE_HEXAGON, label: "六边形" },
    { value: SHAPE_CIRCLE, label: "圆形" },
  ];

  const algorithms = [
    { value: ALGORITHM_BINARY_TREE, label: "二叉树" },
    { value: ALGORITHM_SIDEWINDER, label: "Sidewinder" },
    { value: ALGORITHM_ALDOUS_BRODER, label: "Aldous-Broder" },
    { value: ALGORITHM_WILSON, label: "Wilson" },
    { value: ALGORITHM_HUNT_AND_KILL, label: "Hunt and Kill" },
    { value: ALGORITHM_RECURSIVE_BACKTRACK, label: "递归回溯" },
    { value: ALGORITHM_KRUSKAL, label: "Kruskal" },
    { value: ALGORITHM_SIMPLIFIED_PRIMS, label: "简化Prim" },
    { value: ALGORITHM_TRUE_PRIMS, label: "True Prim" },
    { value: ALGORITHM_ELLERS, label: "Eller" },
  ];

  const exits = [
    { value: EXITS_NONE, label: "无出口" },
    { value: EXITS_HARDEST, label: "最难路径" },
    { value: EXITS_HORIZONTAL, label: "水平出口" },
    { value: EXITS_VERTICAL, label: "垂直出口" },
  ];

  const handleChange = (key, value) => {
    onSettingsChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSeedChange = (value) => {
    if (value === "" || /^\d+$/.test(value)) {
      handleChange("seed", value);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">形状</label>
        <select
          value={settings.shape}
          onChange={(e) => handleChange("shape", e.target.value)}
          className="w-full border rounded-md p-2"
        >
          {shapes.map((shape) => (
            <option key={shape.value} value={shape.value}>
              {shape.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">算法</label>
        <select
          value={settings.algorithm}
          onChange={(e) => handleChange("algorithm", e.target.value)}
          className="w-full border rounded-md p-2"
        >
          {algorithms.map((algo) => (
            <option key={algo.value} value={algo.value}>
              {algo.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">出口设置</label>
        <select
          value={settings.exitConfig}
          onChange={(e) => handleChange("exitConfig", e.target.value)}
          className="w-full border rounded-md p-2"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">宽度</label>
            <input
              type="number"
              value={settings.width}
              onChange={(e) => handleChange("width", parseInt(e.target.value))}
              className="w-full border rounded-md p-2"
              min="5"
              max="50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">高度</label>
            <input
              type="number"
              value={settings.height}
              onChange={(e) => handleChange("height", parseInt(e.target.value))}
              className="w-full border rounded-md p-2"
              min="5"
              max="50"
            />
          </div>
        </>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">层数</label>
          <input
            type="number"
            value={settings.layers}
            onChange={(e) => handleChange("layers", parseInt(e.target.value))}
            className="w-full border rounded-md p-2"
            min="2"
            max="10"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">随机种子 (仅限数字)</label>
        <input
          type="text"
          value={settings.seed}
          onChange={(e) => handleSeedChange(e.target.value)}
          className="w-full border rounded-md p-2"
          placeholder="留空使用随机种子"
        />
      </div>

      <div className="space-y-2">
        <button
          onClick={onGenerate}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          生成迷宫
        </button>

        <button
          onClick={onSolve}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {showingSolution ? "隐藏路径" : "显示路径"}
        </button>

        <button
          onClick={isPlaying ? onStop : onPlay}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isPlaying ? "停止游戏" : "开始游戏"}
        </button>
      </div>
    </div>
  );
};

export default MazeGame;
