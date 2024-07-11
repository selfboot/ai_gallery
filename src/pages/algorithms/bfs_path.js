import React, { useState, useEffect, useCallback } from "react";
import { Flag, X, Frown } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "../../components/layout";
import PageHeader from "../../components/header";

const BFSPathFind = () => {
  const { t } = useTranslation();
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

  const [gridSize, setGridSize] = useState({ width: 10, height: 10 });
  const [grid, setGrid] = useState([]);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [path, setPath] = useState([]);
  const [visited, setVisited] = useState([]);
  const [mode, setMode] = useState(GRID_MODES[0]);
  const [searchSpeed, setSearchSpeed] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true); // 控制面板展开和收起
  const [showNoPathAlert, setShowNoPathAlert] = useState(false); // 新增状态控制弹窗显示

  const initializeGrid = useCallback(() => {
    const newGrid = Array(gridSize.height)
      .fill()
      .map(() => Array(gridSize.width).fill(0));
    setGrid(newGrid);
    setStart(null);
    setEnd(null);
    setPath([]);
    setVisited([]);
  }, [gridSize]);

  useEffect(() => {
    initializeGrid();
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
    if (!start || !end || isSearching) return;
    setIsSearching(true);
    setPath([]);
    setVisited([]);

    const queue = [[start.x, start.y]];
    const visitedSet = new Set();
    const parent = new Map();

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
        return;
      }

      if (visitedSet.has(key)) continue;
      visitedSet.add(key);
      setVisited((prev) => [...prev, [x, y]]);

      await sleep(1000 / searchSpeed);

      const directions = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < gridSize.width && ny >= 0 && ny < gridSize.height && grid[ny][nx] !== 1) {
          const nkey = `${nx},${ny}`;
          if (!visitedSet.has(nkey)) {
            queue.push([nx, ny]);
            parent.set(nkey, key);
          }
        }
      }
    }

    setShowNoPathAlert(true); // 显示弹窗
    setTimeout(() => setShowNoPathAlert(false), 3000); // 3秒后自动关闭弹窗

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

  const renderCell = (x, y) => {
    const isStart = start && start.x === x && start.y === y;
    const isEnd = end && end.x === x && end.y === y;
    const isObstacle = grid[y][x] === 1;
    const isVisited = visited.some(([vx, vy]) => vx === x && vy === y);
    const isPath = path.some(([px, py]) => px === x && py === y);

    let content = null;
    let cellClass = "w-10 h-10 border border-black flex items-center justify-center";

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
      <div key={`${x},${y}`} className={cellClass} onClick={() => handleCellClick(x, y)}>
        {content}
      </div>
    );
  };

  const renderNoPathAlert = () => {
    if (!showNoPathAlert) return null;
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-10">
        <div className="bg-white p-4 rounded-lg flex flex-col items-center z-20">
          <Frown className="text-red-500 text-6xl" />
          <p className="text-xl mt-2">{t("no_path_found")}</p>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <PageHeader />
      <div className="flex items-start p-4 mx-auto overflow-hidden relative min-h-[400px]">
        <div className="flex-grow flex justify-center overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${gridSize.width}, minmax(40px, 1fr))`,
            }}
          >
            {grid.map((row, y) => row.map((_, x) => renderCell(x, y)))}
            {renderNoPathAlert()}
          </div>
        </div>

        <div
          className={`absolute right-0 top-0 p-4 bg-gray-200 shadow-lg min-w-[100px] min-h-[400px] ${
            isPanelOpen ? "" : "hidden"
          }`}
          style={{ maxHeight: "calc(100vh - 8px)", overflowY: "auto" }}
        >
          <div className="w-full mb-4 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-lg flex-shrink-0 whitespace-nowrap">{t("grid_width")}&nbsp;</label>
              <input
                type="number"
                min="5"
                value={gridSize.width}
                onChange={(e) => handleSizeChange("width", e.target.value)}
                className="w-full ml-4 p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-lg flex-shrink-0 whitespace-nowrap">{t("grid_height")}</label>
              <input
                type="number"
                min="5"
                value={gridSize.height}
                onChange={(e) => handleSizeChange("height", e.target.value)}
                className="w-full ml-4 p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center">
              <span className="text-lg mr-4 text-lg flex-shrink-0 whitespace-nowrap">{t("search_speed")}</span>
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
                  className={`px-4 py-2 text-white rounded ${gridMode.color} ${
                    mode.id === gridMode.id ? "ring-2 ring-offset-2 ring-blue-500" : ""
                  }`}
                  disabled={isSearching}
                >
                  {gridMode.name}
                </button>
              </div>
            ))}
            <button
              onClick={findPath}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={isSearching}
            >
              {t("find_path")}
            </button>
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
    </Layout>
  );
};

export default BFSPathFind;
