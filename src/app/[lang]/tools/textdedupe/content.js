"use client";

import { useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { useI18n } from "@/app/i18n/client";
import { DEFAULT_OPTIONS, dedupeLines, makeDedupeReport } from "./logic";

const EXAMPLES = {
  zh: "苹果\n香蕉\n 苹果 \n橙子\nbanana\nBANANA\n\n苹果\n公众号标题\n公众号标题\n小红书标题",
  en: "apple\nbanana\n apple \norange\nbanana\nBANANA\n\nAPI key\nAPI key\nProduct title",
};

function StatCard({ label, value }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

export default function TextDedupeContent() {
  const { t, lang } = useI18n();
  const fileInputRef = useRef(null);
  const [text, setText] = useState("");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [copyStatus, setCopyStatus] = useState("");

  const result = useMemo(() => dedupeLines(text, options), [options, text]);
  const hasText = text.length > 0;

  const updateOption = (key, value) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setCopyStatus("");
  };

  const loadExample = () => {
    setText(EXAMPLES[lang] || EXAMPLES.en);
    setCopyStatus("");
  };

  const clearText = () => {
    setText("");
    setCopyStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadTextFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setCopyStatus("");
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(result.output);
    setCopyStatus(t("textdedupe_copied"));
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(makeDedupeReport(result));
    setCopyStatus(t("textdedupe_report_copied"));
  };

  const downloadOutput = () => {
    saveAs(new Blob([result.output], { type: "text/plain;charset=utf-8" }), "deduped-lines.txt");
  };

  const downloadReport = () => {
    saveAs(new Blob([makeDedupeReport(result)], { type: "application/json;charset=utf-8" }), "text-dedupe-report.json");
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">{t("textdedupe_workspace_title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("textdedupe_workspace_hint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              {t("textdedupe_upload")}
            </button>
            <button onClick={loadExample} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              {t("textdedupe_example")}
            </button>
            <button onClick={clearText} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              {t("textdedupe_clear")}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".txt,.csv,.md,.json,.log,text/*,application/json" onChange={uploadTextFile} className="hidden" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">{t("textdedupe_input_label")}</span>
              <textarea
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setCopyStatus("");
                }}
                placeholder={t("textdedupe_input_placeholder")}
                className="min-h-[520px] w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-6 text-gray-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">{t("textdedupe_output_label")}</span>
              <textarea
                value={result.output}
                readOnly
                placeholder={t("textdedupe_output_placeholder")}
                className="min-h-[520px] w-full resize-y rounded border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm leading-6 text-gray-950 focus:outline-none"
              />
            </label>
          </div>

          <aside className="space-y-4">
            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("textdedupe_options_title")}</h3>
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={options.trimLines} onChange={(event) => updateOption("trimLines", event.target.checked)} />
                  <span>{t("textdedupe_trim_lines")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={options.removeEmptyLines} onChange={(event) => updateOption("removeEmptyLines", event.target.checked)} />
                  <span>{t("textdedupe_remove_empty")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={options.caseSensitive} onChange={(event) => updateOption("caseSensitive", event.target.checked)} />
                  <span>{t("textdedupe_case_sensitive")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={options.keepOrder} onChange={(event) => updateOption("keepOrder", event.target.checked)} />
                  <span>{t("textdedupe_keep_order")}</span>
                </label>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t("textdedupe_input_lines")} value={result.inputLineCount} />
              <StatCard label={t("textdedupe_output_lines")} value={result.outputLineCount} />
              <StatCard label={t("textdedupe_removed_lines")} value={result.removedLineCount} />
              <StatCard label={t("textdedupe_duplicate_groups")} value={result.duplicateGroupCount} />
            </div>

            <section className="rounded border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("textdedupe_duplicates_title")}</h3>
              {result.duplicateGroups.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">{t("textdedupe_no_duplicates")}</p>
              ) : (
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {result.duplicateGroups.slice(0, 20).map((group) => (
                    <div key={group.key} className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="min-w-0 truncate font-mono text-gray-900">{group.line || t("textdedupe_empty_line")}</span>
                        <strong className="text-red-700">x{group.count}</strong>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{t("textdedupe_line_numbers", { lines: group.lines.join(", ") })}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("textdedupe_export_title")}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={copyOutput} disabled={!hasText} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                  {t("textdedupe_copy_output")}
                </button>
                <button onClick={downloadOutput} disabled={!hasText} className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                  {t("textdedupe_download_output")}
                </button>
                <button onClick={copyReport} disabled={!hasText} className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300">
                  {t("textdedupe_copy_report")}
                </button>
                <button onClick={downloadReport} disabled={!hasText} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">
                  {t("textdedupe_download_report")}
                </button>
              </div>
              {copyStatus && <p className="mt-3 text-sm text-green-700">{copyStatus}</p>}
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
