"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/client";
import {
  DEFAULT_KMP_EXAMPLE,
  buildLpsSteps,
  buildMatchSteps,
  getFinalLps,
  getRandomKmpExample,
} from "./kmp";

const getStepText = (t, phase, step, text, pattern) => {
  if (!step) {
    return t("kmp_ready");
  }

  if (phase === "lps") {
    switch (step.action) {
      case "initialize":
        return t("kmp_lps_initialize");
      case "match":
        return t("kmp_lps_match_step", {
          index: step.index,
          length: step.length,
        });
      case "fallback":
        return t("kmp_lps_fallback_step", {
          from: step.fromLength,
          to: step.toLength,
          index: step.index,
        });
      case "set-zero":
        return t("kmp_lps_zero_step", {
          index: step.index,
        });
      case "complete":
        return t("kmp_lps_complete_step");
      default:
        return t("kmp_ready");
    }
  }

  switch (step.action) {
    case "initialize":
      return t("kmp_match_initialize");
    case "advance":
      return t("kmp_match_advance_step", {
        textChar: text[step.comparedTextIndex] ?? "",
        patternChar: pattern[step.comparedPatternIndex] ?? "",
        textIndex: step.comparedTextIndex,
        patternIndex: step.comparedPatternIndex,
      });
    case "fallback":
      return t("kmp_match_fallback_step", {
        from: step.fromPatternIndex,
        to: step.toPatternIndex,
        textIndex: step.textIndex,
      });
    case "shift":
      return t("kmp_match_shift_step", {
        textIndex: step.textIndex,
      });
    case "match-found":
      return t("kmp_match_found_step", {
        index: step.matchStart,
      });
    case "complete":
      return step.matches.length > 0
        ? t("kmp_match_complete_step", {
            matches: step.matches.join(", "),
          })
        : t("kmp_match_no_result_step");
    default:
      return t("kmp_ready");
  }
};

