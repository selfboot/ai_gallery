"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { useI18n } from "@/app/i18n/client";
import { compareNormalizedCsv, createCsvDiffReport, CSV_DELIMITER_OPTIONS, parseCsvInput } from "./logic";

const EXAMPLES = {
  zh: {
    left: "sku,name,price,status\nA100,Water Bottle,39,on\nA101,Desk Lamp,129,on\nA102,Notebook,19,off",
    right: "sku,name,price,status\nA100,Water Bottle,42,on\nA101,Desk Lamp,129,off\nA103,Mouse Pad,25,on",
  },
  en: {
    left: "sku,name,price,status\nA100,Water Bottle,39,on\nA101,Desk Lamp,129,on\nA102,Notebook,19,off",
    right: "sku,name,price,status\nA100,Water Bottle,42,on\nA101,Desk Lamp,129,off\nA103,Mouse Pad,25,on",
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
  if (segment.type === "remove" && side === "left") return `bg-red-100 text-red-950${activeClass}`;
  if (segment.type === "add" && side === "right") return `bg-green-100 text-green-950${activeClass}`;
  return "text-gray-900";
}

function HighlightedCsv({ segments, side, placeholder, activeDiffIndex }) {
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

const PreviewPane = forwardRef(function PreviewPane({ label, meta, placeholder, segments, side, showOnlyChanges, activeDiffIndex, onScrollSync }, ref) {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setScroll(scrollTop, scrollLeft) {
      if (!containerRef.current) return;
      containerRef.current.scrollTop = scrollTop;
      containerRef.current.scrollLeft = scrollLeft;
    },
    scrollToDiff(diffIndex) {
      const target = containerRef.current?.querySelector(`[data-diff-index="${diffIndex}"]`);
      if (!target || !containerRef.current) return false;
      containerRef.current.scrollTop = Math.max(target.offsetTop - 72, 0);
      return true;
    },
  }));

  const handleScroll = (event) => {
    onScrollSync?.(side, event.currentTarget.scrollTop, event.currentTarget.scrollLeft);
  };

  const visibleSegments = visibleSideSegments(segments, side, showOnlyChanges);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">{meta}</span>
      </div>
      <pre ref={containerRef} onScroll={handleScroll} className="min-h-[420px] overflow-auto rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-6 whitespace-pre-wrap break-words">
        <HighlightedCsv segments={visibleSegments} side={side} placeholder={placeholder} activeDiffIndex={activeDiffIndex} />
      </pre>
    </div>
  );
});

function statusTone(state) {
  if (state.empty) return "bg-gray-100 text-gray-600";
  if (state.ok) return "bg-green-100 text-green-800";
  return "bg-red-100 text-red-800";
}

function delimiterLabelKey(delimiter) {
  if (delimiter === "comma") return "csvdiff_delimiter_comma";
  if (delimiter === "tab") return "csvdiff_delimiter_tab";
  if (delimiter === "semicolon") return "csvdiff_delimiter_semicolon";
  if (delimiter === "pipe") return "csvdiff_delimiter_pipe";
  return "csvdiff_delimiter_auto";
}

