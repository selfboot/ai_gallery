"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/app/i18n/client";
import { CustomListbox } from "@/app/components/ListBox";
import Modal from "@/app/components/Modal";
import { SideAdComponent } from "@/app/components/AdComponent";
import { ArrowLeft, ArrowRight, RotateCcw, Undo2 } from "lucide-react";

const STORAGE_KEY = "unblockme-progress";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const isLevelSolved = (blocks, level) => {
  if (!level || !blocks?.length) return false;
  const target = blocks[0];
  if (!target) return false;

  const exitX = level.exit?.x ?? level.width;
  const exitY = level.exit?.y ?? target.y;
  const targetRight = target.x + target.width;
  const verticallyAligned = exitY >= target.y && exitY < target.y + target.height;

  return verticallyAligned && targetRight >= exitX;
};

const buildOccupancy = (blocks, width, height, ignoreIndex) => {
  const grid = Array.from({ length: height }, () => Array(width).fill(null));
  blocks.forEach((block, index) => {
    if (index === ignoreIndex) return;
    for (let y = block.y; y < block.y + block.height; y += 1) {
      for (let x = block.x; x < block.x + block.width; x += 1) {
        if (y >= 0 && y < height && x >= 0 && x < width) {
          grid[y][x] = index;
        }
      }
    }
  });
  return grid;
};

