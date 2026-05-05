"use client";

import { useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { useI18n } from "@/app/i18n/client";
import { SOCIAL_LIMITS, analyzeText, getLimitStatus, makeStatsReport } from "./logic";

const EXAMPLES = {
  zh: "这是一段用于字数统计的中文文案。它可以统计中文字符、英文 words、标点、段落和句子。\n\n如果你正在写小红书标题、公众号摘要、SEO 标题或产品介绍，可以把文本粘贴到这里，实时查看长度是否超出限制。",
  en: "This is a sample paragraph for word counting. It counts English words, characters, sentences, paragraphs, reading time, and common social media limits.\n\nPaste a blog intro, SEO title, product copy, or social post here to check whether the text fits your target channel.",
};

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function WordCountContent() {
  const { t, lang } = useI18n();
  const fileInputRef = useRef(null);
  const [text, setText] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const stats = useMemo(() => analyzeText(text), [text]);
  const hasText = text.trim().length > 0;

  const loadExample = () => {
    setText(EXAMPLES[lang] || EXAMPLES.en);
    setCopyStatus("");
  };

  const clearText = () => {
    setText("");
    setCopyStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(makeStatsReport(stats));
    setCopyStatus(t("wordcount_copied"));
  };

  const downloadReport = () => {
    saveAs(new Blob([makeStatsReport(stats)], { type: "application/json;charset=utf-8" }), "word-count-report.json");
  };

  const uploadTextFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setCopyStatus("");
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">{t("wordcount_workspace_title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("wordcount_workspace_hint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              {t("wordcount_upload")}
            </button>
            <button onClick={loadExample} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              {t("wordcount_example")}
            </button>
            <button onClick={clearText} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              {t("wordcount_clear")}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.yaml,.yml,text/*,application/json" onChange={uploadTextFile} className="hidden" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">{t("wordcount_input_label")}</span>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setCopyStatus("");
              }}
              placeholder={t("wordcount_placeholder")}
              className="min-h-[520px] w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm leading-6 text-gray-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <aside className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t("wordcount_mixed_words")} value={stats.mixedWordCount} hint={t("wordcount_mixed_words_hint")} />
              <StatCard label={t("wordcount_chars")} value={stats.chars} />
              <StatCard label={t("wordcount_chars_no_spaces")} value={stats.charsNoSpaces} />
              <StatCard label={t("wordcount_chinese_chars")} value={stats.chineseCharacters} />
              <StatCard label={t("wordcount_english_words")} value={stats.englishWords} />
              <StatCard label={t("wordcount_reading_time")} value={stats.readingMinutes ? t("wordcount_minutes", { count: stats.readingMinutes }) : "0"} />
            </div>

            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("wordcount_structure_title")}</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between gap-3"><span>{t("wordcount_paragraphs")}</span><strong>{stats.paragraphs}</strong></div>
                <div className="flex justify-between gap-3"><span>{t("wordcount_sentences")}</span><strong>{stats.sentences}</strong></div>
                <div className="flex justify-between gap-3"><span>{t("wordcount_lines")}</span><strong>{stats.lines}</strong></div>
                <div className="flex justify-between gap-3"><span>{t("wordcount_numbers")}</span><strong>{stats.numbers}</strong></div>
                <div className="flex justify-between gap-3"><span>{t("wordcount_punctuation")}</span><strong>{stats.punctuation}</strong></div>
                <div className="flex justify-between gap-3"><span>{t("wordcount_seconds")}</span><strong>{stats.readingSeconds}</strong></div>
              </div>
            </section>

            <section className="rounded border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("wordcount_limits_title")}</h3>
              <div className="mt-3 space-y-3">
                {SOCIAL_LIMITS.map((limit) => {
                  const status = getLimitStatus(stats, limit);
                  return (
                    <div key={limit.id}>
                      <div className="mb-1 flex justify-between gap-3 text-xs text-gray-600">
                        <span>{t(limit.labelKey)}</span>
                        <span className={status.exceeded ? "font-semibold text-red-700" : "text-gray-500"}>
                          {status.value} / {limit.limit}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-gray-100">
                        <div className={`h-full ${status.exceeded ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${status.percent}%` }} />
                      </div>
                      <p className={`mt-1 text-xs ${status.exceeded ? "text-red-700" : "text-gray-500"}`}>
                        {status.exceeded ? t("wordcount_exceeded", { count: Math.abs(status.remaining) }) : t("wordcount_remaining", { count: status.remaining })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("wordcount_export_title")}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={copyReport} disabled={!hasText} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                  {copyStatus || t("wordcount_copy_report")}
                </button>
                <button onClick={downloadReport} disabled={!hasText} className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                  {t("wordcount_download_report")}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
