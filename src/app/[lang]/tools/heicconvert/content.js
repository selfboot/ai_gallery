"use client";

import { useMemo, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  HEIC_OUTPUT_FORMATS,
  calculateChangePercent,
  formatFileSize,
  getMimeFromFormat,
  isHeicFile,
  makeConvertedFileName,
  makeUniqueFileName,
  makeZipName,
  summarizeResults,
} from "./logic";

const HEIC_ACCEPT = ".heic,.heif";

const DEFAULT_SETTINGS = {
  outputFormat: "jpeg",
  quality: 0.82,
  maxSide: 2560,
};

function makeFileId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function loadHeicInfo(file) {
  return {
    id: makeFileId(file),
    file,
    name: file.name,
    size: file.size,
    type: file.type || "image/heic",
  };
}

function getImageDimensions(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        previewUrl: url,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("converted image preview failed"));
    };
    image.src = url;
  });
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("converted image load failed"));
    };
    image.src = url;
  });
}

function getOutputSize(width, height, maxSide) {
  const limit = Number(maxSide);
  if (!Number.isFinite(limit) || limit <= 0 || Math.max(width, height) <= limit) {
    return { width, height };
  }

  const scale = limit / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas export failed"));
        }
      },
      mimeType,
      quality
    );
  });
}