export default function CsvDiffContent() {
  const { t, lang } = useI18n();
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [leftPaneMode, setLeftPaneMode] = useState("edit");
  const [rightPaneMode, setRightPaneMode] = useState("edit");
  const [delimiter, setDelimiter] = useState("auto");
  const [hasHeader, setHasHeader] = useState(true);
  const [trimCells, setTrimCells] = useState(true);
  const [skipEmptyRows, setSkipEmptyRows] = useState(true);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [activeDiffIndex, setActiveDiffIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const leftPaneRef = useRef(null);
  const rightPaneRef = useRef(null);
  const leftFileInputRef = useRef(null);
  const rightFileInputRef = useRef(null);
  const syncLockRef = useRef(false);

  const options = useMemo(() => ({ delimiter, hasHeader, trimCells, skipEmptyRows }), [delimiter, hasHeader, trimCells, skipEmptyRows]);
  const leftState = useMemo(() => parseCsvInput(leftText, options), [leftText, options]);
  const rightState = useMemo(() => parseCsvInput(rightText, options), [rightText, options]);
  const result = useMemo(() => compareNormalizedCsv(leftState, rightState), [leftState, rightState]);
  const annotatedSegments = useMemo(() => annotateDiffGroups(result.segments), [result.segments]);
  const diffCount = useMemo(() => annotatedSegments.reduce((maxIndex, segment) => (segment.diffIndex === null ? maxIndex : Math.max(maxIndex, segment.diffIndex + 1)), 0), [annotatedSegments]);
  const visibleActiveDiffIndex = diffCount > 0 ? Math.min(activeDiffIndex, diffCount - 1) : null;
  const hasInput = leftText.trim().length > 0 || rightText.trim().length > 0;
  const canCompare = leftState.ok && rightState.ok;

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
    setLeftPaneMode("preview");
    setRightPaneMode("preview");
    setActiveDiffIndex(0);
    setCopyStatus("");
  };

  const clearAll = () => {
    setLeftText("");
    setRightText("");
    setLeftPaneMode("edit");
    setRightPaneMode("edit");
    setActiveDiffIndex(0);
    setCopyStatus("");
  };

  const formatBoth = () => {
    if (leftState.ok) setLeftText(leftState.normalizedText);
    if (rightState.ok) setRightText(rightState.normalizedText);
  };

  const switchBothToEdit = () => {
    setLeftPaneMode("edit");
    setRightPaneMode("edit");
  };

  const switchBothToPreview = () => {
    if (!canCompare) return;
    setLeftPaneMode("preview");
    setRightPaneMode("preview");
  };

  const copyReport = async () => {
    const report = createCsvDiffReport(leftState, rightState, result, options);
    await navigator.clipboard.writeText(report);
    setCopyStatus(t("csvdiff_copied"));
  };

  const downloadReport = () => {
    const report = createCsvDiffReport(leftState, rightState, result, options);
    saveAs(new Blob([report], { type: "text/plain;charset=utf-8" }), "csv-diff-report.txt");
  };

  const loadFile = async (side, file) => {
    if (!file) return;
    const text = await file.text();
    if (side === "left") {
      setLeftText(text);
    } else {
      setRightText(text);
    }
    setCopyStatus("");
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">{t("csvdiff_workspace_title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("csvdiff_workspace_hint")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded border border-gray-200 p-3">
              <p className="text-gray-500">{t("csvdiff_same")}</p>
              <p className="mt-1 text-xl font-bold text-gray-950">{result.stats.same}</p>
            </div>
            <div className="rounded border border-green-200 bg-green-50 p-3">
              <p className="text-green-700">{t("csvdiff_added")}</p>
              <p className="mt-1 text-xl font-bold text-green-800">{result.stats.added}</p>
            </div>
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-red-700">{t("csvdiff_removed")}</p>
              <p className="mt-1 text-xl font-bold text-red-800">{result.stats.removed}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowOnlyChanges((value) => !value)} className={`rounded px-4 py-2 text-sm font-medium ${showOnlyChanges ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {t("csvdiff_only_changes")}
            </button>
            <button onClick={() => goToDiff("prev")} disabled={diffCount === 0} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              {t("csvdiff_prev_diff")}
            </button>
            <button onClick={() => goToDiff("next")} disabled={diffCount === 0} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              {t("csvdiff_next_diff")}
            </button>
            <span className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {t("csvdiff_diff_position", { current: diffCount === 0 ? 0 : visibleActiveDiffIndex + 1, total: diffCount })}
            </span>
          </div>

            <div className="flex flex-wrap items-center gap-2">
              {copyStatus && <span className="text-sm text-green-700">{copyStatus}</span>}
              <button onClick={formatBoth} disabled={!leftState.ok && !rightState.ok} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                {t("csvdiff_format")}
              </button>
              <button onClick={loadExample} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                {t("csvdiff_load_example")}
              </button>
              <button onClick={clearAll} disabled={!hasInput} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                {t("csvdiff_clear")}
              </button>
              <button onClick={copyReport} disabled={!canCompare} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300">
                {t("csvdiff_copy_report")}
              </button>
              <button onClick={downloadReport} disabled={!canCompare} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300">
                {t("csvdiff_download_report")}
              </button>
              <button onClick={switchBothToEdit} className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                {t("csvdiff_global_edit")}
              </button>
              <button onClick={switchBothToPreview} disabled={!canCompare} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300">
                {t("csvdiff_global_compare")}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <select value={delimiter} onChange={(event) => setDelimiter(event.target.value)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
              {Object.keys(CSV_DELIMITER_OPTIONS).map((key) => (
                <option key={key} value={key}>
                  {t(delimiterLabelKey(key))}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={hasHeader} onChange={() => setHasHeader((value) => !value)} />
              <span>{t("csvdiff_has_header")}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={trimCells} onChange={() => setTrimCells((value) => !value)} />
              <span>{t("csvdiff_trim_cells")}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={skipEmptyRows} onChange={() => setSkipEmptyRows((value) => !value)} />
              <span>{t("csvdiff_skip_empty_rows")}</span>
            </label>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-700">{t("csvdiff_left_label")}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => leftFileInputRef.current?.click()} className="rounded bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50">
                  {t("csvdiff_upload_left")}
                </button>
                <input ref={leftFileInputRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden" onChange={(event) => loadFile("left", event.target.files?.[0])} />
                <div className="inline-flex rounded-md border border-gray-200 bg-white p-1 text-xs">
                  <button onClick={() => setLeftPaneMode("edit")} className={`rounded px-2.5 py-1 font-medium ${leftPaneMode === "edit" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                    {t("csvdiff_mode_edit")}
                  </button>
                  <button onClick={() => setLeftPaneMode("preview")} disabled={!canCompare} className={`rounded px-2.5 py-1 font-medium ${leftPaneMode === "preview" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"} disabled:cursor-not-allowed disabled:opacity-50`}>
                    {t("csvdiff_mode_compare")}
                  </button>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(leftState)}`}>{leftState.empty ? t("csvdiff_empty_status") : leftState.ok ? t("csvdiff_valid_status") : t("csvdiff_invalid_status")}</span>
              </div>
            </div>
            {leftPaneMode === "edit" ? (
              <textarea value={leftText} onChange={(event) => { setLeftText(event.target.value); setCopyStatus(""); }} spellCheck={false} placeholder={t("csvdiff_left_placeholder")} className="min-h-[420px] w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-6 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            ) : (
              <PreviewPane ref={leftPaneRef} label={t("csvdiff_left_preview")} meta={`${t("csvdiff_columns", { count: leftState.columnCount })} · ${t("csvdiff_rows", { count: leftState.rowCount })}`} placeholder={canCompare ? t("csvdiff_no_left_preview") : t("csvdiff_empty_result")} segments={annotatedSegments} side="left" showOnlyChanges={showOnlyChanges} activeDiffIndex={visibleActiveDiffIndex} onScrollSync={syncPaneScroll} />
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{t("csvdiff_rows", { count: leftState.rowCount })}</span>
              <span>{t("csvdiff_data_rows", { count: leftState.dataRowCount })}</span>
              <span>{t("csvdiff_columns", { count: leftState.columnCount })}</span>
              <span>{t("csvdiff_delimiter_detected", { delimiter: leftState.delimiterLabel })}</span>
            </div>
            {!leftState.empty && !leftState.ok && <p className="mt-2 text-sm text-red-700">{t("csvdiff_error_prefix")}: {leftState.error}</p>}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-700">{t("csvdiff_right_label")}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => rightFileInputRef.current?.click()} className="rounded bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50">
                  {t("csvdiff_upload_right")}
                </button>
                <input ref={rightFileInputRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden" onChange={(event) => loadFile("right", event.target.files?.[0])} />
                <div className="inline-flex rounded-md border border-gray-200 bg-white p-1 text-xs">
                  <button onClick={() => setRightPaneMode("edit")} className={`rounded px-2.5 py-1 font-medium ${rightPaneMode === "edit" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                    {t("csvdiff_mode_edit")}
                  </button>
                  <button onClick={() => setRightPaneMode("preview")} disabled={!canCompare} className={`rounded px-2.5 py-1 font-medium ${rightPaneMode === "preview" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"} disabled:cursor-not-allowed disabled:opacity-50`}>
                    {t("csvdiff_mode_compare")}
                  </button>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(rightState)}`}>{rightState.empty ? t("csvdiff_empty_status") : rightState.ok ? t("csvdiff_valid_status") : t("csvdiff_invalid_status")}</span>
              </div>
            </div>
            {rightPaneMode === "edit" ? (
              <textarea value={rightText} onChange={(event) => { setRightText(event.target.value); setCopyStatus(""); }} spellCheck={false} placeholder={t("csvdiff_right_placeholder")} className="min-h-[420px] w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-6 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            ) : (
              <PreviewPane ref={rightPaneRef} label={t("csvdiff_right_preview")} meta={`${t("csvdiff_columns", { count: rightState.columnCount })} · ${t("csvdiff_rows", { count: rightState.rowCount })}`} placeholder={canCompare ? t("csvdiff_no_right_preview") : t("csvdiff_empty_result")} segments={annotatedSegments} side="right" showOnlyChanges={showOnlyChanges} activeDiffIndex={visibleActiveDiffIndex} onScrollSync={syncPaneScroll} />
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{t("csvdiff_rows", { count: rightState.rowCount })}</span>
              <span>{t("csvdiff_data_rows", { count: rightState.dataRowCount })}</span>
              <span>{t("csvdiff_columns", { count: rightState.columnCount })}</span>
              <span>{t("csvdiff_delimiter_detected", { delimiter: rightState.delimiterLabel })}</span>
            </div>
            {!rightState.empty && !rightState.ok && <p className="mt-2 text-sm text-red-700">{t("csvdiff_error_prefix")}: {rightState.error}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