const computeAllowedShift = (block, intendedShift, axis, occupancy, level) => {
  if (intendedShift === 0) return 0;
  const step = intendedShift > 0 ? 1 : -1;
  let allowed = 0;
  for (let move = step; step > 0 ? move <= intendedShift : move >= intendedShift; move += step) {
    if (axis === "x") {
      const newX = block.x + move;
      if (newX < 0 || newX + block.width > level.width) break;
      const col = step > 0 ? block.x + block.width - 1 + move : block.x + move;
      let blocked = false;
      for (let row = block.y; row < block.y + block.height; row += 1) {
        if (col < 0 || col >= level.width || row < 0 || row >= level.height) {
          blocked = true;
          break;
        }
        if (occupancy[row][col] !== null) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
    } else {
      const newY = block.y + move;
      if (newY < 0 || newY + block.height > level.height) break;
      const row = step > 0 ? block.y + block.height - 1 + move : block.y + move;
      let blocked = false;
      for (let col = block.x; col < block.x + block.width; col += 1) {
        if (row < 0 || row >= level.height || col < 0 || col >= level.width) {
          blocked = true;
          break;
        }
        if (occupancy[row][col] !== null) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
    }
    allowed = move;
  }
  return allowed;
};

const UnblockMeGame = ({ lang, levels }) => {
  const { t } = useI18n();
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState([]);
  const [completedLevels, setCompletedLevels] = useState({});
  const [isWon, setIsWon] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cellSize, setCellSize] = useState(64);

  const dragRef = useRef(null);
  const blocksRef = useRef([]);

  const currentLevel = levels?.[currentLevelIndex];

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    if (!Array.isArray(levels) || !levels.length) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const levelParam = parseInt(params.get("level"), 10);
    if (!Number.isNaN(levelParam) && levelParam >= 1 && levelParam <= levels.length) {
      setCurrentLevelIndex(levelParam - 1);
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setCompletedLevels(parsed);
        }
      } catch (error) {
        console.error("Failed to parse unblockme progress", error);
      }
    }
  }, [levels]);

  useEffect(() => {
    if (!currentLevel) return;

    const initialBlocks = currentLevel.blocks.map((block) => ({ ...block }));
    setBlocks(initialBlocks);
    blocksRef.current = initialBlocks;
    setMoves(0);
    setHistory([]);
    setIsWon(false);
    setShowModal(false);
    setModalMessage("");
    dragRef.current = null;

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("level", currentLevel.id);
      window.history.replaceState({}, "", url);
    }
  }, [currentLevel]);

  useEffect(() => {
    if (!currentLevel) return;
    const updateSize = () => {
      const { width, height } = currentLevel;
      if (!width || !height) return;
      const availableWidth = window.innerWidth >= 1024 ? window.innerWidth * 0.55 : window.innerWidth - 48;
      const availableHeight = Math.max(window.innerHeight - 320, 220);
      const tentativeSize = Math.min(
        Math.floor(availableWidth / width),
        Math.floor(availableHeight / height)
      );
      const bounded = clamp(tentativeSize || 64, 32, 96);
      setCellSize(bounded);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [currentLevel]);

  const saveProgress = useCallback((levelId, movesCount) => {
    setCompletedLevels((prev) => {
      const record = prev[levelId];
      if (!record || movesCount < record.bestMoves) {
        const updated = {
          ...prev,
          [levelId]: {
            bestMoves: movesCount,
            completedAt: Date.now(),
          },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, []);

  const handleWin = useCallback((totalMoves) => {
    if (!currentLevel) return;
    setIsWon(true);
    saveProgress(currentLevel.id, totalMoves);
    setModalMessage(t("unblockme_success", { moves: totalMoves }));
    setShowModal(true);
  }, [currentLevel, saveProgress, t]);

  const handlePointerDown = useCallback((event, index) => {
    if (!currentLevel || isWon) return;
    const block = blocksRef.current[index];
    if (!block) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialX: block.x,
      initialY: block.y,
      snapshot: blocksRef.current.map((b) => ({ ...b })),
      moved: false,
    };
  }, [currentLevel, isWon]);

  const handlePointerMove = useCallback((event, index) => {
    const drag = dragRef.current;
    if (!drag || drag.index !== index || !currentLevel) return;
    if (!cellSize) return;

    const currentBlocks = blocksRef.current;
    const block = currentBlocks[index];
    if (!block) return;

    const occupancy = buildOccupancy(currentBlocks, currentLevel.width, currentLevel.height, index);

    const allowHorizontal = block.width >= block.height;
    const allowVertical = block.height >= block.width;

    const rawDeltaX = (event.clientX - drag.startX) / cellSize;
    const rawDeltaY = (event.clientY - drag.startY) / cellSize;

    let deltaX = 0;
    let deltaY = 0;

    if (allowHorizontal && allowVertical) {
      if (Math.abs(rawDeltaX) >= Math.abs(rawDeltaY)) {
        deltaX = rawDeltaX;
      } else {
        deltaY = rawDeltaY;
      }
    } else {
      deltaX = allowHorizontal ? rawDeltaX : 0;
      deltaY = allowVertical ? rawDeltaY : 0;
    }

    const desiredShiftX = Math.round(deltaX);
    const desiredShiftY = Math.round(deltaY);

    const shiftX = desiredShiftX !== 0 ? computeAllowedShift(block, desiredShiftX, "x", occupancy, currentLevel) : 0;
    const shiftY = desiredShiftY !== 0 ? computeAllowedShift(block, desiredShiftY, "y", occupancy, currentLevel) : 0;

    if (shiftX === 0 && shiftY === 0) return;

    const nextBlocks = currentBlocks.map((b, idx) =>
      idx === index
        ? {
            ...b,
            x: b.x + shiftX,
            y: b.y + shiftY,
          }
        : b
    );

    blocksRef.current = nextBlocks;
    setBlocks(nextBlocks);
    drag.moved = true;

    const updatedBlock = nextBlocks[index];
    drag.initialX = updatedBlock.x;
    drag.initialY = updatedBlock.y;

    if (shiftX !== 0) {
      drag.startX = event.clientX;
    }

    if (shiftY !== 0) {
      drag.startY = event.clientY;
    }

    if (!isWon && isLevelSolved(nextBlocks, currentLevel)) {
      const nextMoves = moves + 1;
      handleWin(nextMoves);
    }
  }, [cellSize, currentLevel, handleWin, isWon, moves]);

  const handlePointerUp = useCallback((event, index) => {
    const drag = dragRef.current;
    if (!drag || drag.index !== index) return;
    if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }

    const moved = drag.moved;
    const snapshot = drag.snapshot;
    dragRef.current = null;

    if (moved) {
      setHistory((prev) => [...prev, snapshot]);
      setMoves((prev) => {
        const nextMoves = prev + 1;
        if (isLevelSolved(blocksRef.current, currentLevel) && !isWon) {
          handleWin(nextMoves);
        }
        return nextMoves;
      });
    } else if (isLevelSolved(blocksRef.current, currentLevel) && !isWon) {
      handleWin(moves);
    }
  }, [currentLevel, handleWin, isWon, moves]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const restored = prev[prev.length - 1].map((block) => ({ ...block }));
      setBlocks(restored);
      blocksRef.current = restored;
      setMoves((value) => Math.max(0, value - 1));
      setIsWon(false);
      setShowModal(false);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    if (!currentLevel) return;
    const initialBlocks = currentLevel.blocks.map((block) => ({ ...block }));
    setBlocks(initialBlocks);
    blocksRef.current = initialBlocks;
    setMoves(0);
    setHistory([]);
    setIsWon(false);
    setShowModal(false);
    dragRef.current = null;
  }, [currentLevel]);

  const goToLevel = useCallback((index) => {
    if (!levels?.length) return;
    if (index < 0 || index >= levels.length) return;
    setCurrentLevelIndex(index);
  }, [levels]);

  const goToNextLevel = useCallback(() => {
    goToLevel(currentLevelIndex + 1);
  }, [currentLevelIndex, goToLevel]);

  const goToPrevLevel = useCallback(() => {
    goToLevel(currentLevelIndex - 1);
  }, [currentLevelIndex, goToLevel]);

  const levelOptions = useMemo(() => {
    if (!Array.isArray(levels)) return [];
    return levels.map((level) => {
      const record = completedLevels[level.id];
      const suffix = record ? " ✓" : "";
      return `${t("level")} ${level.id.toString().padStart(3, "0")}${suffix}`;
    });
  }, [completedLevels, levels, t]);

  const selectedLevelLabel = levelOptions[currentLevelIndex] ?? "";
  const bestRecord = currentLevel ? completedLevels[currentLevel.id] : null;
  const canUndo = history.length > 0;

  if (!currentLevel) {
    return (
      <div className="p-4 text-center text-gray-600">
        {t("loading")}
      </div>
    );
  }

  const boardWidth = cellSize * currentLevel.width;
  const boardHeight = cellSize * currentLevel.height;
  const heroTemplate = currentLevel.blocks?.[0];
  const exitHeightPx = (heroTemplate?.height ?? 1) * cellSize;
  const exitLineWidth = Math.max(6, cellSize * 0.18);
  const rawExitTop = currentLevel.exit.y * cellSize;
  const exitTop = clamp(rawExitTop, 0, Math.max(0, boardHeight - exitHeightPx));
  const exitLeft = boardWidth - exitLineWidth;

  return (
    <div className="flex flex-col lg:flex-row w-full gap-4 p-4">
      <div className="w-full lg:w-4/5 flex flex-col items-center gap-4">
        <div
          className="relative rounded-lg border border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner"
          style={{
            width: `${boardWidth}px`,
            height: `${boardHeight}px`,
            backgroundSize: `${cellSize}px ${cellSize}px`,
            backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
          }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              width: `${exitLineWidth}px`,
              height: `${exitHeightPx}px`,
              top: `${exitTop}px`,
              left: `${exitLeft}px`,
              transform: "translateX(100%)",
              backgroundColor: "rgba(220,38,38,0.92)",
              borderRadius: "0 6px 6px 0",
              boxShadow: "-10px 0 16px rgba(220,38,38,0.55)",
              zIndex: 5,
            }}
          />

          {blocks.map((block, index) => {
            const left = block.x * cellSize;
            const top = block.y * cellSize;
            const width = block.width * cellSize;
            const height = block.height * cellSize;
            const isTarget = index === 0;
            const orientation = block.width === block.height ? "square" : (block.width > block.height ? "horizontal" : "vertical");

            const baseColor = isTarget
              ? "bg-red-500"
              : orientation === "horizontal"
                ? "bg-blue-500"
                : orientation === "vertical"
                  ? "bg-emerald-500"
                  : "bg-amber-500";

            return (
              <div
                key={`${index}-${block.x}-${block.y}`}
                onPointerDown={(event) => handlePointerDown(event, index)}
                onPointerMove={(event) => handlePointerMove(event, index)}
                onPointerUp={(event) => handlePointerUp(event, index)}
                onPointerCancel={(event) => handlePointerUp(event, index)}
                className={`${baseColor} absolute rounded-md shadow-lg flex items-center justify-center text-white font-semibold select-none`}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  touchAction: "none",
                  transition: dragRef.current?.index === index ? "none" : "left 0.12s ease, top 0.12s ease",
                }}
              >
                <span className="px-2 text-sm md:text-base">
                  {isTarget ? t("unblockme_target") : `${t("block")} ${index}`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block w-full bg-gray-100">
          <SideAdComponent format="horizontal" className="absolute inset-0" />
        </div>
      </div>

      <div className="w-full lg:w-1/5 flex flex-col gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-500">{t("current_level")}</div>
          <div className="text-2xl font-semibold">{currentLevel.id}</div>
          <div className="mt-2 text-sm text-gray-600">
            {t("moves")}: {moves}
          </div>
          {bestRecord && (
            <div className="mt-1 text-sm text-gray-600">
              {t("best_record")}: {bestRecord.bestMoves}
            </div>
          )}
          {bestRecord && (
            <div className="text-xs text-gray-400 mt-1">
              {t("completed_at")}: {new Date(bestRecord.completedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-4 flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700" htmlFor="level-select">
            {t("select_level")}
          </label>
          <CustomListbox
            value={selectedLevelLabel}
            onChange={(value) => {
              const index = levelOptions.indexOf(value);
              if (index !== -1) {
                goToLevel(index);
              }
            }}
            options={levelOptions}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex items-center justify-center gap-2 rounded bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 disabled:opacity-40"
              onClick={goToPrevLevel}
              disabled={currentLevelIndex === 0}
            >
              <ArrowLeft size={16} />
              {t("previous_level")}
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 disabled:opacity-40"
              onClick={goToNextLevel}
              disabled={currentLevelIndex === levels.length - 1}
            >
              <ArrowRight size={16} />
              {t("next_level")}
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 col-span-2"
              onClick={handleReset}
            >
              <RotateCcw size={16} />
              {t("restart_game")}
            </button>
            <button
              className={`flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium col-span-2 ${canUndo ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-gray-200 text-gray-400"}`}
              onClick={handleUndo}
              disabled={!canUndo}
            >
              <Undo2 size={16} />
              {t("undo")}
            </button>
          </div>
        </div>

        <div className="md:hidden bg-gray-100">
          <SideAdComponent format="square" className="absolute inset-0" />
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t("congratulations")}
      >
        {modalMessage}
      </Modal>
    </div>
  );
};

export default UnblockMeGame;
