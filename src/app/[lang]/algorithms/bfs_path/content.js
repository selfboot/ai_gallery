"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Flag, X } from "lucide-react";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";

const BFSPathFind = () => {
  const { t } = useI18n();
  const GRID_MODES = [
    {
      id: "obstacle",
      name: t("set_obstacles"),
      color: "bg-gray-500 hover:bg-gray-700",
    },
    {
      id: "start",
      name: t("set_start_point"),
      color: "bg-blue-500 hover:bg-blue-700",
    },
    {
      id: "end",
      name: t("set_end_point"),
      color: "bg-red-500 hover:bg-red-700",
    },
  ];

  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [gridSize, setGridSize] = useState({ width: 10, height: 10 });
  const [grid, setGrid] = useState([]);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [path, setPath] = useState([]);
  const [visited, setVisited] = useState([]);
  const [mode, setMode] = useState(GRID_MODES[0]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSpeed, setSearchSpeed] = useState(5);
  const searchSpeedRef = useRef(5);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const calculateGridSize = () => {
      const cellSize = 40; 
      let totalWidth;
      
      if (screenWidth < 768) { // Assume screen smaller than 768px is a small screen
        totalWidth = screenWidth - 20;
      } else {
        totalWidth = (screenWidth * 0.8) - 300; // Original calculation for large screens
      }
      
      const width = Math.floor(totalWidth / cellSize);
      const height = Math.floor(width * 0.75); // Set height to 3/4 of width
      return { 
        width: Math.max(width, 5), 
        height: Math.max(height, 5) 
      }; 
    };

    setGridSize(calculateGridSize());
  }, [screenWidth]);

  const initializeGrid = useCallback((shouldSetInitialState = true) => {
    const newGrid = Array(gridSize.height)
      .fill()
      .map(() => Array(gridSize.width).fill(0));

    if (shouldSetInitialState) {
      // Set start point to bottom-left corner
      const startX = 0;
      const startY = gridSize.height - 1;
      setStart({ x: startX, y: startY });

      // Set end point to top-right corner
      const endX = gridSize.width - 1;
      const endY = 0;
      setEnd({ x: endX, y: endY });

      // Randomly set 10 obstacles
      let obstaclesSet = 0;
      while (obstaclesSet < 10) {
        const randomX = Math.floor(Math.random() * gridSize.width);
        const randomY = Math.floor(Math.random() * gridSize.height);
        
        // Ensure obstacles are not set on start or end points
        if ((randomX !== startX || randomY !== startY) && 
            (randomX !== endX || randomY !== endY) && 
            newGrid[randomY][randomX] !== 1) {
          newGrid[randomY][randomX] = 1;
          obstaclesSet++;
        }
      }
    } else {
      setStart(null);
      setEnd(null);
    }

    setGrid(newGrid);
    setPath([]);
    setVisited([]);
  }, [gridSize]);

  useEffect(() => {
    initializeGrid(true);
  }, [initializeGrid]);

  const handleCellClick = (x, y) => {
    if (isSearching) return;
    const newGrid = [...grid];
    if (mode.id === "obstacle") {
      newGrid[y][x] = newGrid[y][x] === 1 ? 0 : 1;
      setGrid(newGrid);
    } else if (mode.id === "start") {
      setStart({ x, y });
    } else if (mode.id === "end") {
      setEnd({ x, y });
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const findPath = async () => {
    if (!start || !end) {
      setModalContent(t("set_start_end_points"));
      setShowModal(true);
      return;
    }
    if (isSearching) return;
    setIsSearching(true);
    setPath([]);
    setVisited([]);

    const queue = [[start.x, start.y]];
    const visitedSet = new Set();
    const parent = new Map();

    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]; // 右、下、左、上

    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const key = `${x},${y}`;
      if (x === end.x && y === end.y) {
        const path = [];
        let current = key;
        while (current) {
          const [cx, cy] = current.split(",").map(Number);
          path.unshift([cx, cy]);
          current = parent.get(current);
        }
        setPath(path);
        setIsSearching(false);
        setModalContent(t("path_found"));
        setShowModal(true);
        return;
      }

      if (visitedSet.has(key)) continue;
      visitedSet.add(key);
      setVisited((prev) => [...prev, [x, y]]);

      await sleep(1000 / searchSpeedRef.current);

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const nkey = `${nx},${ny}`;

        if (
          nx >= 0 &&
          nx < gridSize.width &&
          ny >= 0 &&
          ny < gridSize.height &&
          !visitedSet.has(nkey) &&
          grid[ny][nx] !== 1 // 不是障碍物
        ) {
          queue.push([nx, ny]);
          parent.set(nkey, key);
        }
      }
    }

    setModalContent(t("no_path_found"));
    setShowModal(true);
    setIsSearching(false);
  };

  const handleSizeChange = (key, value) => {
    const newSize = parseInt(value, 10);
    if (newSize >= 5) {
      setGridSize((prev) => ({
        ...prev,
        [key]: newSize,
      }));
    }
    else {
      setGridSize((prev) => ({
        ...prev,
        [key]: 5,
      }));
    }
  };

  const handleReset = () => {
    setPath([]);
    setVisited([]);
    setIsSearching(false);
    initializeGrid(false);
    setMode(GRID_MODES[0]);
  };

  const renderCell = (x, y) => {
    const isStart = start && start.x === x && start.y === y;
    const isEnd = end && end.x === x && end.y === y;
    const isObstacle = grid[y][x] === 1;
    const isPath = path.some(([px, py]) => px === x && py === y);
    const isVisited = visited.some(([vx, vy]) => vx === x && vy === y);

    let content = null;
    let cellClass =
      "w-10 h-10 border border-black flex items-center justify-center";

    if (isStart) {
      content = <Flag className="text-green-500" />;
      cellClass += " bg-green-100";
    } else if (isEnd) {
      content = <Flag className="text-red-500" />;
      cellClass += " bg-red-100";
    } else if (isObstacle) {
      content = <X className="text-gray-500" />;
      cellClass += " bg-gray-200";
    } else if (isPath) {
      cellClass += " bg-green-300";
    } else if (isVisited) {
      cellClass += " bg-gray-300";
    }

    return (
      <div
        key={`${x},${y}`}
        className={cellClass}
        onClick={() => handleCellClick(x, y)}
        data-testid={`cell-${x}-${y}`}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row items-start mx-auto overflow-hidden min-h-[450px]">
      <div className="lg:w-4/5 w-full flex justify-center pr-4 lg:pr-12">
        <div className="max-w-full overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${gridSize.width}, minmax(40px, 1fr))`,
            }}
            data-testid="grid"
          >
            {grid.map((row, y) => row.map((_, x) => renderCell(x, y)))}
          </div>
        </div>
      </div>

      <div className="lg:w-1/5 w-full lg:mt-0 mt-8">
        <div className="w-full mb-4 space-y-4">
          <div className="flex flex-col mb-4">
            <div className="flex items-center mb-2">
              <label className="text-lg w-1/3">{t("grid_width")}</label>
              <input
                type="number"
                min="5"
                value={gridSize.width}
                onChange={(e) => handleSizeChange("width", e.target.value)}
                className="w-2/3 p-2 border border-gray-300 rounded"
                data-testid="grid-width-input"
              />
            </div>
            <div className="flex items-center mb-2">
              <label className="text-lg w-1/3">{t("grid_height")}</label>
              <input
                type="number"
                min="5"
                value={gridSize.height}
                onChange={(e) => handleSizeChange("height", e.target.value)}
                className="w-2/3 p-2 border border-gray-300 rounded"
                data-testid="grid-height-input"
              />
            </div>
            <div className="flex items-center">
              <span className="text-lg mr-4 flex-shrink-0 whitespace-nowrap w-1/3">{t("search_speed")}</span>
              <input
                type="range"
                min="1"
                max="200"
                value={searchSpeed}
                onChange={(e) => {
                  const newSpeed = Number(e.target.value);
                  setSearchSpeed(newSpeed);
                  searchSpeedRef.current = newSpeed;
                }}
                className="w-full"
                data-testid="search-speed-slider"
              />
            </div>
          </div>
          <div className="space-y-4">
            <button
              onClick={findPath}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 w-full"
              disabled={isSearching}
              data-testid="find-path-button"
            >
              {t("find_path")}
            </button>
            {GRID_MODES.map((gridMode) => (
              <button
                key={gridMode.id}
                onClick={() => setMode(gridMode)}
                className={`px-4 py-2 text-white rounded w-full ${gridMode.color} ${
                  mode.id === gridMode.id ? "ring-2 ring-offset-2 ring-blue-500" : ""
                }`}
                disabled={isSearching}
              >
                {gridMode.name}
              </button>
            ))}
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 w-full"
              disabled={isSearching}
              data-testid="reset-grid-button"
            >
              {t("reset_grid")}
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        {modalContent}
      </Modal>
    </div>
  );
};

export default BFSPathFind;
