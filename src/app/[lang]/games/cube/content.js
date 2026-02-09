"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RubiksCube from "./RubiksCube";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { useI18n } from "@/app/i18n/client";
import { SideAdComponent } from "@/app/components/AdComponent";

export default function CubeGame() {
  const [isScrambling, setIsScrambling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [enableOrbitControls, setEnableOrbitControls] = useState(true);

  const [isBusy, setIsBusy] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const [solveMethod, setSolveMethod] = useState("kociemba");
  const [solveRequestId, setSolveRequestId] = useState(0);
  const [nextStepRequestId, setNextStepRequestId] = useState(0);
  const [autoPlayRequestId, setAutoPlayRequestId] = useState(0);
  const [stopAutoPlayRequestId, setStopAutoPlayRequestId] = useState(0);

  const [solutionSteps, setSolutionSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [solveError, setSolveError] = useState("");

  const { t } = useI18n();

  const hasSolution = solutionSteps.length > 0;
  const isSolutionDone = hasSolution && currentStepIndex >= solutionSteps.length - 1;
  const disableCommonActions = isScrambling || isResetting || isBusy;
  const isSolvedInfo = solveError === "cube_already_solved";

  const solveErrorText = useMemo(() => {
    if (!solveError) return "";
    if (solveError === "cube_already_solved") return t("cube_already_solved");
    if (solveError === "failed_to_solve") return t("cube_solve_error");
    if (solveError === "cube_move_sync_error") return t("cube_move_sync_error");
    return `${t("cube_solve_error")}: ${solveError}`;
  }, [solveError, t]);

  return (
    <div className="w-full flex flex-col lg:flex-row">
      <div className="lg:w-4/5 flex flex-col">
        <div className="h-[70vh] relative flex items-center justify-center">
          <div className="w-full lg:w-4/5 h-full relative bg-gradient-to-br rounded-lg shadow-inner border border-gray-400 bg-gray-200">
            <Canvas
              camera={{
                position: [6, 6, 6],
                fov: 40,
                near: 0.1,
                far: 1000,
              }}
              gl={{
                antialias: true,
                toneMapping: THREE.NoToneMapping,
                outputColorSpace: "srgb",
                preserveDrawingBuffer: true,
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <RubiksCube
                isScrambling={isScrambling}
                isResetting={isResetting}
                solveMethod={solveMethod}
                solveRequestId={solveRequestId}
                nextStepRequestId={nextStepRequestId}
                autoPlayRequestId={autoPlayRequestId}
                stopAutoPlayRequestId={stopAutoPlayRequestId}
                onScrambleComplete={() => setIsScrambling(false)}
                onResetComplete={() => setIsResetting(false)}
                setEnableOrbitControls={setEnableOrbitControls}
                onBusyChange={setIsBusy}
                onSolutionGenerated={(steps) => {
                  setSolutionSteps(steps);
                  setCurrentStepIndex(-1);
                }}
                onSolutionProgress={(stepIndex) => setCurrentStepIndex(stepIndex)}
                onAutoPlayChange={setIsAutoPlaying}
                onSolveError={setSolveError}
              />
              <OrbitControls
                makeDefault
                enablePan={false}
                enableZoom={false}
                enableRotate={enableOrbitControls}
                minDistance={8}
                maxDistance={8}
                enableDamping={true}
                dampingFactor={0.05}
                mouseButtons={{
                  LEFT: THREE.MOUSE.ROTATE,
                  MIDDLE: null,
                  RIGHT: null,
                }}
                touches={{
                  ONE: THREE.TOUCH.ROTATE,
                  TWO: null,
                }}
              />
            </Canvas>
          </div>
        </div>

        <div className="px-4 mt-4 lg:px-0">
          <div className="mx-auto w-full lg:w-4/5 rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-gray-700">{t("cube_solution_steps")}</div>
            {hasSolution ? (
              <>
                <div className="mb-2 text-xs text-gray-500">
                  {isSolutionDone
                    ? t("cube_solution_done")
                    : t("cube_solution_progress", {
                        current: Math.max(currentStepIndex + 1, 0),
                        total: solutionSteps.length,
                      })}
                </div>
                <ol className="max-h-56 overflow-y-auto space-y-1 pr-1 text-sm">
                  {solutionSteps.map((step, index) => {
                    const isCurrent = index === currentStepIndex;
                    const isExecuted = index <= currentStepIndex;

                    return (
                      <li
                        key={`${step}-${index}`}
                        className={`rounded px-2 py-1 ${
                          isCurrent
                            ? "bg-blue-100 text-blue-700"
                            : isExecuted
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {index + 1}. {step}
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="text-sm text-gray-500">{t("cube_no_solution")}</div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:w-1/5 p-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          <button
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            onClick={() => {
              setSolveError("");
              setIsScrambling(true);
            }}
            disabled={disableCommonActions}
          >
            {t("scramble")}
          </button>

          <button
            className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            onClick={() => {
              setSolveError("");
              setIsResetting(true);
            }}
            disabled={disableCommonActions}
          >
            {t("reset")}
          </button>

          <label className="text-sm font-medium text-gray-700" htmlFor="cube-solver-method">
            {t("cube_solver_method")}
          </label>
          <select
            id="cube-solver-method"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            value={solveMethod}
            onChange={(event) => setSolveMethod(event.target.value)}
            disabled={disableCommonActions}
          >
            <option value="kociemba">{t("cube_solver_kociemba")}</option>
            <option value="reverse">{t("cube_solver_reverse")}</option>
          </select>

          <button
            className="w-full py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-400"
            onClick={() => {
              setSolveError("");
              setSolveRequestId((value) => value + 1);
            }}
            disabled={disableCommonActions}
          >
            {t("cube_generate_solution")}
          </button>

          <button
            className="w-full py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-400"
            onClick={() => {
              setSolveError("");
              setNextStepRequestId((value) => value + 1);
            }}
            disabled={disableCommonActions || !hasSolution || isSolutionDone || isAutoPlaying}
          >
            {t("cube_next_step")}
          </button>

          {isAutoPlaying ? (
            <button
              className="w-full py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
              onClick={() => setStopAutoPlayRequestId((value) => value + 1)}
            >
              {t("cube_stop_auto_solve")}
            </button>
          ) : (
            <button
              className="w-full py-2.5 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:bg-gray-400"
              onClick={() => {
                setSolveError("");
                setAutoPlayRequestId((value) => value + 1);
              }}
              disabled={disableCommonActions || !hasSolution || isSolutionDone}
            >
              {t("cube_auto_solve")}
            </button>
          )}

          {solveErrorText && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                isSolvedInfo ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {solveErrorText}
            </div>
          )}

          <div className="hidden mt-2 md:relative md:block w-full bg-gray-100">
            <SideAdComponent format="vertical" />
          </div>
        </div>
      </div>
    </div>
  );
}
