"use client";

import { useState, useEffect, useRef } from "react";
import { buildMaze } from "./core/main";
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
} from "./core/constants";

const MIN_CELL_SIZE = 1; // 最小格子尺寸（像素）
const MAX_CELL_SIZE = 40; // 最大格子尺寸（像素）

// 计算初始画布大小的函数
const calculateInitialCanvasSize = (settings) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  // 考虑页面其他元素的空间，留出更多余量
  const maxSize = Math.min(viewportWidth * 0.8, viewportHeight * 0.5);

  return { width: maxSize, height: maxSize };
};

const COLORS = {
  WALL: "#2563eb", // 蓝色墙壁
  START: "#22c55e", // 绿色起点
  END: "#ef4444", // 红色终点
  PATH: "#f59e0b", // 橙色路径
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
  const [canvasSize, setCanvasSize] = useState(calculateInitialCanvasSize(settings));
  const [seedError, setSeedError] = useState("");
  const [showingSolution, setShowingSolution] = useState(false);

  const updateCanvasSize = () => {
    if (canvasRef.current) {
      const newSize = calculateInitialCanvasSize(settings);
      canvasRef.current.setAttribute("width", newSize.width);
      canvasRef.current.setAttribute("height", newSize.height);
      canvasRef.current.setAttribute("viewBox", `0 0 ${newSize.width} ${newSize.height}`);
      setCanvasSize(newSize);
    }
  };

  const generateMaze = () => {
    console.log("Generating maze with settings:", settings);
    if (canvasRef.current) {
      // Clear existing SVG content
      while (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }

      let numericSeed;
      if (settings.seed) {
        if (!/^\d+$/.test(settings.seed)) {
          setSeedError("种子必须是数字");
          return;
        }
        numericSeed = parseInt(settings.seed);
      } else {
        numericSeed = Math.floor(Math.random() * 1000000000);
      }

      setSeedError("");
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
        exitConfig: settings.exitConfig,
        randomSeed: numericSeed,
        lineWidth: 2,
      };

      try {
        const newMaze = buildMaze(config);
        if (newMaze && newMaze.runAlgorithm) {
          console.log("Running maze algorithm...");
          newMaze.runAlgorithm.toCompletion();
          newMaze.render();
        }
        setMaze(newMaze);
      } catch (error) {
        console.error(error.stack);
      }
    }
  };

  // 查找起点和终点的函数
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

  // 解决迷宫的函数
  const solveMaze = () => {
    if (maze) {
      try {
        // 获取起点和终点
        const [startCell, endCell] = findStartAndEndCells(maze);
        if (!(startCell && endCell)) {
          console.error('No start/end cells found');
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
      console.error('No maze available');
    }
  };

  // 组件挂载时更新画布尺寸并生成迷宫
  useEffect(() => {
    const initializeMaze = () => {
      updateCanvasSize();
      generateMaze();
    };

    initializeMaze();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

  // 当画布尺寸改变时重新生成迷宫
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      generateMaze();
    }
  }, [canvasSize]);

  return (
    <div className="container mx-auto">
      <div className="lg:flex gap-4">
        {/* 迷宫区域 */}
        <div className="lg:w-4/5 mb-4 lg:mb-0 lg:mr-8">
          <div className="w-full aspect-square relative">
            <svg
              ref={canvasRef}
              className="w-full h-full absolute inset-0"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                display: "block",
              }}
              width={canvasSize.width}
              height={canvasSize.height}
              viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            />
          </div>
          {currentSeed && <div className="mt-2 text-sm text-gray-600">当前种子: {currentSeed}</div>}
        </div>

        {/* 设置区域 */}
        <div className="lg:w-1/5">
          <MazeSettings
            settings={settings}
            onSettingsChange={setSettings}
            onGenerate={generateMaze}
            onSolve={solveMaze}
            showingSolution={showingSolution}
            seedError={seedError}
          />
        </div>
      </div>
    </div>
  );
};

const MazeSettings = ({ settings, onSettingsChange, onGenerate, onSolve, showingSolution, seedError }) => {
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
          className={`w-full border rounded-md p-2 ${seedError ? "border-red-500" : ""}`}
          placeholder="留空使用随机种子"
        />
        {seedError && <p className="mt-1 text-sm text-red-500">{seedError}</p>}
      </div>

      <div>
        <button
          onClick={onGenerate}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors mb-2"
        >
          生成迷宫
        </button>

        <button
          onClick={onSolve}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {showingSolution ? '隐藏路径' : '显示路径'}
        </button>
      </div>
    </div>
  );
};

export default MazeGame;
