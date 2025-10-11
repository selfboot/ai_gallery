"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { initializeGameState, moveBlock, targetKey } from "./gameLogic";
import { generateProceduralLevel } from "./levelGenerator";
import { useI18n } from "@/app/i18n/client";

export default function LaserMazeGame({ lang, defaults, levels }) {
  const { t } = useI18n();

  const presetLevels = useMemo(() => levels ?? [], [levels]);
  const hasPresetLevels = presetLevels.length > 0;

  const STORAGE_KEY = "lasermaze-progress";
  const [completedLevels, setCompletedLevels] = useState({});
  // 初次加载时从 localStorage 恢复通关记录
  useEffect(() => {
    try {
      const saved = JSON.parse(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "{}" : "{}");
      if (saved && typeof saved === "object") setCompletedLevels(saved);
    } catch {}
  }, []);

  const initialLevel = useMemo(() => {
    if (hasPresetLevels) return presetLevels[0];
    return generateProceduralLevel(1, defaults);
  }, [defaults, hasPresetLevels, presetLevels]);

  const [activeLevel, setActiveLevel] = useState({
    type: hasPresetLevels ? "preset" : "random",
    index: 0,
    difficulty: 1,
    data: initialLevel,
  });
  const [lastPresetIndex, setLastPresetIndex] = useState(0);

  const [gameState, setGameState] = useState(() => initializeGameState(initialLevel, defaults));
  const [draggingBlock, setDraggingBlock] = useState(null);
  const svgRef = useRef(null);

  const loadLevel = useCallback(
    (nextLevel) => {
      setGameState(initializeGameState(nextLevel.data, defaults));
      setActiveLevel(nextLevel);
    },
    [defaults]
  );

  const goToLevel = useCallback(
    (index) => {
      if (!hasPresetLevels) return;
      const normalizedIndex = (index + presetLevels.length) % presetLevels.length;
      setLastPresetIndex(normalizedIndex);
      loadLevel({ type: "preset", index: normalizedIndex, difficulty: null, data: presetLevels[normalizedIndex] });
    },
    [hasPresetLevels, loadLevel, presetLevels]
  );

  const handleReset = useCallback(() => loadLevel(activeLevel), [activeLevel, loadLevel]);

  const handleGenerate = useCallback(
    (difficulty) => {
      const level = generateProceduralLevel(difficulty, defaults);
      loadLevel({ type: "random", index: null, difficulty, data: level });
    },
    [defaults, loadLevel]
  );

  const handleMouseDown = useCallback((e, blockIndex) => {
    e.preventDefault();
    setDraggingBlock(blockIndex);
  }, []);

  const handleMouseUp = useCallback(() => setDraggingBlock(null), []);

  const handleMouseMove = useCallback(
    (event) => {
      if (draggingBlock === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const pointerX = event.clientX;
      const pointerY = event.clientY;

      setGameState((prev) => {
        const { cellSize, gridSize } = prev;
        if (!cellSize) return prev;
        const baseBoardSize = gridSize * cellSize;
        if (!baseBoardSize) return prev;

        const scaleX = rect.width / baseBoardSize || 1;
        const scaleY = rect.height / baseBoardSize || 1;
        const localX = (pointerX - rect.left) / scaleX;
        const localY = (pointerY - rect.top) / scaleY;
        const gridX = Math.floor(localX / cellSize);
        const gridY = Math.floor(localY / cellSize);
        if (gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) return prev;

        const block = prev.blocks[draggingBlock];
        if (!block || (block.x === gridX && block.y === gridY)) return prev;
        return moveBlock(prev, draggingBlock, { x: gridX, y: gridY });
      });
    },
    [draggingBlock]
  );

  const progress = useMemo(() => {
    const total = gameState.targets.length;
    const hit = gameState.targetsHit?.size ?? 0;
    return { total, hit, complete: total > 0 && total === hit };
  }, [gameState.targets, gameState.targetsHit]);

  // 关卡完成后标记
  useEffect(() => {
    if (!progress.complete) return;
    if (activeLevel.type !== "preset") return;
    const idx = String(activeLevel.index ?? 0);
    if (!completedLevels[idx]) {
      setCompletedLevels((prev) => {
        const next = { ...prev, [idx]: true };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [progress.complete, activeLevel, completedLevels]);

  const levelName = useMemo(() => {
    const data = activeLevel.data;
    if (data?.nameKey) {
      const difficultyValue = data?.difficulty ?? activeLevel.difficulty;
      return t(data.nameKey, { difficulty: difficultyValue });
    }
    if (data?.name) return data.name;
    return activeLevel.type === "random" ? t("lasermaze_random_label") : t("lasermaze_custom_label");
  }, [activeLevel.data, activeLevel.difficulty, activeLevel.type, t]);

  const levelMeta = useMemo(() => {
    if (activeLevel.type === "random") {
      const diff = activeLevel.data?.difficulty ?? activeLevel.difficulty ?? 1;
      return t("lasermaze_difficulty_label", { value: diff });
    }
    return t("lasermaze_level_badge", { index: (activeLevel.index ?? 0) + 1 });
  }, [activeLevel, t]);

  const boardSizePx = useMemo(() => gameState.gridSize * gameState.cellSize, [gameState.gridSize, gameState.cellSize]);

  return (
    <div
      data-lang={lang}
      className="bg-white text-slate-900"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex flex-col lg:flex-row w-full gap-4 p-4">
        {/* 左侧：棋盘区域 */}
        <div className="w-full lg:w-4/5 flex flex-col items-center gap-4">
          <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto max-w-full p-4">
              <div className="flex justify-center" style={{ minWidth: `${boardSizePx}px` }}>
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${boardSizePx} ${boardSizePx}`}
                  preserveAspectRatio="xMidYMid meet"
                  className={draggingBlock !== null ? "cursor-grabbing" : "cursor-default"}
                  style={{ width: "100%", height: "auto", maxWidth: `${boardSizePx}px` }}
                >
                  <defs>
                    <pattern
                      id="laser-grid"
                      width={gameState.cellSize}
                      height={gameState.cellSize}
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width={gameState.cellSize} height={gameState.cellSize} fill="#f8fafc" />
                      <rect
                        width={gameState.cellSize}
                        height={gameState.cellSize}
                        fill="none"
                        stroke="#d0d7e5"
                        strokeWidth="2"
                      />
                    </pattern>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#laser-grid)" />

                  {/* 光束 */}
                  {gameState.beams.map((beam, index) => (
                    <line
                      key={`beam-${index}`}
                      x1={beam.x1 * gameState.cellSize}
                      y1={beam.y1 * gameState.cellSize}
                      x2={beam.x2 * gameState.cellSize}
                      y2={beam.y2 * gameState.cellSize}
                      stroke="#f97316"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="opacity-90"
                    >
                      <animate attributeName="opacity" values="0.9;0.6;0.9" dur="1s" repeatCount="indefinite" />
                    </line>
                  ))}

                  {/* 激光源 */}
                  {gameState.laser && (
                    <g>
                      <circle
                        cx={gameState.laser.x * gameState.cellSize}
                        cy={gameState.laser.y * gameState.cellSize}
                        r="16"
                        fill="#f97316"
                        opacity="0.4"
                      >
                        <animate attributeName="r" values="16;22;16" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <circle
                        cx={gameState.laser.x * gameState.cellSize}
                        cy={gameState.laser.y * gameState.cellSize}
                        r="10"
                        fill="#f97316"
                      />
                      <line
                        x1={gameState.laser.x * gameState.cellSize}
                        y1={gameState.laser.y * gameState.cellSize}
                        x2={(gameState.laser.x + gameState.laser.dx * 0.3) * gameState.cellSize}
                        y2={(gameState.laser.y + gameState.laser.dy * 0.3) * gameState.cellSize}
                        stroke="#ffffff"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </g>
                  )}

                  {/* 绿色目标点 */}
                  {gameState.targets.map((target) => {
                    const isHit = gameState.targetsHit?.has(targetKey(target));
                    const cx = target.x * gameState.cellSize;
                    const cy = target.y * gameState.cellSize;
                    return (
                      <g key={target.id ?? targetKey(target)}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r="18"
                          fill="none"
                          stroke={isHit ? "#22c55e" : "#86efac"}
                          strokeWidth="4"
                        />
                        <circle cx={cx} cy={cy} r="9" fill={isHit ? "#22c55e" : "#dcfce7"}>
                          {isHit && <animate attributeName="r" values="9;13;9" dur="0.5s" repeatCount="1" />}
                        </circle>
                      </g>
                    );
                  })}

                  {/* 反射方块 */}
                  {gameState.blocks.map((block, index) => {
                    const x = block.x * gameState.cellSize;
                    const y = block.y * gameState.cellSize;
                    const isDragging = draggingBlock === index;
                    return (
                      <g
                        key={block.id ?? `block-${index}`}
                        onMouseDown={(e) => handleMouseDown(e, index)}
                        className={isDragging ? "cursor-grabbing" : "cursor-grab"}
                      >
                        <rect
                          x={x + 5}
                          y={y + 5}
                          width={gameState.cellSize - 10}
                          height={gameState.cellSize - 10}
                          rx="10"
                          fill="#ffffff"
                          stroke={isDragging ? "#60a5fa" : "#94a3b8"}
                          strokeWidth="3"
                          style={{ filter: "drop-shadow(0 8px 16px rgba(15,23,42,0.12))" }}
                        />
                        <circle cx={x + gameState.cellSize / 2} cy={y} r="4" fill="#f97316" />
                        <circle cx={x + gameState.cellSize / 2} cy={y + gameState.cellSize} r="4" fill="#f97316" />
                        <circle cx={x} cy={y + gameState.cellSize / 2} r="4" fill="#f97316" />
                        <circle cx={x + gameState.cellSize} cy={y + gameState.cellSize / 2} r="4" fill="#f97316" />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：设置区域 */}
        <div className="w-full lg:w-1/5 flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{levelMeta}</span>
              {activeLevel.type === "random" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <Sparkles className="h-4 w-4" />
                  {t("lasermaze_random_badge")}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{levelName}</h2>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
                onClick={() => goToLevel(lastPresetIndex - 1)}
                disabled={!hasPresetLevels}
                aria-label={t("lasermaze_prev_level")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
                onClick={() => goToLevel(lastPresetIndex + 1)}
                disabled={!hasPresetLevels}
                aria-label={t("lasermaze_next_level")}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-400"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" /> {t("lasermaze_reset_button")}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-700">{t("lasermaze_targets_label")}</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-bold text-emerald-500">{progress.hit}</span>
              <span className="pb-1 text-sm text-slate-500">
                {t("lasermaze_targets_total", { total: progress.total })}
              </span>
              {progress.complete && <span className="pb-1 text-xl">🎉</span>}
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                style={{ width: `${progress.total ? (progress.hit / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {hasPresetLevels && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-700">{t("lasermaze_choose_level")}</p>
              <div className="mt-3">
                <select
                  className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-700"
                  value={activeLevel.index ?? 0}
                  onChange={(e) => goToLevel(parseInt(e.target.value))}
                >
                  {presetLevels.map((_, index) => (
                    <option key={index} value={index}>
                      {index + 1}
                      {completedLevels[String(index)] ? " ✓" : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-slate-500">
                  {t("lasermaze_completed_progress", {
                    hit: Object.keys(completedLevels).length,
                    total: presetLevels.length,
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-700">{t("lasermaze_random_section")}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5].map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => handleGenerate(difficulty)}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-600 transition hover:border-amber-400 hover:bg-amber-100"
                >
                  {t("lasermaze_difficulty_label", { value: difficulty })}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">{t("lasermaze_random_tip")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
