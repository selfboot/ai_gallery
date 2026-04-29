"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { useI18n } from "@/app/i18n/client";
import { compareTexts, createPlainTextReport, DIFF_MODES } from "./logic";

const EXAMPLES = {
  zh: {
    left: "第一条：甲方应在收到发票后 7 个工作日内付款。\n第二条：交付文件包括源代码、部署文档和测试报告。\n第三条：任何修改需双方书面确认。",
    right: "第一条：甲方应在收到发票后 10 个工作日内付款。\n第二条：交付文件包括源代码、部署文档、测试报告和验收清单。\n第三条：重大修改需双方书面确认。",
  },
  en: {
    left: "The service must respond within 300ms.\nThe contract starts on April 1.\nAll changes require written approval.",
    right: "The service should respond within 200ms.\nThe contract starts on May 1.\nAll major changes require written approval.",
  },
};

function visibleSideSegments(segments, side, showOnlyChanges) {
  return segments.filter((segment) => {
    if (showOnlyChanges && segment.type === "same") return false;
    if (side === "left") return segment.type !== "add";
    return segment.type !== "remove";
  });
}

function annotateDiffGroups(segments) {
  let diffIndex = -1;
  let inChangedBlock = false;

  return segments.map((segment) => {
    if (segment.type === "same") {
      inChangedBlock = false;
      return { ...segment, diffIndex: null };
    }
    if (!inChangedBlock) {
      diffIndex += 1;
      inChangedBlock = true;
    }
    return { ...segment, diffIndex };
  });
}

function segmentClassName(segment, side, activeDiffIndex) {
  const activeClass = segment.diffIndex === activeDiffIndex ? " ring-2 ring-amber-400 ring-offset-1" : "";
  if (segment.type === "remove" && side === "left") {
    return `bg-red-100 text-red-950 line-through decoration-red-600${activeClass}`;
  }
  if (segment.type === "add" && side === "right") {
    return `bg-green-100 text-green-950${activeClass}`;
  }
  return "text-gray-900";
}

function HighlightedText({ segments, side, placeholder, activeDiffIndex }) {
  return (
    <>
      {segments.length === 0 ? (
        <span className="text-gray-400">{placeholder}</span>
      ) : (
        segments.map((segment, index) => (
          <span key={`${side}-${segment.type}-${index}`} data-diff-index={segment.diffIndex ?? undefined} className={segmentClassName(segment, side, activeDiffIndex)}>
            {segment.value}
          </span>
        ))
      )}
    </>
  );
}

const DiffEditorPane = forwardRef(function DiffEditorPane({ label, value, onChange, placeholder, segments, side, showOnlyChanges, activeDiffIndex, onScrollSync }, ref) {
  const highlightRef = useRef(null);
  const textareaRef = useRef(null);
  const readonlyRef = useRef(null);

  const setScroll = (scrollTop, scrollLeft) => {
    [highlightRef.current, textareaRef.current, readonlyRef.current].forEach((element) => {
      if (!element) return;
      element.scrollTop = scrollTop;
      element.scrollLeft = scrollLeft;
    });
  };

  useImperativeHandle(ref, () => ({
    setScroll,
    scrollToDiff(diffIndex) {
      const target = highlightRef.current?.querySelector(`[data-diff-index="${diffIndex}"]`) || readonlyRef.current?.querySelector(`[data-diff-index="${diffIndex}"]`);
      if (!target) return false;
      const container = readonlyRef.current || textareaRef.current;
      if (!container) return false;
      const nextTop = Math.max(target.offsetTop - 72, 0);
      setScroll(nextTop, container.scrollLeft);
      return true;
    },
  }));

  const handleScroll = (event) => {
    if (highlightRef.current && event.currentTarget !== highlightRef.current) {
      highlightRef.current.scrollTop = event.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    onScrollSync?.(side, event.currentTarget.scrollTop, event.currentTarget.scrollLeft);
  };

  const visibleSegments = visibleSideSegments(segments, side, showOnlyChanges);

  if (showOnlyChanges) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <pre ref={readonlyRef} onScroll={handleScroll} className="min-h-[360px] overflow-auto rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-6 whitespace-pre-wrap break-words">
          <HighlightedText segments={visibleSegments} side={side} placeholder={placeholder} activeDiffIndex={activeDiffIndex} />
        </pre>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <div className="relative min-h-[360px] overflow-hidden rounded border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <pre ref={highlightRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-auto px-3 py-2 font-mono text-sm leading-6 whitespace-pre-wrap break-words">
          <HighlightedText segments={visibleSegments} side={side} placeholder={placeholder} activeDiffIndex={activeDiffIndex} />
          {"\n"}
        </pre>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          placeholder={placeholder}
          className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent px-3 py-2 font-mono text-sm leading-6 text-transparent caret-gray-950 selection:bg-blue-200 focus:outline-none"
        />
      </div>
    </label>
  );
});

