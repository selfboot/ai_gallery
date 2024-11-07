"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useI18n } from "@/app/i18n/client";

const BloomFilterCanvas = React.memo(({
  filterBits,
  searchResult,
  keyPositions,
  cols,
  width,
  height,
  cellSize = 20
}) => {
  const canvasRef = useRef(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isTooltipPinned, setIsTooltipPinned] = useState(false);
  const { t } = useI18n();
  const rows = Math.ceil(filterBits.length / cols);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = width;
    canvas.height = height;

    // Draw all cells
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = i * cols + j;
        if (index >= filterBits.length) break;

        const x = j * cellSize;
        const y = i * cellSize;

        if (searchResult?.positions.includes(index)) {
          ctx.fillStyle = searchResult.exists ? '#F97316' : '#EF4444';
        } else if (filterBits[index]) {
          ctx.fillStyle = '#10B981';
        } else {
          ctx.fillStyle = '#FFFFFF';
        }

        // Fill the cell
        ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

        // Draw the border
        ctx.strokeStyle = '#9CA3AF';
        ctx.strokeRect(x, y, cellSize - 1, cellSize - 1);

        // If it's a position in the search result, add a special mark
        if (searchResult?.positions.includes(index)) {
          ctx.strokeStyle = searchResult.exists ? '#F97316' : '#EF4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cellSize - 3, cellSize - 3);
          ctx.lineWidth = 1;

          // Draw the position number
          ctx.fillStyle = '#000000';
          ctx.font = '14px';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            (searchResult.positions.indexOf(index) + 1).toString(),
            x + cellSize / 2,
            y + cellSize / 2
          );
        }
      }
    }
  }, [filterBits, searchResult, cols, rows, width, height, cellSize]);

  // Calculate the tooltip position
  const calculateTooltipPosition = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const viewportWidth = window.innerWidth;

    // Predefined tooltip size
    const tooltipWidth = 200;
    const tooltipHeight = 200;

    let x = clientX;
    let y = clientY;

    // Handle the right boundary
    if (x + tooltipWidth + 20 > viewportWidth) {
      x = viewportWidth - tooltipWidth - 20;
    }

    // Handle the left boundary
    if (x < 10) {
      x = 10;
    }

    // Handle the top boundary
    if (y - tooltipHeight - 20 < 0) {
      y = y + 20; // Display below the mouse
    } else {
      y = y - 20; // Display above the mouse
    }

    return { x, y };
  }, []);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    const index = row * cols + col;

    if (index !== hoveredCell) {
      if (index < filterBits.length && keyPositions[index]?.size > 0) {
        setHoveredCell(index);
        console.log(index, x, y, hoveredCell);
        setTooltipPos(calculateTooltipPosition(e.clientX, e.clientY));
      } else {
        setHoveredCell(null);
      }
    }
  }, [cols, cellSize, filterBits.length, keyPositions, calculateTooltipPosition, hoveredCell]);

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    const index = row * cols + col;

    if (index < filterBits.length && keyPositions[index]?.size > 0) {
      setHoveredCell(index);
      setTooltipPos(calculateTooltipPosition(e.clientX, e.clientY));
      setIsTooltipPinned(prev => !prev);
    } else {
      setHoveredCell(null);
      setIsTooltipPinned(false);
    }
  }, [cols, cellSize, filterBits.length, keyPositions, calculateTooltipPosition]);

  // Initial rendering and data update redraw
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseMove={!isTooltipPinned ? handleMouseMove : undefined}
        onClick={handleCanvasClick}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          cursor: 'pointer',
        }}
      />
      {(hoveredCell !== null || isTooltipPinned) && keyPositions[hoveredCell]?.size > 0 && (
        <div
          className="fixed z-10 bg-white p-4 rounded-md shadow-lg border border-gray-200"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            minWidth: '200px',
            maxWidth: '300px',
            maxHeight: '300px',
          }}
        >
          <div className="text-sm font-bold mb-2">
            {t("keysAtPosition", { index: hoveredCell })}
          </div>
          <div className="text-xs overflow-y-auto" style={{ maxHeight: '200px' }}>
            {Array.from(keyPositions[hoveredCell]).map((key) => (
              <div
                key={key}
                className="hover:bg-gray-100 rounded select-text"
              >
                {key}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const BloomFilterDemo = () => {
  const [n, setN] = useState(200);
  const [k, setK] = useState(6);
  const [m, setM] = useState(600);
  const [filter, setFilter] = useState(() => new Uint32Array(Math.ceil(600 / 32)));
  const [inputKey, setInputKey] = useState("");
  const [keyList, setKeyList] = useState([]);
  const gridRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [cols, setCols] = useState(0);
  const [searchResult, setSearchResult] = useState(null);
  const [keyPositions, setKeyPositions] = useState({});
  const { t } = useI18n();
  const CELL_SIZE = 20;

  useEffect(() => {
    const updateGridWidth = () => {
      if (gridRef.current) {
        const width = gridRef.current.offsetWidth;
        setGridWidth(width);
      }
    };

    updateGridWidth();
    window.addEventListener("resize", updateGridWidth);
    return () => window.removeEventListener("resize", updateGridWidth);
  }, []);

  useEffect(() => {
    if (gridWidth > 0) {
      setCols(Math.floor(gridWidth / CELL_SIZE) - 1);
    }
  }, [gridWidth]);

  useEffect(() => {
    resetFilter();
  }, [n, k]);

  const resetFilter = useCallback(() => {
    const newM = n * k;
    setM(newM);
    setFilter(new Uint32Array(Math.ceil(newM / 32)));
    setKeyList([]);
    setKeyPositions({});
    setSearchResult(null);
    setInputKey("");
  }, [n, k]);

  const decodeFixed32 = (data, offset) => {
    return (
      (data.charCodeAt(offset) |
        (data.charCodeAt(offset + 1) << 8) |
        (data.charCodeAt(offset + 2) << 16) |
        (data.charCodeAt(offset + 3) << 24)) >>>
      0
    );
  };

  const hash = (data, seed) => {
    const m = 0xc6a4a793;
    const r = 24;
    let h = seed ^ (data.length * m);
    let offset = 0;

    while (offset + 4 <= data.length) {
      let w = decodeFixed32(data, offset);
      offset += 4;
      h += w;
      h = (h * m) >>> 0;
      h ^= h >>> 16;
    }

    switch (data.length - offset) {
      case 3:
        h += data.charCodeAt(offset + 2) << 16;
      case 2:
        h += data.charCodeAt(offset + 1) << 8;
      case 1:
        h += data.charCodeAt(offset);
        h = (h * m) >>> 0;
        h ^= h >>> r;
        break;
    }

    return h >>> 0;
  };

  const addKeyPosition = useCallback((key, positions) => {
    setKeyPositions((prev) => {
      const newPositions = { ...prev };
      positions.forEach((pos) => {
        if (!newPositions[pos]) {
          newPositions[pos] = new Set();
        }
        newPositions[pos].add(key);
      });
      return newPositions;
    });
  }, []);

  const add = useCallback(
    (key, currentFilter) => {
      const newFilter = new Uint32Array(currentFilter);
      const positions = [];
      for (let i = 0; i < k; i++) {
        const h = hash(key, i);
        const bitpos = h % m;
        positions.push(bitpos);
        newFilter[Math.floor(bitpos / 32)] |= 1 << bitpos % 32;
      }
      addKeyPosition(key, positions);
      return newFilter;
    },
    [hash, k, m, addKeyPosition]
  );

  const addSingle = useCallback(
    (key) => {
      if (key.trim() === "") {
        return;
      }
      const newFilter = add(key, filter);
      setFilter(newFilter);
      setKeyList((prevList) => [...prevList, key]);
      setInputKey("");
    },
    [add, filter]
  );

  const addMultipleKeys = useCallback(
    (count) => {
      let newFilter = new Uint32Array(filter);
      const addedKeys = [];
      for (let i = 0; i < count; i++) {
        const key = Math.random().toString(36).substring(2, 8);
        newFilter = add(key, newFilter);
        addedKeys.push(key);
      }
      setFilter(newFilter);
      setKeyList((prevList) => [...prevList, ...addedKeys]);
    },
    [add, filter]
  );

  const check = useCallback(
    (key) => {
      if (key.trim() === "") {
        setSearchResult(null);
        return false;
      }
      const positions = [];
      for (let i = 0; i < k; i++) {
        const h = hash(key, i);
        const bitpos = h % m;
        positions.push(bitpos);
        if ((filter[Math.floor(bitpos / 32)] & (1 << bitpos % 32)) === 0) {
          setSearchResult({ key, exists: false, positions });
          return false;
        }
      }
      setSearchResult({ key, exists: true, positions });
      return true;
    },
    [hash, k, m, filter]
  );

  const filterBits = useMemo(() => {
    const bits = new Array(m);
    for (let i = 0; i < m; i++) {
      bits[i] = (filter[Math.floor(i / 32)] & (1 << i % 32)) !== 0;
    }
    return bits;
  }, [filter, m]);

  return (
    <div className="pt-4 max-w-full mx-auto">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-4/5 lg:pr-4">
          <div ref={gridRef} className="overflow-auto">
            {cols > 0 && (
              <BloomFilterCanvas
                filterBits={filterBits}
                searchResult={searchResult}
                keyPositions={keyPositions}
                cols={cols}
                width={cols * CELL_SIZE}
                height={Math.ceil(m / cols) * CELL_SIZE}
                cellSize={CELL_SIZE}
              />
            )}
          </div>
        </div>
        <div className="lg:w-1/5 mt-4 lg:mt-0">
          <h2 className="text-lg font-bold mb-2">{t("settings")}</h2>
          <div className="mb-4">
            <label className="block mb-2">
              {t("predictedKeyCount")}:
              <input
                type="number"
                value={n}
                onChange={(e) => setN(Math.min(Math.max(1, parseInt(e.target.value) || 1), 5000))}
                min="1"
                max="5000"
                className="w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block mb-2">
              {t("hashFunctionCount")}:
              <input
                type="number"
                value={k}
                onChange={(e) => {
                  const newK = Math.min(Math.max(1, parseInt(e.target.value) || 1), 30);
                  setK(newK);
                }}
                min="1"
                max="30"
                className="w-full border rounded px-2 py-1"
              />
            </label>
          </div>
          <div className="mb-4">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder={t("enterKey")}
              className="w-full border rounded px-2 py-1 mb-2"
            />
            <button
              onClick={() => addSingle(inputKey)}
              className="w-full mb-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {t("add")}
            </button>
            <button
              onClick={() => check(inputKey)}
              className="w-full mb-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              {t("search")}
            </button>
            <button
              onClick={() => addMultipleKeys(10)}
              className="w-full mb-2 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              {t("add10RandomKeys")}
            </button>
            <button
              onClick={() => addMultipleKeys(100)}
              className="w-full mb-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              {t("add100RandomKeys")}
            </button>
            <button
              onClick={resetFilter}
              className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
              {t("reset")}
            </button>
          </div>
          <div className="mb-4">
            <p>{t("bitArraySize", { m })}</p>
            <p>{t("bitsPerKey", { k })}</p>
            <p className="font-bold">{t("currentKeyCount", { count: keyList.length })}</p>
          </div>
          {searchResult && (
            <div className="mt-4">
              <p className={`font-bold ${searchResult.exists
                ? "text-orange-500"
                : "text-red-600"
                }`}>
                "{searchResult.key}" {searchResult.exists ? t("mayExist") : t("definitelyNotExist")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BloomFilterDemo;