async function compressConvertedBlob(blob, outputType, settings) {
  const { image, url } = await loadImageFromBlob(blob);
  const quality = clampNumber(settings.quality, DEFAULT_SETTINGS.quality, 0.45, 1);
  const nextSize = getOutputSize(image.naturalWidth, image.naturalHeight, settings.maxSide);
  const shouldReencode = outputType !== "image/png" || nextSize.width !== image.naturalWidth || nextSize.height !== image.naturalHeight;

  if (!shouldReencode) {
    URL.revokeObjectURL(url);
    return {
      blob,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  const flattenBackground = outputType === "image/jpeg";
  const canvas = document.createElement("canvas");
  canvas.width = nextSize.width;
  canvas.height = nextSize.height;
  const context = canvas.getContext("2d", { alpha: !flattenBackground });

  if (flattenBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  return {
    blob: await canvasToBlob(canvas, outputType, outputType === "image/png" ? undefined : quality),
    width: nextSize.width,
    height: nextSize.height,
  };
}

async function convertHeicFile(item, settings, usedNames) {
  const { default: heic2any } = await import("heic2any");
  const outputType = getMimeFromFormat(settings.outputFormat);
  const quality = clampNumber(settings.quality, DEFAULT_SETTINGS.quality, 0.45, 1);
  const converted = await heic2any({
    blob: item.file,
    toType: outputType,
    quality,
  });
  const rawBlob = Array.isArray(converted) ? converted[0] : converted;
  const compressed = await compressConvertedBlob(rawBlob, outputType, settings);
  const dimensions = await getImageDimensions(compressed.blob);

  return {
    id: item.id,
    name: item.name,
    outputName: makeUniqueFileName(makeConvertedFileName(item.name, settings.outputFormat), usedNames),
    originalSize: item.size,
    outputSize: compressed.blob.size,
    changePercent: calculateChangePercent(item.size, compressed.blob.size),
    width: compressed.width || dimensions.width,
    height: compressed.height || dimensions.height,
    outputType,
    outputFormat: settings.outputFormat,
    blob: compressed.blob,
    previewUrl: dimensions.previewUrl,
  };
}

export default function HeicConvertContent() {
  const { t } = useI18n();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const summary = useMemo(() => summarizeResults(results), [results]);
  const resultMap = useMemo(() => new Map(results.map((item) => [item.id, item])), [results]);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const clearResultUrls = (items) => {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setResults((current) => {
      clearResultUrls(current);
      return [];
    });
    setStatusMessage("");
  };

  const handleFileUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const uploaded = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = uploaded.filter((file) => {
      if (!isHeicFile(file)) {
        errors.push(`${file.name}: ${t("heicconvert_invalid_format")}`);
        return false;
      }
      if (files.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("heicconvert_file_exists")}`);
        return false;
      }
      return true;
    });

    if (errors.length > 0) {
      showModal(errors.join("\n"), "error");
    }
    if (validFiles.length === 0) {
      return;
    }

    setFiles((current) => [...current, ...validFiles.map(loadHeicInfo)]);
    setResults((current) => {
      clearResultUrls(current);
      return [];
    });
    setStatusMessage(t("heicconvert_files_added", { count: validFiles.length }));
  };

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setResults((current) => {
      clearResultUrls(current);
      return [];
    });
  };

  const clearAll = () => {
    clearResultUrls(results);
    setFiles([]);
    setResults([]);
    setProgressText("");
    setStatusMessage("");
  };

  const convertFiles = async () => {
    if (files.length === 0) {
      showModal(t("heicconvert_min_files_error"), "error");
      return;
    }

    setIsProcessing(true);
    setResults((current) => {
      clearResultUrls(current);
      return [];
    });
    setProgressText("");

    try {
      const nextResults = [];
      const usedNames = new Set();
      for (let index = 0; index < files.length; index += 1) {
        setProgressText(t("heicconvert_progress", { current: index + 1, total: files.length }));
        const result = await convertHeicFile(files[index], settings, usedNames);
        nextResults.push(result);
        setResults([...nextResults]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      setStatusMessage(t("heicconvert_success", { count: nextResults.length }));
    } catch (error) {
      console.error("HEIC conversion failed:", error);
      showModal(t("heicconvert_convert_error"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const downloadOne = (result) => {
    saveAs(result.blob, result.outputName);
  };

  const downloadAll = async () => {
    if (results.length === 0) {
      showModal(t("heicconvert_no_results"), "error");
      return;
    }

    const zip = new PizZip();
    for (const result of results) {
      zip.file(result.outputName, await result.blob.arrayBuffer());
    }
    const content = zip.generate({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    saveAs(content, makeZipName());
  };

  return (
    <div className="mx-auto mt-4 w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("heicconvert_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("heicconvert_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept={HEIC_ACCEPT} multiple onChange={handleFileUpload} title={t("heicconvert_upload_hint")} maxSize={80} className="min-h-32" />
            </div>
            {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("heicconvert_files_title", { count: files.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("heicconvert_files_hint")}</p>
              </div>
              {results.length > 0 && (
                <p className="text-sm text-gray-600">
                  {t("heicconvert_results_summary", {
                    original: formatFileSize(summary.originalSize),
                    output: formatFileSize(summary.outputSize),
                  })}
                </p>
              )}
            </div>

            {files.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("heicconvert_no_files")}</div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {files.map((item, index) => {
                  const result = resultMap.get(item.id);
                  return (
                    <div key={item.id} className="flex min-h-full flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-gray-50">
                        {result ? (
                          <img src={result.previewUrl} alt={item.name} className="h-full w-full object-contain" />
                        ) : (
                          <div className="px-3 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded bg-blue-50 text-sm font-bold text-blue-700">HEIC</div>
                            <p className="mt-2 text-xs text-gray-500">{t("heicconvert_preview_unavailable")}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="truncate text-sm font-medium text-gray-900" title={item.name}>{item.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatFileSize(item.size)}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded bg-gray-50 px-2 py-2">
                            <p className="text-gray-500">{t("heicconvert_original_size")}</p>
                            <p className="mt-1 font-semibold text-gray-900">{formatFileSize(item.size)}</p>
                          </div>
                          <div className="rounded bg-blue-50 px-2 py-2">
                            <p className="text-blue-700">{t("heicconvert_output_size")}</p>
                            <p className="mt-1 font-semibold text-blue-900">{result ? formatFileSize(result.outputSize) : "-"}</p>
                          </div>
                        </div>
                        {result && (
                          <div className="mt-3 space-y-1 text-xs text-gray-500">
                            <p>{t("heicconvert_output_dimensions", { width: result.width, height: result.height })}</p>
                            <p>{t("heicconvert_size_change", { value: result.changePercent })}</p>
                          </div>
                        )}
                        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                          <button onClick={() => result && downloadOne(result)} disabled={!result} className={`rounded px-3 py-2 text-sm font-medium ${result ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-gray-200 text-gray-500"}`}>
                            {t("heicconvert_download_one")}
                          </button>
                          <button onClick={() => removeFile(index)} disabled={isProcessing} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                            {t("heicconvert_delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("heicconvert_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("heicconvert_settings_hint")}</p>

            <div className="mt-5 space-y-5">
              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("heicconvert_output_format")}</span>
                <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  {HEIC_OUTPUT_FORMATS.map((format) => (
                    <option key={format} value={format}>{t(`heicconvert_format_${format}`)}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("heicconvert_quality", { value: Math.round(settings.quality * 100) })}</span>
                <input type="range" min="0.45" max="1" step="0.01" value={settings.quality} onChange={(event) => updateSetting("quality", Number(event.target.value))} className="w-full" disabled={settings.outputFormat === "png"} />
                {settings.outputFormat === "png" && <span className="mt-1 block text-xs text-gray-500">{t("heicconvert_png_hint")}</span>}
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("heicconvert_max_side")}</span>
                <select value={settings.maxSide} onChange={(event) => updateSetting("maxSide", Number(event.target.value))} className="w-full rounded border border-gray-300 px-3 py-2">
                  {[0, 3840, 2560, 1920, 1280].map((value) => (
                    <option key={value} value={value}>
                      {value === 0 ? t("heicconvert_max_side_original") : t("heicconvert_max_side_value", { value })}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                {settings.outputFormat === "jpeg" ? t("heicconvert_jpg_hint") : t("heicconvert_local_note")}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">{t("heicconvert_action_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("heicconvert_privacy_note")}</p>
            {progressText && <p className="mt-3 text-sm text-blue-700">{progressText}</p>}
            <div className="mt-4 flex flex-col gap-3">
              <button onClick={convertFiles} disabled={isProcessing || files.length === 0} className={`rounded px-5 py-3 font-medium text-white ${isProcessing || files.length === 0 ? "cursor-not-allowed bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                {isProcessing ? t("heicconvert_processing") : t("heicconvert_convert_button", { count: files.length })}
              </button>
              <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className={`rounded px-5 py-3 font-medium ${results.length === 0 || isProcessing ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-green-600 text-white hover:bg-green-700"}`}>
                {t("heicconvert_download_all")}
              </button>
              <button onClick={clearAll} disabled={isProcessing || files.length === 0} className={`rounded px-5 py-3 font-medium ${files.length === 0 || isProcessing ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
                {t("heicconvert_clear")}
              </button>
            </div>
          </section>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="whitespace-pre-line text-gray-700">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            {t("heicconvert_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
