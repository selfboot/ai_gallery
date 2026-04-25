"use client";

import { useMemo, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  OUTPUT_FORMATS,
  WATERMARK_LAYOUT_MODES,
  WATERMARK_POSITIONS,
  WATERMARK_TYPES,
  formatFileSize,
  getImageTileRects,
  getImageWatermarkRect,
  getMimeFromOutputFormat,
  getTextTileRects,
  getTextWatermarkRect,
  makeOutputFileName,
  makeZipName,
  summarizeResults,
} from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEFAULT_SETTINGS = {
  watermarkType: "text",
  layoutMode: "single",
  text: "CONFIDENTIAL",
  fontSize: 48,
  opacity: 0.2,
  rotation: -30,
  color: "#8f96a3",
  position: "center",
  imageScale: 0.28,
  outputFormat: "original",
  quality: 0.92,
};

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function makeImageId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
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

function createTextWatermarkCanvas({ text, fontSize, color }) {
  const lines = `${text || ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("missing text watermark");
  }

  const safeFontSize = clampNumber(fontSize, DEFAULT_SETTINGS.fontSize, 12, 144);
  const renderScale = window.devicePixelRatio > 1 ? 2 : 1.5;
  const paddingX = Math.max(20, Math.round(safeFontSize * 0.55));
  const paddingY = Math.max(14, Math.round(safeFontSize * 0.4));
  const lineHeight = Math.round(safeFontSize * 1.2);
  const cssFont = `700 ${safeFontSize}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", Arial, sans-serif`;

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = cssFont;
  const textWidth = Math.max(...lines.map((line) => Math.ceil(measureContext.measureText(line).width)), safeFontSize);

  const cssWidth = textWidth + paddingX * 2;
  const cssHeight = lines.length * lineHeight + paddingY * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(cssWidth * renderScale));
  canvas.height = Math.max(1, Math.ceil(cssHeight * renderScale));

  const context = canvas.getContext("2d");
  context.scale(renderScale, renderScale);
  context.clearRect(0, 0, cssWidth, cssHeight);
  context.font = cssFont;
  context.textBaseline = "top";
  context.textAlign = "left";
  context.fillStyle = color || DEFAULT_SETTINGS.color;

  lines.forEach((line, index) => {
    context.fillText(line, paddingX, paddingY + index * lineHeight);
  });

  return {
    canvas,
    width: cssWidth,
    height: cssHeight,
  };
}

