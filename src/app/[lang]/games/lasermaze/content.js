"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initializeGameState, moveBlock, targetKey } from "./gameLogic.js";
import { generateProceduralLevel } from "./levelGenerator";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";

const RANDOM_GRID_SIZE = 15;
const RANDOM_CELL_SIZE = 48;

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

  const [gameState, setGameState] = useState(() => initializeGameState(initialLevel, defaults));
  const [draggingBlock, setDraggingBlock] = useState(null);
  const [solutionBlocks, setSolutionBlocks] = useState(initialLevel?.solutionBlocks ?? null);
  const [showSolution, setShowSolution] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasShownSuccess, setHasShownSuccess] = useState(false);
  const [randomDifficulty, setRandomDifficulty] = useState(1);
  const svgRef = useRef(null);

  const loadLevel = useCallback(
    (nextLevel) => {
      setGameState(initializeGameState(nextLevel.data, defaults));
      setActiveLevel(nextLevel);
      setSolutionBlocks(nextLevel.data?.solutionBlocks ?? null);
      setShowSolution(false);
    },
    [defaults]
  );

  const goToLevel = useCallback(
    (index) => {
      if (!hasPresetLevels) return;
      const normalizedIndex = (index + presetLevels.length) % presetLevels.length;
      loadLevel({ type: "preset", index: normalizedIndex, difficulty: null, data: presetLevels[normalizedIndex] });
    },
    [hasPresetLevels, loadLevel, presetLevels]
  );

  const handleReset = useCallback(() => {
    loadLevel(activeLevel);
    setShowSuccessModal(false);
    setHasShownSuccess(false);
    setShowSolution(false);
  }, [activeLevel, loadLevel]);

  const handleGenerate = useCallback(
    (difficulty) => {
      const randomDefaults = {
        ...defaults,
        gridSize: RANDOM_GRID_SIZE,
        cellSize: RANDOM_CELL_SIZE,
      };
      const level = generateProceduralLevel(difficulty, randomDefaults);
      setRandomDifficulty(difficulty);
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

  // 通关弹窗（只弹一次）
  useEffect(() => {
    if (progress.complete && !hasShownSuccess) {
      setShowSuccessModal(true);
      setHasShownSuccess(true);
    }
  }, [progress.complete, hasShownSuccess]);

  // 关卡切换时，重置通关弹窗的已显示标记，确保新关卡通关能再次弹窗
  useEffect(() => {
    setShowSuccessModal(false);
    setHasShownSuccess(false);
    setShowSolution(false);
  }, [activeLevel.index, activeLevel.type, activeLevel.data?.id]);

  useEffect(() => {
    if (activeLevel.type === "random" && activeLevel.difficulty) {
      setRandomDifficulty(activeLevel.difficulty);
    }
  }, [activeLevel]);

  const boardSizePx = useMemo(() => gameState.gridSize * gameState.cellSize, [gameState.gridSize, gameState.cellSize]);
  const targetOuterRadius = useMemo(() => gameState.cellSize * 0.28, [gameState.cellSize]);
  const targetInnerRadius = useMemo(() => gameState.cellSize * 0.14, [gameState.cellSize]);
  const laserOuterRadius = useMemo(() => gameState.cellSize * 0.32, [gameState.cellSize]);
  const laserInnerRadius = useMemo(() => gameState.cellSize * 0.2, [gameState.cellSize]);
  const redDotRadius = useMemo(() => gameState.cellSize * 0.08, [gameState.cellSize]);
  const hasSolutionOverlay = useMemo(() => Array.isArray(solutionBlocks) && solutionBlocks.length > 0, [solutionBlocks]);

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
                        r={laserOuterRadius}
                        fill="#f97316"
                        opacity="0.4"
                      >
                        <animate
                          attributeName="r"
                          values={`${laserOuterRadius};${laserOuterRadius * 1.25};${laserOuterRadius}`}
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={gameState.laser.x * gameState.cellSize}
                        cy={gameState.laser.y * gameState.cellSize}
                        r={laserInnerRadius}
                        fill="#f97316"
                      />
                      <line
                        x1={gameState.laser.x * gameState.cellSize}
                        y1={gameState.laser.y * gameState.cellSize}
                        x2={(gameState.laser.x + gameState.laser.dx * 0.3) * gameState.cellSize}
                        y2={(gameState.laser.y + gameState.laser.dy * 0.3) * gameState.cellSize}
                        stroke="#ffffff"
                        strokeWidth={Math.max(2, gameState.cellSize * 0.06)}
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
                          r={targetOuterRadius}
                          fill="none"
                          stroke={isHit ? "#22c55e" : "#86efac"}
                          strokeWidth={Math.max(3, gameState.cellSize * 0.08)}
                        />
                        <circle cx={cx} cy={cy} r={targetInnerRadius} fill={isHit ? "#22c55e" : "#dcfce7"}>
                          {isHit && (
                            <animate attributeName="r" values={`${targetInnerRadius};${targetInnerRadius * 1.4};${targetInnerRadius}`} dur="0.5s" repeatCount="1" />
                          )}
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
                          x={x + gameState.cellSize * 0.1}
                          y={y + gameState.cellSize * 0.1}
                          width={gameState.cellSize * 0.8}
                          height={gameState.cellSize * 0.8}
                          rx={gameState.cellSize * 0.14}
                          fill="#ffffff"
                          stroke={isDragging ? "#60a5fa" : "#94a3b8"}
                          strokeWidth={Math.max(2, gameState.cellSize * 0.06)}
                          style={{ filter: "drop-shadow(0 8px 16px rgba(15,23,42,0.12))" }}
                        />
                        <circle cx={x + gameState.cellSize / 2} cy={y} r={redDotRadius} fill="#f97316" />
                        <circle cx={x + gameState.cellSize / 2} cy={y + gameState.cellSize} r={redDotRadius} fill="#f97316" />
                        <circle cx={x} cy={y + gameState.cellSize / 2} r={redDotRadius} fill="#f97316" />
                        <circle cx={x + gameState.cellSize} cy={y + gameState.cellSize / 2} r={redDotRadius} fill="#f97316" />
                      </g>
                    );
                  })}

                  {showSolution && hasSolutionOverlay &&
                    solutionBlocks?.map((block, idx) => {
                      const x = block.x * gameState.cellSize;
                      const y = block.y * gameState.cellSize;
                      return (
                        <rect
                          key={`solution-${idx}`}
                          x={x + gameState.cellSize * 0.12}
                          y={y + gameState.cellSize * 0.12}
                          width={gameState.cellSize * 0.76}
                          height={gameState.cellSize * 0.76}
                          rx={gameState.cellSize * 0.18}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth={Math.max(2, gameState.cellSize * 0.05)}
                          strokeDasharray="6 4"
                          opacity="0.75"
                          pointerEvents="none"
                        />
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
            {hasPresetLevels && (
              <div>
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

            <div className={hasPresetLevels ? "mt-6 border-t border-slate-200 pt-6" : ""}>
              <p className="text-sm font-medium text-slate-700">{t("lasermaze_random_section")}</p>
              <p className="mt-2 text-xs text-slate-500">{t("lasermaze_random_tip")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3].map((difficulty) => {
                  const selected = randomDifficulty === difficulty;
                  return (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => setRandomDifficulty(difficulty)}
                      className={`flex-1 min-w-[120px] rounded-full border px-4 py-2 text-sm font-semibold text-center transition ${
                        selected
                          ? "border-blue-500 bg-blue-500 text-white hover:bg-blue-500"
                          : "border-blue-400 text-blue-500 hover:bg-blue-50"
                      }`}
                      aria-pressed={selected}
                    >
                      {t("lasermaze_difficulty_label", { value: difficulty })}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="mt-3 w-full rounded-full border border-blue-400 px-4 py-2 text-sm font-semibold text-blue-500 transition hover:bg-blue-50"
                onClick={() => handleGenerate(randomDifficulty)}
              >
                {t("lasermaze_random_generate_button")}
              </button>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6 space-y-2">
              <button
                type="button"
                className="w-full rounded-full border border-blue-400 px-4 py-2 text-sm font-semibold text-blue-500 transition hover:bg-blue-50"
                onClick={handleReset}
              >
                {t("lasermaze_reset_button")}
              </button>
              {hasSolutionOverlay && (
                <button
                  type="button"
                  className="w-full rounded-full border border-blue-400 px-4 py-2 text-sm font-semibold text-blue-500 transition hover:bg-blue-50"
                  onClick={() => setShowSolution((prev) => !prev)}
                >
                  {showSolution ? t("lasermaze_hide_solution") : t("lasermaze_show_solution")}
                </button>
              )}
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
        </div>
        {/* 通关弹窗 */}
        <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)}>
          <div className="text-center p-2">
            <div className="text-2xl font-bold mb-2">{t("congratulations")}</div>
            <div className="text-slate-600 text-sm">{t("lasermaze_targets_label")}: {progress.hit} / {progress.total}</div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
