import React, { useState, useEffect, useCallback } from "react";
import { Flag, X } from "lucide-react";
import { useTranslation } from 'react-i18next';

const AStarPathFind = () => {
  const { t } = useTranslation();
  const GRID_MODES = [
    {
      id: "obstacle",
      name: t('set_obstacles'), 
      color: "bg-gray-500 hover:bg-gray-700",
    },
    { 
      id: "start", 
      name: t('set_start_point'), 
      color: "bg-blue-500 hover:bg-blue-700" 
    },
    { 
      id: "end", 
      name: t('set_end_point'), 
      color: "bg-red-500 hover:bg-red-700" 
    },
  ];

  const [gridSize, setGridSize] = useState({ width: 10, height: 10 });
  const [grid, setGrid] = useState([]);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [path, setPath] = useState([]);
  const [mode, setMode] = useState(GRID_MODES[0]);
  const [searchSpeed, setSearchSpeed] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true); // 控制面板展开和收起
  const [openSet, setOpenSet] = useState([]);
  const [closedSet, setClosedSet] = useState([]);

  const initializeGrid = useCallback(() => {
    const newGrid = Array(gridSize.height).fill().map((_, y) =>
      Array(gridSize.width).fill().map((_, x) => ({
        x,
        y,
        f: 0,
        g: 0,
        h: 0,
        obstacle: false,
        parent: null
      }))
    );
    setGrid(newGrid);
    setStart(null);
    setEnd(null);
    setPath([]);
    setOpenSet([]);
    setClosedSet([]);
  }, [gridSize]);

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  const handleCellClick = (x, y) => {
    if (isSearching) return;
    const newGrid = [...grid];
    if (mode.id === "obstacle") {
      newGrid[y][x].obstacle = !newGrid[y][x].obstacle;
      setGrid(newGrid);
    } else if (mode.id === "start") {
      setStart({ x, y });
    } else if (mode.id === "end") {
      setEnd({ x, y });
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const heuristic = (a, b) => {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };

  const getNeighbors = (node) => {
    const neighbors = [];
    const { x, y } = node;
    if (x > 0) neighbors.push(grid[y][x - 1]);
    if (x < gridSize.width - 1) neighbors.push(grid[y][x + 1]);
    if (y > 0) neighbors.push(grid[y - 1][x]);
    if (y < gridSize.height - 1) neighbors.push(grid[y + 1][x]);
    return neighbors.filter(n => !n.obstacle);
  };

  const reconstructPath = (node) => {
    let current = node;
    const path = [];
    while (current.parent) {
      path.unshift([current.x, current.y]);
      current = current.parent;
    }
    path.unshift([start.x, start.y]);
    return path;
  };

  const astar = async () => {
    if (!start || !end || isSearching) return;
    setIsSearching(true);
    setPath([]);
    setOpenSet([]);
    setClosedSet([]);

    const startNode = grid[start.y][start.x];
    const endNode = grid[end.y][end.x];
    startNode.g = 0;
    startNode.h = heuristic(startNode, endNode);
    startNode.f = startNode.h;

    let openSet = [startNode];
    let closedSet = [];

    while (openSet.length > 0) {
      await sleep(1000 / searchSpeed);

      let current = openSet.reduce((a, b) => a.f < b.f ? a : b);

      if (current === endNode) {
        const finalPath = reconstructPath(current);
        setPath(finalPath);
        setIsSearching(false);
        return;
      }

      openSet = openSet.filter(node => node !== current);
      closedSet.push(current);

      for (let neighbor of getNeighbors(current)) {
        if (closedSet.includes(neighbor)) continue;

        const tentativeG = current.g + 1;

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        } else if (tentativeG >= neighbor.g) {
          continue;
        }

        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = heuristic(neighbor, endNode);
        neighbor.f = neighbor.g + neighbor.h;
      }

      setOpenSet([...openSet]);
      setClosedSet([...closedSet]);
    }

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
    // 如果输入无效或删除了数字，强制回退到最小值5
    else {
      setGridSize((prev) => ({
        ...prev,
        [key]: 5,
      }));
    }
  };

  const handleReset = () => {
    setPath([]);      // 清空已找到的路径
    setOpenSet([]);   // 清空开放集
    setClosedSet([]); // 清空关闭集
    setIsSearching(false); // 停止搜索状态
    initializeGrid(); // 重置网格到初始状态
    setStart(null);   // 清除起点
    setEnd(null);     // 清除终点
  };

  const renderCell = (x, y) => {
    const isStart = start && start.x === x && start.y === y;
    const isEnd = end && end.x === x && end.y === y;
    const isObstacle = grid[y][x].obstacle;
    const isPath = path.some(([px, py]) => px === x && py === y);
    const isOpen = openSet.some(node => node.x === x && node.y === y);
    const isClosed = closedSet.some(node => node.x === x && node.y === y);

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
    } else if (isOpen) {
      cellClass += " bg-yellow-100";
    } else if (isClosed) {
      cellClass += " bg-gray-200";
    }

    return (
      <div
        key={`${x},${y}`}
        className={cellClass}
        onClick={() => handleCellClick(x, y)}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="flex items-start p-4 mx-auto overflow-hidden relative min-h-[450px]">
      <div className="flex-grow flex justify-center overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${gridSize.width}, minmax(40px, 1fr))`,
          }}
        >
          {grid.map((row, y) => row.map((_, x) => renderCell(x, y)))}
        </div>
      </div>

      <div
        className={`absolute right-0 top-0 p-4 bg-gray-200 shadow-lg min-w-[100px] min-h-[450px] ${isPanelOpen ? "" : "hidden"
          }`}
        style={{ maxHeight: "calc(100vh - 8px)", overflowY: "auto" }}
      >
        <div className="w-full mb-4 space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-lg flex-shrink-0 whitespace-nowrap">
              {t('grid_width')}&nbsp;
            </label>
            <input
              type="number"
              min="5"
              value={gridSize.width}
              onChange={(e) => handleSizeChange("width", e.target.value)}
              className="w-full ml-4 p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-lg flex-shrink-0 whitespace-nowrap">
              {t('grid_height')}
            </label>
            <input
              type="number"
              min="5"
              value={gridSize.height}
              onChange={(e) => handleSizeChange("height", e.target.value)}
              className="w-full ml-4 p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center">
            <span className="text-lg mr-4 text-lg flex-shrink-0 whitespace-nowrap">
              {t('search_speed')}
            </span>
            <input
              type="range"
              min="1"
              max="20"
              value={searchSpeed}
              onChange={(e) => setSearchSpeed(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <div className="space-y-4 mb4">
          {GRID_MODES.map((gridMode) => (
            <div key={gridMode.id} className="w-full">
              <button
                key={gridMode.id}
                onClick={() => setMode(gridMode)}
                className={`px-4 py-2 text-white rounded ${gridMode.color} ${mode.id === gridMode.id
                  ? "ring-2 ring-offset-2 ring-blue-500"
                  : ""
                  }`}
                disabled={isSearching}
              >
                {gridMode.name}
              </button>
            </div>
          ))}
          <div className="w-full space-y-4 mb4">
            <div>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                disabled={isSearching}
              >
                {t('reset_grid')}
              </button>
            </div>
          </div>
          <div>
            <button
              onClick={astar}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={isSearching}
            >
              {t('find_path')}
            </button>
          </div>
        </div>
        {/* 折叠/展开按钮, 现在位于设置面板内 */}
        <button
          onClick={() => setIsPanelOpen(false)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-lg"
        >
          ▶
        </button>
      </div>

      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-lg"
        >
          ◀
        </button>
      )}
    </div>
  );
};

export default AStarPathFind;
