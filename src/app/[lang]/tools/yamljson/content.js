"use client";

import { useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { useI18n } from "@/app/i18n/client";
import {
  INPUT_FORMATS,
  OUTPUT_FORMATS,
  YAML_JSON_ACCEPT,
  convertStructuredText,
  detectInputFormat,
  getDownloadName,
  getStats,
} from "./logic";

const EXAMPLES = {
  zh: `app:
  name: ai-gallery
  env: production
server:
  port: 3000
  cache: true
features:
  - yaml-json-convert
  - local-browser-processing
limits:
  uploadSizeMb: 10
`,
  en: `app:
  name: ai-gallery
  env: production
server:
  port: 3000
  cache: true
features:
  - yaml-json-convert
  - local-browser-processing
limits:
  uploadSizeMb: 10
`,
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function YamlJsonContent() {
  const { t, lang } = useI18n();
  const fileInputRef = useRef(null);
  const [inputText, setInputText] = useState("");
  const [inputFormat, setInputFormat] = useState(INPUT_FORMATS.AUTO);
  const [outputFormat, setOutputFormat] = useState(OUTPUT_FORMATS.AUTO);
  const [jsonIndent, setJsonIndent] = useState(2);
  const [yamlIndent, setYamlIndent] = useState(2);
  const [yamlLineWidth, setYamlLineWidth] = useState(120);
  const [compactJson, setCompactJson] = useState(false);
  const [sortKeys, setSortKeys] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [fileName, setFileName] = useState("");

  const options = useMemo(
    () => ({ jsonIndent, yamlIndent, yamlLineWidth, compactJson, sortKeys }),
    [compactJson, jsonIndent, sortKeys, yamlIndent, yamlLineWidth]
  );

  const result = useMemo(() => {
    if (!inputText.trim()) return { output: "", error: "", detectedFormat: INPUT_FORMATS.JSON, outputFormat: OUTPUT_FORMATS.JSON };
    try {
      const converted = convertStructuredText(inputText, inputFormat, outputFormat, options);
      return { output: converted.output, error: "", detectedFormat: converted.inputFormat, outputFormat: converted.outputFormat };
    } catch (error) {
      const detectedFormat = inputFormat === INPUT_FORMATS.AUTO ? detectInputFormat(inputText) : inputFormat;
      const fallbackOutputFormat = outputFormat === OUTPUT_FORMATS.AUTO ? (detectedFormat === INPUT_FORMATS.JSON ? OUTPUT_FORMATS.YAML : OUTPUT_FORMATS.JSON) : outputFormat;
      return { output: "", error: error?.message || t("yamljson_error_parse"), detectedFormat, outputFormat: fallbackOutputFormat };
    }
  }, [inputFormat, inputText, options, outputFormat, t]);

  const inputStats = useMemo(() => getStats(inputText), [inputText]);
  const outputStats = useMemo(() => getStats(result.output), [result.output]);
  const canUseOutput = Boolean(result.output && !result.error);

  const setYamlToJson = () => {
    setInputFormat(INPUT_FORMATS.YAML);
    setOutputFormat(OUTPUT_FORMATS.JSON);
    setCopyStatus("");
  };

  const setJsonToYaml = () => {
    setInputFormat(INPUT_FORMATS.JSON);
    setOutputFormat(OUTPUT_FORMATS.YAML);
    setCopyStatus("");
  };

  const loadExample = () => {
    setInputText(EXAMPLES[lang] || EXAMPLES.en);
    setInputFormat(INPUT_FORMATS.YAML);
    setOutputFormat(OUTPUT_FORMATS.AUTO);
    setFileName("example.yaml");
    setCopyStatus("");
  };

  const clearAll = () => {
    setInputText("");
    setFileName("");
    setCopyStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setInputText(text);
    setFileName(file.name);
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".json")) {
      setInputFormat(INPUT_FORMATS.JSON);
    } else if (lowerName.endsWith(".yaml") || lowerName.endsWith(".yml")) {
      setInputFormat(INPUT_FORMATS.YAML);
    } else {
      setInputFormat(INPUT_FORMATS.AUTO);
    }
    setOutputFormat(OUTPUT_FORMATS.AUTO);
    setCopyStatus("");
  };

  const copyOutput = async () => {
    if (!canUseOutput) return;
    await navigator.clipboard.writeText(result.output);
    setCopyStatus(t("yamljson_copied"));
  };

  const downloadOutput = () => {
    if (!canUseOutput) return;
    saveAs(new Blob([result.output], { type: "text/plain;charset=utf-8" }), getDownloadName(result.outputFormat));
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">{t("yamljson_workspace_title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("yamljson_workspace_hint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={setYamlToJson} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              YAML → JSON
            </button>
            <button onClick={setJsonToYaml} className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
              JSON → YAML
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-gray-700">
                <span>{t("yamljson_input_label")}</span>
                <span className="text-xs font-normal text-gray-500">{fileName || t("yamljson_no_file")}</span>
              </span>
              <textarea
                value={inputText}
                onChange={(event) => {
                  setInputText(event.target.value);
                  setCopyStatus("");
                }}
                spellCheck={false}
                placeholder={t("yamljson_input_placeholder")}
                className="min-h-[520px] w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-6 text-gray-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-gray-700">
                <span>{t("yamljson_output_label")}</span>
                <span className={`text-xs font-normal ${result.error ? "text-red-600" : "text-gray-500"}`}>
                  {result.error ? t("yamljson_invalid") : t("yamljson_valid")}
                </span>
              </span>
              <textarea
                value={result.error ? result.error : result.output}
                readOnly
                spellCheck={false}
                placeholder={t("yamljson_output_placeholder")}
                className={`min-h-[520px] w-full resize-y rounded border px-3 py-2 font-mono text-sm leading-6 focus:outline-none ${
                  result.error ? "border-red-300 bg-red-50 text-red-800" : "border-gray-300 bg-gray-50 text-gray-950"
                }`}
              />
            </label>
          </div>

          <aside className="space-y-4">
            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("yamljson_settings_title")}</h3>
              <div className="mt-4 space-y-4 text-sm text-gray-700">
                <label className="block">
                  <span className="mb-1 block font-medium">{t("yamljson_input_format")}</span>
                  <select value={inputFormat} onChange={(event) => setInputFormat(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                    <option value={INPUT_FORMATS.AUTO}>{t("yamljson_auto_detect")}</option>
                    <option value={INPUT_FORMATS.YAML}>YAML</option>
                    <option value={INPUT_FORMATS.JSON}>JSON</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block font-medium">{t("yamljson_output_format")}</span>
                  <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                    <option value={OUTPUT_FORMATS.AUTO}>{t("yamljson_auto_reverse")}</option>
                    <option value={OUTPUT_FORMATS.JSON}>JSON</option>
                    <option value={OUTPUT_FORMATS.YAML}>YAML</option>
                  </select>
                </label>

                {result.outputFormat === OUTPUT_FORMATS.JSON ? (
                  <>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={compactJson} onChange={(event) => setCompactJson(event.target.checked)} />
                      <span>{t("yamljson_compact_json")}</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-medium">{t("yamljson_json_indent")}</span>
                      <select disabled={compactJson} value={jsonIndent} onChange={(event) => setJsonIndent(Number(event.target.value))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100">
                        <option value={2}>2</option>
                        <option value={4}>4</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-1 block font-medium">{t("yamljson_yaml_indent")}</span>
                      <select value={yamlIndent} onChange={(event) => setYamlIndent(Number(event.target.value))} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                        <option value={2}>2</option>
                        <option value={4}>4</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-medium">{t("yamljson_line_width")}</span>
                      <input type="number" min="40" max="240" value={yamlLineWidth} onChange={(event) => setYamlLineWidth(Number(event.target.value) || 120)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" />
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={sortKeys} onChange={(event) => setSortKeys(event.target.checked)} />
                      <span>{t("yamljson_sort_keys")}</span>
                    </label>
                  </>
                )}
              </div>
            </section>

            <section className="rounded border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("yamljson_actions_title")}</h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  {t("yamljson_upload")}
                </button>
                <button onClick={loadExample} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  {t("yamljson_example")}
                </button>
                <button onClick={copyOutput} disabled={!canUseOutput} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                  {copyStatus || t("yamljson_copy")}
                </button>
                <button onClick={downloadOutput} disabled={!canUseOutput} className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                  {t("yamljson_download")}
                </button>
                <button onClick={clearAll} className="col-span-2 rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                  {t("yamljson_clear")}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept={YAML_JSON_ACCEPT} onChange={handleFile} className="hidden" />
            </section>

            <section className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <h3 className="text-sm font-semibold text-gray-900">{t("yamljson_status_title")}</h3>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between gap-3"><span>{t("yamljson_detected")}</span><strong>{result.detectedFormat?.toUpperCase()}</strong></div>
                <div className="flex justify-between gap-3"><span>{t("yamljson_output_format")}</span><strong>{result.outputFormat?.toUpperCase()}</strong></div>
                <div className="flex justify-between gap-3"><span>{t("yamljson_input_stats")}</span><strong>{inputStats.lines} / {formatBytes(inputStats.bytes)}</strong></div>
                <div className="flex justify-between gap-3"><span>{t("yamljson_output_stats")}</span><strong>{outputStats.lines} / {formatBytes(outputStats.bytes)}</strong></div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