export default function DiffTextContent() {
  const { t, lang } = useI18n();
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [mode, setMode] = useState(DIFF_MODES.LINE);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [activeDiffIndex, setActiveDiffIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const leftPaneRef = useRef(null);
  const rightPaneRef = useRef(null);
  const syncLockRef = useRef(false);

  const result = useMemo(() => compareTexts(leftText, rightText, mode), [leftText, rightText, mode]);
  const annotatedSegments = useMemo(() => annotateDiffGroups(result.segments), [result.segments]);
  const diffCount = useMemo(() => annotatedSegments.reduce((maxIndex, segment) => (segment.diffIndex === null ? maxIndex : Math.max(maxIndex, segment.diffIndex + 1)), 0), [annotatedSegments]);
  const visibleActiveDiffIndex = diffCount > 0 ? Math.min(activeDiffIndex, diffCount - 1) : null;
  const hasInput = leftText.length > 0 || rightText.length > 0;

  const syncPaneScroll = (sourceSide, scrollTop, scrollLeft) => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    const target = sourceSide === "left" ? rightPaneRef.current : leftPaneRef.current;
    target?.setScroll(scrollTop, scrollLeft);
    requestAnimationFrame(() => {
      syncLockRef.current = false;
    });
  };

  const goToDiff = (direction) => {
    if (diffCount === 0) return;
    const nextIndex = direction === "next" ? (visibleActiveDiffIndex + 1) % diffCount : (visibleActiveDiffIndex - 1 + diffCount) % diffCount;
    setActiveDiffIndex(nextIndex);
    requestAnimationFrame(() => {
      syncLockRef.current = true;
      leftPaneRef.current?.scrollToDiff(nextIndex);
      rightPaneRef.current?.scrollToDiff(nextIndex);
      requestAnimationFrame(() => {
        syncLockRef.current = false;
      });
    });
  };

  const loadExample = () => {
    const example = EXAMPLES[lang] || EXAMPLES.en;
    setLeftText(example.left);
    setRightText(example.right);
    setActiveDiffIndex(0);
    setCopyStatus("");
  };

  const clearAll = () => {
    setLeftText("");
    setRightText("");
    setActiveDiffIndex(0);
    setCopyStatus("");
  };

  const copyReport = async () => {
    const report = createPlainTextReport(leftText, rightText, result);
    await navigator.clipboard.writeText(report);
    setCopyStatus(t("difftext_copied"));
  };

  const downloadReport = () => {
    const report = createPlainTextReport(leftText, rightText, result);
    saveAs(new Blob([report], { type: "text/plain;charset=utf-8" }), "text-diff-report.txt");
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">{t("difftext_result_title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("difftext_input_hint")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded border border-gray-200 p-3">
              <p className="text-gray-500">{t("difftext_same")}</p>
              <p className="mt-1 text-xl font-bold text-gray-950">{result.stats.same}</p>
            </div>
            <div className="rounded border border-green-200 bg-green-50 p-3">
              <p className="text-green-700">{t("difftext_added")}</p>
              <p className="mt-1 text-xl font-bold text-green-800">{result.stats.added}</p>
            </div>
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-red-700">{t("difftext_removed")}</p>
              <p className="mt-1 text-xl font-bold text-red-800">{result.stats.removed}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setMode(DIFF_MODES.LINE)} className={`rounded px-4 py-2 text-sm font-medium ${mode === DIFF_MODES.LINE ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {t("difftext_line_mode")}
            </button>
            <button onClick={() => setMode(DIFF_MODES.WORD)} className={`rounded px-4 py-2 text-sm font-medium ${mode === DIFF_MODES.WORD ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {t("difftext_word_mode")}
            </button>
            <button onClick={() => setShowOnlyChanges((value) => !value)} className={`rounded px-4 py-2 text-sm font-medium ${showOnlyChanges ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {t("difftext_only_changes")}
            </button>
            <button onClick={() => goToDiff("prev")} disabled={diffCount === 0} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              {t("difftext_prev_diff")}
            </button>
            <button onClick={() => goToDiff("next")} disabled={diffCount === 0} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              {t("difftext_next_diff")}
            </button>
            <span className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {t("difftext_diff_position", { current: diffCount === 0 ? 0 : visibleActiveDiffIndex + 1, total: diffCount })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {copyStatus && <span className="text-sm text-green-700">{copyStatus}</span>}
            <button onClick={loadExample} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              {t("difftext_load_example")}
            </button>
            <button onClick={clearAll} disabled={!hasInput} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              {t("difftext_clear")}
            </button>
            <button onClick={copyReport} disabled={!hasInput} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300">
              {t("difftext_copy_report")}
            </button>
            <button onClick={downloadReport} disabled={!hasInput} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300">
              {t("difftext_download_report")}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DiffEditorPane ref={leftPaneRef} label={t("difftext_original_label")} value={leftText} onChange={setLeftText} placeholder={t("difftext_original_placeholder")} segments={annotatedSegments} side="left" showOnlyChanges={showOnlyChanges} activeDiffIndex={visibleActiveDiffIndex} onScrollSync={syncPaneScroll} />
          <DiffEditorPane ref={rightPaneRef} label={t("difftext_changed_label")} value={rightText} onChange={setRightText} placeholder={t("difftext_changed_placeholder")} segments={annotatedSegments} side="right" showOnlyChanges={showOnlyChanges} activeDiffIndex={visibleActiveDiffIndex} onScrollSync={syncPaneScroll} />
        </div>
      </section>
    </div>
  );
}