function drawRotatedImage(context, image, rect, rotationDegrees, opacity) {
  context.save();
  context.globalAlpha = opacity;
  context.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
  context.rotate((rotationDegrees * Math.PI) / 180);
  context.drawImage(image, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
  context.restore();
}

async function processOneImage(item, settings, watermarkImageInfo) {
  const image = await fileToImage(item.file);
  const mimeType = getMimeFromOutputFormat(settings.outputFormat, item.type);
  const flattenBackground = mimeType === "image/jpeg";
  const canvas = document.createElement("canvas");
  canvas.width = item.width;
  canvas.height = item.height;

  const context = canvas.getContext("2d", { alpha: !flattenBackground });
  if (flattenBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const opacity = clampNumber(settings.opacity, DEFAULT_SETTINGS.opacity, 0.02, 1);
  const rotation = clampNumber(settings.rotation, DEFAULT_SETTINGS.rotation, -180, 180);

  if (settings.watermarkType === "text") {
    const textWatermark = createTextWatermarkCanvas({
      text: settings.text.trim(),
      fontSize: settings.fontSize,
      color: settings.color,
    });

    const rects =
      settings.layoutMode === "tile"
        ? getTextTileRects({
            imageWidth: canvas.width,
            imageHeight: canvas.height,
            textWidth: textWatermark.width,
            textHeight: textWatermark.height,
            rotationDegrees: rotation,
          })
        : [
            getTextWatermarkRect({
              imageWidth: canvas.width,
              imageHeight: canvas.height,
              textWidth: textWatermark.width,
              textHeight: textWatermark.height,
              position: settings.position,
              rotationDegrees: rotation,
            }),
          ];

    rects.forEach((rect) => {
      drawRotatedImage(context, textWatermark.canvas, rect, rotation, opacity);
    });
  } else {
    const watermarkImage = await fileToImage(watermarkImageInfo.file);
    const widthRatio = clampNumber(settings.imageScale, DEFAULT_SETTINGS.imageScale, 0.08, 0.9);
    const rects =
      settings.layoutMode === "tile"
        ? getImageTileRects({
            imageWidth: canvas.width,
            imageHeight: canvas.height,
            watermarkWidth: watermarkImageInfo.width,
            watermarkHeight: watermarkImageInfo.height,
            widthRatio,
            rotationDegrees: rotation,
          })
        : [
            getImageWatermarkRect({
              imageWidth: canvas.width,
              imageHeight: canvas.height,
              watermarkWidth: watermarkImageInfo.width,
              watermarkHeight: watermarkImageInfo.height,
              widthRatio,
              position: settings.position,
              rotationDegrees: rotation,
            }),
          ];

    rects.forEach((rect) => {
      drawRotatedImage(context, watermarkImage, rect, rotation, opacity);
    });

    if (typeof watermarkImage.close === "function") {
      watermarkImage.close();
    }
  }

  if (typeof image.close === "function") {
    image.close();
  }

  const blob = await canvasToBlob(canvas, mimeType, settings.quality);
  return {
    id: item.id,
    name: item.name,
    outputName: makeOutputFileName(item.name, mimeType),
    originalSize: item.size,
    outputSize: blob.size,
    width: item.width,
    height: item.height,
    blob,
    previewUrl: URL.createObjectURL(blob),
  };
}

export default function ImageWatermarkContent() {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [watermarkImage, setWatermarkImage] = useState(null);
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
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t("imagewatermark_invalid_format")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("imagewatermark_file_exists")}`);
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
      setImages((current) => [...current, ...loadedImages]);
      setResults((current) => {
        clearResultUrls(current);
        return [];
      });
      setStatusMessage(t("imagewatermark_files_added", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imagewatermark_read_error"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWatermarkImageUpload = async (file) => {
    if (!file || !SUPPORTED_TYPES.includes(file.type)) {
      showModal(t("imagewatermark_invalid_watermark_format"), "error");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("");
    try {
      const nextImage = await loadImageInfo(file);
      if (watermarkImage?.previewUrl) {
        URL.revokeObjectURL(watermarkImage.previewUrl);
      }
      setWatermarkImage(nextImage);
      setResults((current) => {
        clearResultUrls(current);
        return [];
      });
      setStatusMessage(t("imagewatermark_watermark_ready"));
    } catch (error) {
      console.error("Watermark image load failed:", error);
      showModal(t("imagewatermark_watermark_read_error"), "error");
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
    setResults((current) => {
      const target = images[index];
      const targetResult = current.find((item) => item.id === target?.id);
      if (targetResult?.previewUrl) {
        URL.revokeObjectURL(targetResult.previewUrl);
      }
      return current.filter((item) => item.id !== target?.id);
    });
  };

  const clearAll = () => {
    images.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    clearResultUrls(results);
    if (watermarkImage?.previewUrl) {
      URL.revokeObjectURL(watermarkImage.previewUrl);
    }
    setImages([]);
    setResults([]);
    setWatermarkImage(null);
    setSettings(DEFAULT_SETTINGS);
    setProgressText("");
    setStatusMessage("");
  };

  const processImages = async () => {
    if (images.length === 0) {
      showModal(t("imagewatermark_min_files_error"), "error");
      return;
    }
    if (settings.watermarkType === "text" && !settings.text.trim()) {
      showModal(t("imagewatermark_missing_text"), "error");
      return;
    }
    if (settings.watermarkType === "image" && !watermarkImage) {
      showModal(t("imagewatermark_missing_watermark"), "error");
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
      for (let index = 0; index < images.length; index += 1) {
        setProgressText(t("imagewatermark_progress", { current: index + 1, total: images.length }));
        const result = await processOneImage(images[index], settings, watermarkImage);
        nextResults.push(result);
        setResults([...nextResults]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      setStatusMessage(t("imagewatermark_success", { count: nextResults.length }));
    } catch (error) {
      console.error("Batch watermark failed:", error);
      showModal(t("imagewatermark_process_error"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const downloadOne = (item) => {
    saveAs(item.blob, item.outputName);
  };

  const downloadAll = async () => {
    if (results.length === 0) {
      showModal(t("imagewatermark_no_results"), "error");
      return;
    }

    const zip = new PizZip();
    for (const item of results) {
      zip.file(item.outputName, await item.blob.arrayBuffer());
    }
    const content = zip.generate({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    saveAs(content, makeZipName());
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[600px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imagewatermark_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagewatermark_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept={IMAGE_ACCEPT} multiple onChange={handleFileUpload} title={t("imagewatermark_upload_hint")} maxSize={40} className="min-h-32" />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagewatermark_images_title", { count: images.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("imagewatermark_images_hint")}</p>
              </div>
              {images.length > 0 && (
                <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 sm:ml-auto">
                  <p className="text-xs text-gray-500">{t("imagewatermark_image_count", { count: images.length })}</p>
                  <p className="text-lg font-semibold text-gray-950">{images.length}</p>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-900">{t("imagewatermark_summary_title")}</div>
              <dl className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("imagewatermark_type_label")}</dt>
                  <dd>{t(`imagewatermark_type_${settings.watermarkType}`)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("imagewatermark_layout_label")}</dt>
                  <dd>{t(`imagewatermark_layout_${settings.layoutMode}`)}</dd>
                </div>
                {settings.layoutMode === "single" && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-gray-500">{t("imagewatermark_position_label")}</dt>
                    <dd>{t(`imagewatermark_position_${settings.position}`)}</dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("imagewatermark_output_format")}</dt>
                  <dd>{t(OUTPUT_FORMATS[settings.outputFormat].labelKey)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-950">{t("imagewatermark_action_title")}</h2>
                  <p className="mt-1 text-sm text-gray-600">{t("imagewatermark_privacy_note")}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {statusMessage && <span className="text-green-700">{statusMessage}</span>}
                    {progressText && <span className="text-blue-700">{progressText}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:ml-auto sm:w-fit sm:flex-row">
                  <button onClick={processImages} disabled={isProcessing || images.length === 0} className={`rounded px-5 py-3 font-medium text-white ${isProcessing || images.length === 0 ? "cursor-not-allowed bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                    {isProcessing ? t("imagewatermark_processing") : t("imagewatermark_process_button", { count: images.length })}
                  </button>
                  <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className={`rounded px-5 py-3 font-medium ${isProcessing || results.length === 0 ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                    {t("imagewatermark_download_all")}
                  </button>
                  <button onClick={clearAll} disabled={isProcessing || (images.length === 0 && results.length === 0 && !watermarkImage)} className={`rounded px-5 py-3 font-medium ${isProcessing || (images.length === 0 && results.length === 0 && !watermarkImage) ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
                    {t("imagewatermark_clear")}
                  </button>
                </div>
              </div>
            </div>

            {images.length > 0 ? (
              <div className="mt-6">
                {results.length > 0 && (
                  <p className="mb-4 text-sm text-gray-600">
                    {t("imagewatermark_results_summary", {
                      original: formatFileSize(summary.originalSize),
                      output: formatFileSize(summary.outputSize),
                    })}
                  </p>
                )}

                <div className="grid min-h-40 grid-cols-2 gap-3 md:grid-cols-3">
                  {images.map((item, index) => {
                    const result = resultMap.get(item.id);
                    return (
                      <div key={item.id} className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                          <img src={(result || item).previewUrl} alt={(result || item).name} className="h-full w-full object-contain" />
                        </div>
                        <div className="p-2.5">
                          <p className="truncate text-sm font-medium text-gray-900" title={item.name}>{item.name}</p>
                          <p className="mt-1 text-[11px] text-gray-500">{item.width} × {item.height} · {formatFileSize(item.size)}</p>
                          {result && (
                            <>
                              <p className="mt-1 text-[11px] text-blue-700">{t("imagewatermark_output_size", { width: result.width, height: result.height })}</p>
                              <p className="mt-1 text-[11px] text-gray-500">{formatFileSize(result.outputSize)}</p>
                            </>
                          )}
                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {result && (
                              <button onClick={() => downloadOne(result)} className="w-full rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">
                                {t("imagewatermark_download_one")}
                              </button>
                            )}
                          </div>
                          <button onClick={() => removeImage(index)} disabled={isProcessing} className="mt-3 w-full rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                            {t("imagewatermark_delete")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-6 flex min-h-40 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-4 text-sm text-gray-500">
                {t("imagewatermark_min_files_error")}
              </div>
            )}
          </section>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imagewatermark_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagewatermark_settings_hint")}</p>

            <div className="mt-5 space-y-6">
              <div>
                <div className="mb-2 text-sm font-medium text-gray-900">{t("imagewatermark_type_label")}</div>
                <div className="grid grid-cols-2 gap-2">
                  {WATERMARK_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateSetting("watermarkType", type)}
                      className={`rounded border px-3 py-2.5 text-sm font-medium ${settings.watermarkType === type ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"}`}
                    >
                      {t(`imagewatermark_type_${type}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-900">{t("imagewatermark_layout_label")}</div>
                <div className="grid grid-cols-2 gap-2">
                  {WATERMARK_LAYOUT_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateSetting("layoutMode", mode)}
                      className={`rounded border px-3 py-2.5 text-sm font-medium ${settings.layoutMode === mode ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"}`}
                    >
                      {t(`imagewatermark_layout_${mode}`)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-500">{t(`imagewatermark_layout_${settings.layoutMode}_hint`)}</p>
              </div>

              {settings.watermarkType === "text" ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagewatermark_text_label")}</span>
                    <textarea
                      value={settings.text}
                      onChange={(event) => updateSetting("text", event.target.value)}
                      rows={3}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagewatermark_font_size_label")}</span>
                      <input
                        type="number"
                        min="12"
                        max="144"
                        value={settings.fontSize}
                        onChange={(event) => updateSetting("fontSize", event.target.value)}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagewatermark_color_label")}</span>
                      <div className="flex items-center gap-3 rounded border border-gray-300 px-3 py-2">
                        <input type="color" value={settings.color} onChange={(event) => updateSetting("color", event.target.value)} className="h-8 w-10 rounded border-0 bg-transparent p-0" />
                        <span className="text-sm text-gray-700">{settings.color}</span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-sm font-medium text-gray-900">{t("imagewatermark_image_upload_title")}</div>
                    <FileUploadBox accept={IMAGE_ACCEPT} onChange={handleWatermarkImageUpload} title={t("imagewatermark_image_upload_hint")} maxSize={20} className="min-h-28" />
                    <p className="mt-2 text-xs text-gray-500">{t("imagewatermark_image_upload_note")}</p>
                  </div>

                  {watermarkImage ? (
                    <div className="rounded border border-gray-200 bg-gray-50 p-4">
                      <img src={watermarkImage.previewUrl} alt={t("imagewatermark_image_preview_alt")} className="max-h-36 w-auto rounded border border-gray-200 bg-white object-contain" />
                      <p className="mt-3 text-sm text-gray-800">{watermarkImage.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {watermarkImage.width} × {watermarkImage.height} · {formatFileSize(watermarkImage.size)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">{t("imagewatermark_no_image")}</div>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagewatermark_image_scale_label", { value: Math.round(clampNumber(settings.imageScale, DEFAULT_SETTINGS.imageScale, 0.08, 0.9) * 100) })}</span>
                    <input
                      type="range"
                      min="0.08"
                      max="0.9"
                      step="0.01"
                      value={settings.imageScale}
                      onChange={(event) => updateSetting("imageScale", event.target.value)}
                      className="w-full"
                    />
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {settings.layoutMode === "single" && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagewatermark_position_label")}</span>
                    <select value={settings.position} onChange={(event) => updateSetting("position", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                      {WATERMARK_POSITIONS.map((position) => (
                        <option key={position} value={position}>
                          {t(`imagewatermark_position_${position}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagewatermark_rotation_label")}</span>
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    value={settings.rotation}
                    onChange={(event) => updateSetting("rotation", event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className={`block ${settings.layoutMode === "single" ? "sm:col-span-2" : ""}`}>
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagewatermark_opacity_label", { value: Math.round(clampNumber(settings.opacity, DEFAULT_SETTINGS.opacity, 0.02, 1) * 100) })}</span>
                  <input
                    type="range"
                    min="0.02"
                    max="1"
                    step="0.01"
                    value={settings.opacity}
                    onChange={(event) => updateSetting("opacity", event.target.value)}
                    className="w-full"
                  />
                </label>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagewatermark_output_format")}</span>
                  <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    {Object.entries(OUTPUT_FORMATS).map(([key, option]) => (
                      <option key={key} value={key}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs leading-5 text-gray-500">{t("imagewatermark_output_note")}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="whitespace-pre-line text-gray-700">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            {t("imagewatermark_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
