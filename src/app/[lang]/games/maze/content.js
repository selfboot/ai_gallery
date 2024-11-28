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
} from "./core/constants";

const MIN_CELL_SIZE = 1; // 最小格子尺寸（像素）
const MAX_CELL_SIZE = 40; // 最大格子尺寸（像素）

// 计算初始画布大小的函数
const calculateInitialCanvasSize = (settings) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  // 考虑页面其他元素（如导航栏）的空间，留出更多余量
  const maxSize = Math.min(viewportWidth * 0.8, viewportHeight * 0.5);

  // 根据当前设置计算需要的格子数
  const gridWidth = parseInt(settings.width) + 2; // +2 为边距
  const gridHeight = parseInt(settings.height) + 2;

  // 计算理想的格子大小
  let cellSize = Math.min(
    maxSize / gridWidth,
    maxSize / gridHeight
  );

  // 限制格子大小在最小和最大值之间
  cellSize = Math.max(MIN_CELL_SIZE, Math.min(cellSize, MAX_CELL_SIZE));

  // 计算实际画布大小（确保不超过最大尺寸）
  const size = Math.min(
    cellSize * Math.max(gridWidth, gridHeight),
    maxSize
  );

  return { width: size, height: size };
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

  const updateCanvasSize = () => {
    if (canvasRef.current) {
      const newSize = calculateInitialCanvasSize(settings);
      canvasRef.current.width = newSize.width;
      canvasRef.current.height = newSize.height;
      setCanvasSize(newSize);
    }
  };

  const generateMaze = () => {
    console.log("Generating maze with settings:", settings);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

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
        display: {
          cellSize: Math.min(
            canvasSize.width / (parseInt(settings.width) + 2),
            canvasSize.height / (parseInt(settings.height) + 2)
          ),
          lineWidth: 2,
          background: "#ffffff",
          wall: "#000000",
          start: "#00ff00",
          end: "#ff0000",
        },
      };

      try {
        console.log("Using numeric seed:", numericSeed);
        const newMaze = buildMaze(config);
        console.log("Maze object created:", newMaze);

        if (newMaze && newMaze.runAlgorithm) {
          console.log("Running maze algorithm...");
          newMaze.runAlgorithm.toCompletion();

          // 先绘制背景
          ctx.fillStyle = config.display.background;
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          // 设置线条样式
          ctx.strokeStyle = config.display.wall;
          ctx.lineWidth = config.display.lineWidth;

          // 查找并调用渲染方法
          const renderMethod = newMaze.display || newMaze.render || newMaze.draw || newMaze.paint;
          if (renderMethod) {
            console.log("Rendering maze...");
            renderMethod.call(newMaze);
          }
        }

        setMaze(newMaze);
      } catch (error) {
        console.error("Error generating maze:", error);
        console.error(error.stack);
      }
    }
  };

  // 组件挂载时更新画布尺寸并生成迷宫
  useEffect(() => {
    const initializeMaze = () => {
      updateCanvasSize();
      // 给canvas一点时间来初始化
      setTimeout(generateMaze, 100);
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
            <canvas
              ref={canvasRef}
              className="w-full h-full absolute inset-0"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                display: "block",
              }}
              width={canvasSize.width}
              height={canvasSize.height}
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
            seedError={seedError}
          />
        </div>
      </div>
    </div>
  );
};

const MazeSettings = ({ settings, onSettingsChange, onGenerate, seedError }) => {
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
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          生成迷宫
        </button>
      </div>
    </div>
  );
};

export default MazeGame;
