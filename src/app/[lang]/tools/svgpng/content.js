"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { useI18n } from "@/app/i18n/client";
import {
  DEFAULT_SETTINGS,
  OUTPUT_FORMATS,
  SVGPNG_ACCEPT,
  clampNumber,
  getFileName,
  getMimeType,
  getSvgSize,
  makeSvgBlobUrl,
  validateSvg,
} from "./logic";

const EXAMPLES = {
  zh: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f8fafc"/>
  <circle cx="360" cy="315" r="180" fill="#2563eb"/>
  <rect x="560" y="190" width="420" height="250" rx="24" fill="#111827"/>
  <text x="600" y="330" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#fff">SVG to PNG</text>
</svg>`,
  en: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f8fafc"/>
  <circle cx="360" cy="315" r="180" fill="#2563eb"/>
  <rect x="560" y="190" width="420" height="250" rx="24" fill="#111827"/>
  <text x="600" y="330" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#fff">SVG to PNG</text>
</svg>`,
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = url;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas export failed"));
      },
      mimeType,
      quality
    );
  });
}

export default function SvgPngContent() {
  const { t, lang } = useI18n();
  const fileInputRef = useRef(null);
  const [svgText, setSvgText] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const validation = useMemo(() => validateSvg(svgText), [svgText]);
  const detectedSize = useMemo(() => getSvgSize(svgText), [svgText]);
  const outputWidth = clampNumber(settings.width, DEFAULT_SETTINGS.width, 1, 12000);
  const outputHeight = clampNumber(settings.height, DEFAULT_SETTINGS.height, 1, 12000);
  const outputScale = clampNumber(settings.scale, DEFAULT_SETTINGS.scale, 0.25, 6);
  const finalWidth = Math.round(outputWidth * outputScale);
  const finalHeight = Math.round(outputHeight * outputScale);

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setStatusMessage("");
  };

  useEffect(() => {
    if (!svgText.trim() || !validation.valid) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPreviewUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return makeSvgBlobUrl(svgText);
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [svgText, validation.valid]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearOutputs = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setPreviewUrl("");
    setResult(null);
  };

  const applyDetectedSize = () => {
    setSettings((current) => ({ ...current, width: detectedSize.width, height: detectedSize.height }));
  };

  const loadExample = () => {
    clearOutputs();
    setSvgText(EXAMPLES[lang] || EXAMPLES.en);
    setSettings((current) => ({ ...current, width: 1200, height: 630 }));
    setStatusMessage("");
  };

  const clearAll = () => {
    clearOutputs();
    setSvgText("");
    setStatusMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadSvg = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const size = getSvgSize(text);
    clearOutputs();
    setSvgText(text);
    setSettings((current) => ({ ...current, width: size.width, height: size.height }));
    setStatusMessage(t("svgpng_loaded_file", { name: file.name }));
  };

  const renderPreview = async () => {
    if (!validation.valid) {
      setStatusMessage(t("svgpng_invalid_svg"));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = makeSvgBlobUrl(svgText);
    setPreviewUrl(url);
    setStatusMessage(t("svgpng_preview_ready"));
  };

  const convertSvg = async () => {
    if (!validation.valid) {
      setStatusMessage(t("svgpng_invalid_svg"));
      return;
    }

    setIsProcessing(true);
    setStatusMessage(t("svgpng_converting"));
    try {
      const svgUrl = makeSvgBlobUrl(svgText);
      const image = await loadImage(svgUrl);
      URL.revokeObjectURL(svgUrl);

      const canvas = document.createElement("canvas");
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const context = canvas.getContext("2d");
      if (settings.outputFormat === OUTPUT_FORMATS.JPG || !settings.transparentBackground) {
        context.fillStyle = settings.backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const mimeType = getMimeType(settings.outputFormat);
      const blob = await canvasToBlob(canvas, mimeType, settings.quality);
      if (result?.url) URL.revokeObjectURL(result.url);
      const url = URL.createObjectURL(blob);
      setResult({ blob, url, name: getFileName(settings.outputFormat), size: blob.size, width: canvas.width, height: canvas.height });
      setStatusMessage(t("svgpng_done"));
    } catch (error) {
      console.error("SVG conversion failed:", error);
      setStatusMessage(t("svgpng_convert_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result?.blob) return;
    saveAs(result.blob, result.name);
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">{t("svgpng_workspace_title")}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("svgpng_workspace_hint")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                {t("svgpng_upload")}
              </button>
              <button onClick={loadExample} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                {t("svgpng_example")}
              </button>
              <button onClick={clearAll} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                {t("svgpng_clear")}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept={SVGPNG_ACCEPT} onChange={uploadSvg} className="hidden" />
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">{t("svgpng_input_label")}</span>
            <textarea
              value={svgText}
              onChange={(event) => {
                clearOutputs();
                setSvgText(event.target.value);
                setStatusMessage("");
              }}
              placeholder={t("svgpng_input_placeholder")}
              spellCheck={false}
              className="min-h-[360px] w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-6 text-gray-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">{t("svgpng_preview_title")}</h3>
                <button onClick={renderPreview} disabled={!svgText.trim()} className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-300">
                  {t("svgpng_preview")}
                </button>
              </div>
              <div className="mt-3 flex min-h-56 items-center justify-center overflow-auto rounded bg-white p-3">
                {previewUrl ? <img src={previewUrl} alt="SVG preview" className="max-h-72 max-w-full" /> : <p className="text-sm text-gray-500">{t("svgpng_no_preview")}</p>}
              </div>
            </section>

            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">{t("svgpng_result_title")}</h3>
                <button onClick={downloadResult} disabled={!result} className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300">
                  {t("svgpng_download")}
                </button>
              </div>
              <div className="mt-3 flex min-h-56 items-center justify-center overflow-auto rounded bg-white p-3">
                {result ? <img src={result.url} alt="Converted result" className="max-h-72 max-w-full" /> : <p className="text-sm text-gray-500">{t("svgpng_no_result")}</p>}
              </div>
              {result && <p className="mt-2 text-xs text-gray-500">{result.width} x {result.height} · {(result.size / 1024).toFixed(1)} KB</p>}
            </section>
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("svgpng_settings_title")}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{t("svgpng_settings_hint")}</p>

            <div className="mt-5 space-y-4 text-sm text-gray-700">
              <div className="rounded border border-blue-100 bg-blue-50 p-3 text-blue-800">
                {t("svgpng_detected_size", { width: detectedSize.width, height: detectedSize.height })}
                <button onClick={applyDetectedSize} className="ml-2 font-semibold underline">{t("svgpng_use_detected")}</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block font-medium">{t("svgpng_width")}</span>
                  <input type="number" min="1" max="12000" value={settings.width} onChange={(event) => updateSetting("width", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                </label>
                <label>
                  <span className="mb-1 block font-medium">{t("svgpng_height")}</span>
                  <input type="number" min="1" max="12000" value={settings.height} onChange={(event) => updateSetting("height", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 flex justify-between font-medium"><span>{t("svgpng_scale")}</span><span>{settings.scale}x</span></span>
                <input type="range" min="0.25" max="6" step="0.25" value={settings.scale} onChange={(event) => updateSetting("scale", Number(event.target.value))} className="w-full" />
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{t("svgpng_format")}</span>
                <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                  <option value={OUTPUT_FORMATS.PNG}>PNG</option>
                  <option value={OUTPUT_FORMATS.JPG}>JPG</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.transparentBackground} disabled={settings.outputFormat === OUTPUT_FORMATS.JPG} onChange={(event) => updateSetting("transparentBackground", event.target.checked)} />
                <span>{t("svgpng_transparent")}</span>
              </label>

              {(settings.outputFormat === OUTPUT_FORMATS.JPG || !settings.transparentBackground) && (
                <label className="block">
                  <span className="mb-1 block font-medium">{t("svgpng_background")}</span>
                  <input type="color" value={settings.backgroundColor} onChange={(event) => updateSetting("backgroundColor", event.target.value)} className="h-10 w-full rounded border border-gray-300" />
                </label>
              )}

              {settings.outputFormat === OUTPUT_FORMATS.JPG && (
                <label className="block">
                  <span className="mb-2 flex justify-between font-medium"><span>{t("svgpng_quality")}</span><span>{Math.round(settings.quality * 100)}%</span></span>
                  <input type="range" min="0.1" max="1" step="0.01" value={settings.quality} onChange={(event) => updateSetting("quality", Number(event.target.value))} className="w-full" />
                </label>
              )}

              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                {t("svgpng_final_size", { width: finalWidth, height: finalHeight })}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <button onClick={convertSvg} disabled={!svgText.trim() || isProcessing} className="w-full rounded bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
              {isProcessing ? t("svgpng_converting") : t("svgpng_convert")}
            </button>
            {statusMessage && <p className="mt-3 text-sm text-gray-600">{statusMessage}</p>}
            <p className="mt-4 text-xs leading-5 text-gray-500">{t("svgpng_browser_note")}</p>
          </section>
        </aside>
      </section>
    </div>
  );
}