const getCellClassName = (isPrimary, isSecondary, isAccent = false) => {
  const baseClass =
    "flex h-8 w-8 items-center justify-center rounded border text-xs font-medium transition md:h-9 md:w-9 md:text-sm";

  if (isAccent) {
    return `${baseClass} border-emerald-400 bg-emerald-100 text-emerald-900`;
  }

  if (isPrimary) {
    return `${baseClass} border-sky-400 bg-sky-100 text-sky-900`;
  }

  if (isSecondary) {
    return `${baseClass} border-amber-400 bg-amber-100 text-amber-900`;
  }

  return `${baseClass} border-slate-200 bg-white text-slate-700`;
};
const KMPVisualization = () => {
  const { t } = useI18n();
  const [text, setText] = useState(DEFAULT_KMP_EXAMPLE.text);
  const [pattern, setPattern] = useState(DEFAULT_KMP_EXAMPLE.pattern);
  const [lpsSteps, setLpsSteps] = useState([]);
  const [currentLpsStepIndex, setCurrentLpsStepIndex] = useState(-1);
  const [matchSteps, setMatchSteps] = useState([]);
  const [currentMatchStepIndex, setCurrentMatchStepIndex] = useState(-1);
  const [phase, setPhase] = useState("idle");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [statusMessage, setStatusMessage] = useState("");

  const clearPlayback = (message) => {
    setIsAutoPlaying(false);
    setPhase("idle");
    setLpsSteps([]);
    setCurrentLpsStepIndex(-1);
    setMatchSteps([]);
    setCurrentMatchStepIndex(-1);
    setStatusMessage(message);
  };

  const handleTextChange = (event) => {
    setText(event.target.value);
    clearPlayback(t("kmp_inputs_updated"));
  };

  const handlePatternChange = (event) => {
    setPattern(event.target.value);
    clearPlayback(t("kmp_inputs_updated"));
  };

  const handleLoadExample = () => {
    let nextExample = getRandomKmpExample();

    if (nextExample.text === text && nextExample.pattern === pattern) {
      const retriedExample = getRandomKmpExample();

      if (retriedExample.text !== text || retriedExample.pattern !== pattern) {
        nextExample = retriedExample;
      }
    }

    setText(nextExample.text);
    setPattern(nextExample.pattern);
    clearPlayback(t("kmp_example_loaded"));
  };

  const handleBuildLps = () => {
    if (!pattern) {
      clearPlayback(t("kmp_pattern_required"));
      return;
    }

    const steps = buildLpsSteps(pattern);
    setIsAutoPlaying(steps.length > 1);
    setPhase("lps");
    setLpsSteps(steps);
    setCurrentLpsStepIndex(steps.length > 0 ? 0 : -1);
    setMatchSteps([]);
    setCurrentMatchStepIndex(-1);
    setStatusMessage(t("kmp_prefix_ready"));
  };

  const handleStartMatch = () => {
    if (!pattern) {
      clearPlayback(t("kmp_pattern_required"));
      return;
    }

    const nextLpsSteps = buildLpsSteps(pattern);
    const nextLps =
      nextLpsSteps.length > 0 ? nextLpsSteps[nextLpsSteps.length - 1].lps : getFinalLps(pattern);
    const steps = buildMatchSteps(text, pattern, nextLps);

    setIsAutoPlaying(steps.length > 1);
    setPhase("match");
    setLpsSteps(nextLpsSteps);
    setCurrentLpsStepIndex(nextLpsSteps.length > 0 ? nextLpsSteps.length - 1 : -1);
    setMatchSteps(steps);
    setCurrentMatchStepIndex(steps.length > 0 ? 0 : -1);
    setStatusMessage(t("kmp_matching_ready"));
  };

  const handleReset = () => {
    clearPlayback(t("kmp_reset_done"));
  };

  const handleStep = () => {
    if (phase === "lps" && currentLpsStepIndex < lpsSteps.length - 1) {
      setCurrentLpsStepIndex(currentLpsStepIndex + 1);
      return;
    }

    if (phase === "match" && currentMatchStepIndex < matchSteps.length - 1) {
      setCurrentMatchStepIndex(currentMatchStepIndex + 1);
    }
  };

  const toggleAutoPlay = () => {
    if (phase === "lps" && lpsSteps.length > 0) {
      setIsAutoPlaying(!isAutoPlaying);
      return;
    }

    if (phase === "match" && matchSteps.length > 0) {
      setIsAutoPlaying(!isAutoPlaying);
    }
  };

  useEffect(() => {
    if (!isAutoPlaying) {
      return undefined;
    }

    const hasMoreLpsSteps = phase === "lps" && currentLpsStepIndex < lpsSteps.length - 1;
    const hasMoreMatchSteps = phase === "match" && currentMatchStepIndex < matchSteps.length - 1;

    if (!hasMoreLpsSteps && !hasMoreMatchSteps) {
      setIsAutoPlaying(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      handleStep();
    }, Math.max(120, 1200 - speed * 100));

    return () => window.clearTimeout(timeoutId);
  }, [
    currentLpsStepIndex,
    currentMatchStepIndex,
    isAutoPlaying,
    lpsSteps.length,
    matchSteps.length,
    phase,
    speed,
  ]);

  const currentLpsStep =
    currentLpsStepIndex >= 0 && currentLpsStepIndex < lpsSteps.length ? lpsSteps[currentLpsStepIndex] : null;
  const currentMatchStep =
    currentMatchStepIndex >= 0 && currentMatchStepIndex < matchSteps.length ? matchSteps[currentMatchStepIndex] : null;
  const activeStep = phase === "match" ? currentMatchStep : currentLpsStep;
  const currentStepNumber =
    phase === "match"
      ? currentMatchStepIndex + 1
      : phase === "lps"
        ? currentLpsStepIndex + 1
        : 0;
  const totalSteps = phase === "match" ? matchSteps.length : phase === "lps" ? lpsSteps.length : 0;
  const lpsValues = currentLpsStep?.lps ?? Array(pattern.length).fill(0);
  const matchResults = currentMatchStep?.matches ?? [];
  const finalLps = getFinalLps(pattern);
  const hasPreparedSteps = phase === "match" ? matchSteps.length > 0 : phase === "lps" ? lpsSteps.length > 0 : false;
  const hasMoreSteps =
    phase === "match"
      ? currentMatchStepIndex < matchSteps.length - 1
      : phase === "lps"
        ? currentLpsStepIndex < lpsSteps.length - 1
        : false;
  const canStep = hasPreparedSteps && !isAutoPlaying && hasMoreSteps;
  const canToggleAutoPlay = hasPreparedSteps && (hasMoreSteps || isAutoPlaying);
  const controlsGuide =
    phase === "lps"
      ? isAutoPlaying
        ? t("kmp_controls_hint_lps_playing")
        : t("kmp_controls_hint_lps_ready")
      : phase === "match"
        ? isAutoPlaying
          ? t("kmp_controls_hint_match_playing")
          : t("kmp_controls_hint_match_ready")
        : t("kmp_controls_hint_idle");
  const explanation = activeStep ? getStepText(t, phase, activeStep, text, pattern) : statusMessage || t("kmp_ready");

  return (
    <div className="mx-auto flex flex-col gap-4 pb-6 pt-2">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t("kmp_prefix_table_title")}</h2>
                <p className="mt-1 text-xs text-slate-600">{t("kmp_prefix_table_description")}</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {t("kmp_current_phase")}: {phase === "lps" ? t("kmp_phase_lps") : phase === "match" ? t("kmp_phase_match") : t("kmp_phase_idle")}
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">{t("kmp_pattern_label")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {pattern.split("").map((character, index) => {
                    const compareIndices = currentLpsStep?.compareIndices ?? [];
                    return (
                      <div
                        key={`pattern-${index}`}
                        className={getCellClassName(compareIndices[0] === index, compareIndices[1] === index, currentLpsStep?.index === index)}
                      >
                        {character}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">{t("kmp_prefix_array_label")}</div>
                <div className="flex flex-wrap gap-1.5" data-testid="kmp-lps-array">
                  {lpsValues.map((value, index) => (
                    <div
                      key={`lps-${index}`}
                      className={getCellClassName(currentLpsStep?.index === index, false)}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("kmp_prefix_index")}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{currentLpsStep?.index ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("kmp_prefix_length")}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{currentLpsStep?.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("kmp_final_lps_label")}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {finalLps.join(", ") || "-"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-900">{t("kmp_matching_title")}</h2>
              <p className="mt-1 text-xs text-slate-600">{t("kmp_matching_description")}</p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">{t("kmp_text_label")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {text.split("").map((character, index) => (
                    <div
                      key={`text-${index}`}
                      className={getCellClassName(currentMatchStep?.comparedTextIndex === index, false)}
                    >
                      {character}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-600">{t("kmp_pattern_alignment_label")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: currentMatchStep?.alignmentStart ?? 0 }).map((_, index) => (
                    <div key={`gap-${index}`} className="h-8 w-8 md:h-9 md:w-9" />
                  ))}
                  {pattern.split("").map((character, index) => (
                    <div
                      key={`aligned-pattern-${index}`}
                      className={getCellClassName(
                        currentMatchStep?.comparedPatternIndex === index,
                        false,
                        currentMatchStep?.action === "match-found" && currentMatchStep?.comparedPatternIndex === index,
                      )}
                    >
                      {character}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("kmp_text_index")}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{currentMatchStep?.textIndex ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("kmp_pattern_index")}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{currentMatchStep?.patternIndex ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("kmp_alignment_label")}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{currentMatchStep?.alignmentStart ?? 0}</div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-sm font-medium text-emerald-900">{t("kmp_match_results_label")}</div>
                <div className="mt-1.5 text-sm text-emerald-950" data-testid="kmp-match-results">
                  {matchResults.length > 0 ? matchResults.join(", ") : t("kmp_no_matches_yet")}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="kmp-text-input" className="mb-1.5 block text-sm font-medium text-slate-700">
                {t("kmp_text_label")}
              </label>
              <input
                id="kmp-text-input"
                data-testid="kmp-text-input"
                type="text"
                value={text}
                onChange={handleTextChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                placeholder={t("kmp_text_placeholder")}
              />
            </div>

            <div>
              <label htmlFor="kmp-pattern-input" className="mb-1.5 block text-sm font-medium text-slate-700">
                {t("kmp_pattern_label")}
              </label>
              <input
                id="kmp-pattern-input"
                data-testid="kmp-pattern-input"
                type="text"
                value={pattern}
                onChange={handlePatternChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                placeholder={t("kmp_pattern_placeholder")}
              />
            </div>

            <div>
              <label htmlFor="kmp-speed-slider" className="mb-1.5 block text-sm font-medium text-slate-700">
                {t("kmp_speed_label")}: {speed}
              </label>
              <input
                id="kmp-speed-slider"
                data-testid="kmp-speed-slider"
                type="range"
                min="1"
                max="10"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <div
              data-testid="kmp-controls-guide"
              className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-6 text-sky-900"
            >
              {controlsGuide}
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                data-testid="kmp-load-example"
                onClick={handleLoadExample}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
              >
                {t("kmp_load_example")}
              </button>
              <button
                type="button"
                data-testid="kmp-build-lps"
                onClick={handleBuildLps}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
              >
                {t("kmp_build_prefix_table")}
              </button>
              <button
                type="button"
                data-testid="kmp-start-match"
                onClick={handleStartMatch}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                {t("kmp_start_matching")}
              </button>
              <button
                type="button"
                data-testid="kmp-step"
                onClick={handleStep}
                disabled={!canStep}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-amber-500"
              >
                {t("kmp_step")}
              </button>
              <button
                type="button"
                data-testid="kmp-autoplay"
                onClick={toggleAutoPlay}
                disabled={!canToggleAutoPlay}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-violet-600"
              >
                {isAutoPlaying ? t("kmp_pause") : t("kmp_autoplay")}
              </button>
              <button
                type="button"
                data-testid="kmp-reset"
                onClick={handleReset}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {t("kmp_reset")}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">{t("kmp_current_step_label")}</div>
              <div className="mt-1.5 text-lg font-semibold text-slate-900" data-testid="kmp-current-step">
                {currentStepNumber} / {totalSteps}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">{t("kmp_step_explanation_label")}</div>
              <p className="mt-1.5 text-sm leading-6 text-slate-700" data-testid="kmp-status-message">
                {explanation}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default KMPVisualization;
