"use client";

import { useMemo, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  OUTPUT_FORMATS,
  TARGET_SIZE_UNITS,
  bytesFromTarget,
  calculateSaving,
  formatFileSize,
  getMimeFromOutputFormat,
  getScaledDimensions,
  makeOutputFileName,
  makeZipName,
  summarizeResults,
} from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEFAULT_SETTINGS = {
  targetValue: 200,
  targetUnit: "KB",
  outputFormat: "auto",
  keepOriginalIfSmaller: true,
};

function makeImageId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function revokeResults(items) {
  items.forEach((item) => {
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
}

function loadImageInfo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        id: makeImageId(file),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        width: image.naturalWidth,
        height: image.naturalHeight,
        previewUrl: url,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    image.src = url;
  });
}

async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try {
    if ("createImageBitmap" in window) {
      return await createImageBitmap(file);
    }

    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
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

function drawToCanvas(image, width, height, mimeType) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const flattenBackground = mimeType === "image/jpeg";
  const context = canvas.getContext("2d", { alpha: !flattenBackground });
  if (flattenBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

async function findClosestBlob(canvas, mimeType, targetBytes) {
  if (mimeType === "image/png") {
    const blob = await canvasToBlob(canvas, mimeType);
    return { blob, quality: null };
  }

  let low = 0.34;
  let high = 0.96;
  let bestUnder = null;
  let smallestOver = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const quality = Number(((low + high) / 2).toFixed(3));
    const blob = await canvasToBlob(canvas, mimeType, quality);
    const candidate = { blob, quality };

    if (blob.size <= targetBytes) {
      bestUnder = !bestUnder || blob.size > bestUnder.blob.size ? candidate : bestUnder;
      low = quality;
    } else {
      smallestOver = !smallestOver || blob.size < smallestOver.blob.size ? candidate : smallestOver;
      high = quality;
    }
  }

  return bestUnder || smallestOver || { blob: await canvasToBlob(canvas, mimeType, 0.72), quality: 0.72 };
}

async function compressToTarget(item, settings) {
  const targetBytes = bytesFromTarget(settings.targetValue, settings.targetUnit);
  if (settings.keepOriginalIfSmaller && item.size <= targetBytes) {
    return {
      id: item.id,
      outputName: item.name,
      originalSize: item.size,
      outputSize: item.size,
      savingPercent: 0,
      width: item.width,
      height: item.height,
      outputType: item.type,
      blob: item.file,
      keptOriginal: true,
      reachedTarget: true,
      quality: null,
    };
  }

  const mimeType = getMimeFromOutputFormat(settings.outputFormat, item.type);
  const image = await fileToImage(item.file);
  let width = item.width;
  let height = item.height;
  let best = null;

  try {
    for (let round = 0; round < 6; round += 1) {
      const canvas = drawToCanvas(image, width, height, mimeType);
      const candidate = await findClosestBlob(canvas, mimeType, targetBytes);
      const result = {
        blob: candidate.blob,
        quality: candidate.quality,
        width,
        height,
        outputType: mimeType,
      };

      if (!best || Math.abs(candidate.blob.size - targetBytes) < Math.abs(best.blob.size - targetBytes) || candidate.blob.size < best.blob.size) {
        best = result;
      }

      if (candidate.blob.size <= targetBytes) {
        best = result;
        break;
      }

      if (width <= 280 || height <= 280) {
        break;
      }

      const ratio = Math.sqrt(targetBytes / candidate.blob.size);
      const scale = Math.max(0.62, Math.min(ratio * 0.97, 0.9));
      const nextSize = getScaledDimensions(width, height, scale);
      if (nextSize.width === width && nextSize.height === height) {
        break;
      }
      width = nextSize.width;
      height = nextSize.height;
    }
  } finally {
    if (typeof image.close === "function") {
      image.close();
    }
  }

  const keepOriginal = settings.keepOriginalIfSmaller && item.size <= best.blob.size;
  const outputBlob = keepOriginal ? item.file : best.blob;
  const outputType = keepOriginal ? item.type : best.outputType;

  return {
    id: item.id,
    outputName: keepOriginal ? item.name : makeOutputFileName(item.name, outputType),
    originalSize: item.size,
    outputSize: outputBlob.size,
    savingPercent: calculateSaving(item.size, outputBlob.size),
    width: keepOriginal ? item.width : best.width,
    height: keepOriginal ? item.height : best.height,
    outputType,
    blob: outputBlob,
    keptOriginal: keepOriginal,
    reachedTarget: outputBlob.size <= targetBytes,
    quality: keepOriginal ? null : best.quality,
  };
}

export default function ImageSizeConvertContent() {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const summary = useMemo(() => summarizeResults(results), [results]);
  const targetBytes = useMemo(
    () => bytesFromTarget(clampNumber(settings.targetValue, DEFAULT_SETTINGS.targetValue, 1, 500), settings.targetUnit),
    [settings.targetUnit, settings.targetValue]
  );

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const clearResults = () => {
    revokeResults(results);
    setResults([]);
  };

  const handleFileUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t("imagesizeconvert_invalid_format")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("imagesizeconvert_file_exists")}`);
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

    setIsProcessing(true);
    try {
      const loadedImages = await Promise.all(validFiles.map(loadImageInfo));
      clearResults();
      setImages((current) => [...current, ...loadedImages]);
      setStatusMessage(t("imagesizeconvert_files_added", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imagesizeconvert_read_error"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (index) => {
    setImages((current) => {
      const target = current[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
    clearResults();
  };

  const clearAll = () => {
    images.forEach((item) => {
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    clearResults();
    setImages([]);
    setProgressText("");
    setStatusMessage("");
  };

  const processImages = async () => {
    if (images.length === 0) {
      showModal(t("imagesizeconvert_min_files_error"), "error");
      return;
    }

    setIsProcessing(true);
    clearResults();
    setProgressText("");

    try {
      const nextResults = [];
      for (let index = 0; index < images.length; index += 1) {
        setProgressText(t("imagesizeconvert_progress", { current: index + 1, total: images.length }));
        const processed = await compressToTarget(images[index], settings);
        const previewUrl = URL.createObjectURL(processed.blob);
        nextResults.push({ ...processed, previewUrl });
        setResults([...nextResults]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      setStatusMessage(t("imagesizeconvert_success", { count: nextResults.length }));
    } catch (error) {
      console.error("Target size conversion failed:", error);
      showModal(t("imagesizeconvert_process_error"), "error");
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
      showModal(t("imagesizeconvert_no_results"), "error");
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
            <h2 className="text-xl font-semibold text-gray-950">{t("imagesizeconvert_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagesizeconvert_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept={IMAGE_ACCEPT} multiple onChange={handleFileUpload} title={t("imagesizeconvert_upload_hint")} maxSize={60} className="min-h-32" />
            </div>
            {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagesizeconvert_images_title", { count: images.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("imagesizeconvert_images_hint")}</p>
              </div>
              {results.length > 0 && (
                <p className="text-sm text-gray-600">
                  {t("imagesizeconvert_results_summary", {
                    original: formatFileSize(summary.originalSize),
                    output: formatFileSize(summary.outputSize),
                  })}
                </p>
              )}
            </div>

            {images.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("imagesizeconvert_no_files")}</div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {images.map((item, index) => {
                  const result = results.find((entry) => entry.id === item.id);
                  return (
                    <div key={item.id} className="flex min-h-full flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                        <img src={result?.previewUrl || item.previewUrl} alt={item.name} className="h-full w-full object-contain" />
                        {result && (
                          <span className={`absolute right-2 top-2 rounded px-2 py-1 text-[11px] font-semibold ${result.reachedTarget ? "bg-green-600 text-white" : "bg-amber-500 text-white"}`}>
                            {result.reachedTarget ? t("imagesizeconvert_target_hit") : t("imagesizeconvert_target_close")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="truncate text-sm font-medium text-gray-900" title={item.name}>{item.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.width} × {item.height}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded bg-gray-50 px-2 py-2">
                            <p className="text-gray-500">{t("imagesizeconvert_original_size")}</p>
                            <p className="mt-1 font-semibold text-gray-900">{formatFileSize(item.size)}</p>
                          </div>
                          <div className="rounded bg-blue-50 px-2 py-2">
                            <p className="text-blue-700">{t("imagesizeconvert_output_size")}</p>
                            <p className="mt-1 font-semibold text-blue-900">{result ? formatFileSize(result.outputSize) : "-"}</p>
                          </div>
                        </div>
                        {result && (
                          <div className="mt-3 space-y-1 text-xs text-gray-500">
                            <p>{t("imagesizeconvert_output_dimensions", { width: result.width, height: result.height })}</p>
                            <p>{t("imagesizeconvert_saved_percent", { value: result.savingPercent })}</p>
                            {result.keptOriginal && <p className="inline-block rounded bg-yellow-50 px-2 py-0.5 text-yellow-700">{t("imagesizeconvert_kept_original")}</p>}
                          </div>
                        )}
                        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                          <button onClick={() => result && downloadOne(result)} disabled={!result} className={`rounded px-3 py-2 text-sm font-medium ${result ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-gray-200 text-gray-500"}`}>
                            {t("imagesizeconvert_download_one")}
                          </button>
                          <button onClick={() => removeImage(index)} disabled={isProcessing} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                            {t("imagesizeconvert_delete")}
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
            <h2 className="text-xl font-semibold text-gray-950">{t("imagesizeconvert_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagesizeconvert_settings_hint")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 block font-medium">{t("imagesizeconvert_target_value_label")}</span>
                  <input type="number" min="1" max="500" step="1" value={settings.targetValue} onChange={(event) => updateSetting("targetValue", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                </label>
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 block font-medium">{t("imagesizeconvert_target_unit_label")}</span>
                  <select value={settings.targetUnit} onChange={(event) => updateSetting("targetUnit", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                    {TARGET_SIZE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imagesizeconvert_output_format")}</span>
                <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  {Object.keys(OUTPUT_FORMATS).map((format) => (
                    <option key={format} value={format}>{t(OUTPUT_FORMATS[format].labelKey)}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={settings.keepOriginalIfSmaller} onChange={(event) => updateSetting("keepOriginalIfSmaller", event.target.checked)} className="mt-1" />
                <span>{t("imagesizeconvert_keep_original_if_smaller")}</span>
              </label>
            </div>

            <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="font-medium text-gray-900">{t("imagesizeconvert_summary_title")}</div>
              <dl className="mt-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("imagesizeconvert_target_summary_label")}</dt>
                  <dd>{settings.targetValue} {settings.targetUnit}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("imagesizeconvert_output_format")}</dt>
                  <dd>{t(OUTPUT_FORMATS[settings.outputFormat].labelKey)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("imagesizeconvert_target_bytes_label")}</dt>
                  <dd>{formatFileSize(targetBytes)}</dd>
                </div>
              </dl>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">{t("imagesizeconvert_settings_note")}</p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">{t("imagesizeconvert_action_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagesizeconvert_privacy_note")}</p>
            {progressText && <p className="mt-3 text-sm text-blue-700">{progressText}</p>}

            <div className="mt-4 flex flex-col gap-3">
              <button onClick={processImages} disabled={isProcessing || images.length === 0} className={`rounded px-5 py-3 font-medium text-white ${isProcessing || images.length === 0 ? "cursor-not-allowed bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                {isProcessing ? t("imagesizeconvert_processing") : t("imagesizeconvert_process_button", { count: images.length })}
              </button>
              <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className={`rounded px-5 py-3 font-medium ${results.length === 0 || isProcessing ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-green-600 text-white hover:bg-green-700"}`}>
                {t("imagesizeconvert_download_all")}
              </button>
              <button onClick={clearAll} disabled={isProcessing || images.length === 0} className={`rounded px-5 py-3 font-medium ${images.length === 0 || isProcessing ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
                {t("imagesizeconvert_clear")}
              </button>
            </div>
          </section>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="whitespace-pre-line text-gray-700">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            {t("imagesizeconvert_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
