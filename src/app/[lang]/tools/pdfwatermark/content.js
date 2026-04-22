"use client";

import { useMemo, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  PAGE_SELECTION_MODES,
  WATERMARK_LAYOUT_MODES,
  WATERMARK_POSITIONS,
  WATERMARK_TYPES,
  formatFileSize,
  getImageTileRects,
  getImageWatermarkRect,
  getTextTileRects,
  getTextWatermarkRect,
  makeOutputFileName,
  parsePageSelection,
} from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEFAULT_SETTINGS = {
  watermarkType: "text",
  layoutMode: "single",
  text: "CONFIDENTIAL",
  fontSize: 48,
  opacity: 0.18,
  rotation: -35,
  color: "#8f96a3",
  position: "center",
  imageScale: 0.32,
  pageMode: "all",
  pageRange: "",
};

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function createTextWatermarkImage({ text, fontSize, color, opacity }) {
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
  context.globalAlpha = clampNumber(opacity, DEFAULT_SETTINGS.opacity, 0.02, 1);

  lines.forEach((line, index) => {
    context.fillText(line, paddingX, paddingY + index * lineHeight);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("text watermark image export failed"));
        return;
      }

      resolve({
        bytes: await blob.arrayBuffer(),
        width: cssWidth,
        height: cssHeight,
      });
    }, "image/png");
  });
}

function makePdfItemId(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function loadImageInfo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
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

async function loadPdfInfo(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(bytes.slice(), { ignoreEncryption: true });
  return {
    id: makePdfItemId(file),
    file,
    name: file.name,
    size: file.size,
    pageCount: pdfDoc.getPageCount(),
    bytes: bytes.slice(),
  };
}

async function fileToPngBytes(file) {
  if (file.type === "image/png") {
    return file.arrayBuffer();
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("png export failed");
    }
    return blob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function embedWatermarkImage(pdfDoc, imageInfo) {
  if (imageInfo.type === "image/png") {
    return pdfDoc.embedPng(await imageInfo.file.arrayBuffer());
  }
  if (imageInfo.type === "image/jpeg") {
    return pdfDoc.embedJpg(await imageInfo.file.arrayBuffer());
  }
  return pdfDoc.embedPng(await fileToPngBytes(imageInfo.file));
}

export default function PdfWatermarkContent() {
  const { t } = useI18n();
  const [pdfItems, setPdfItems] = useState([]);
  const [watermarkImage, setWatermarkImage] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalPageCount = useMemo(() => pdfItems.reduce((sum, item) => sum + item.pageCount, 0), [pdfItems]);

  const targetPagesSummary = useMemo(() => {
    if (pdfItems.length === 0) {
      return t("pdfwatermark_no_pdf");
    }
    if (settings.pageMode === "all") {
      return t("pdfwatermark_all_pages_summary", { count: totalPageCount });
    }
    return settings.pageRange?.trim() || t("pdfwatermark_custom_pages_placeholder");
  }, [pdfItems.length, settings.pageMode, settings.pageRange, t, totalPageCount]);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => {
      if (key === "pageMode") {
        return {
          ...current,
          pageMode: value,
          pageRange: value === "all" ? "" : current.pageRange,
        };
      }

      return { ...current, [key]: value };
    });
  };

  const handlePdfUpload = async (uploadedFiles) => {
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const validFiles = files.filter((file) => file?.name?.toLowerCase().endsWith(".pdf"));
    const invalidFiles = files.filter((file) => !file?.name?.toLowerCase().endsWith(".pdf"));

    if (invalidFiles.length > 0) {
      showModal(t("pdfwatermark_error_invalid_pdf"), "error");
    }
    if (validFiles.length === 0) {
      return;
    }

    setIsProcessing(true);
    setProgressText(t("pdfwatermark_reading_pdf"));
    setStatusMessage("");
    try {
      const loadedItems = [];
      for (let index = 0; index < validFiles.length; index += 1) {
        setProgressText(t("pdfwatermark_reading_pdf_item", { current: index + 1, total: validFiles.length, name: validFiles[index].name }));
        const item = await loadPdfInfo(validFiles[index]);
        loadedItems.push(item);
      }

      setPdfItems((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const nextItems = loadedItems.filter((item) => !existingIds.has(item.id));
        return [...current, ...nextItems];
      });
      setStatusMessage(t("pdfwatermark_pdf_loaded_batch", { count: loadedItems.length }));
    } catch (error) {
      console.error("PDF read failed:", error);
      showModal(t("pdfwatermark_error_read_pdf"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const handleImageUpload = async (file) => {
    if (!file || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      showModal(t("pdfwatermark_error_invalid_image"), "error");
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
      setStatusMessage(t("pdfwatermark_image_ready"));
    } catch (error) {
      console.error("Watermark image read failed:", error);
      showModal(t("pdfwatermark_error_read_image"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const removePdfItem = (id) => {
    setPdfItems((current) => current.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    if (watermarkImage?.previewUrl) {
      URL.revokeObjectURL(watermarkImage.previewUrl);
    }
    setPdfItems([]);
    setWatermarkImage(null);
    setSettings(DEFAULT_SETTINGS);
    setProgressText("");
    setStatusMessage("");
  };

  const exportPdf = async () => {
    if (pdfItems.length === 0) {
      showModal(t("pdfwatermark_error_missing_pdf"), "error");
      return;
    }
    if (settings.watermarkType === "text" && !settings.text.trim()) {
      showModal(t("pdfwatermark_error_missing_text"), "error");
      return;
    }
    if (settings.watermarkType === "image" && !watermarkImage) {
      showModal(t("pdfwatermark_error_missing_image"), "error");
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;

      for (let fileIndex = 0; fileIndex < pdfItems.length; fileIndex += 1) {
        const pdfItem = pdfItems[fileIndex];
        setProgressText(t("pdfwatermark_exporting_item", { current: fileIndex + 1, total: pdfItems.length, name: pdfItem.name }));

        const pdfDoc = await PDFDocument.load(pdfItem.bytes.slice(), { ignoreEncryption: true });
        const activePageMode = settings.pageMode === "custom" ? "custom" : "all";
        const activePageRange = activePageMode === "custom" ? settings.pageRange : "";
        const selectedPages = parsePageSelection(activePageMode, activePageRange, pdfDoc.getPageCount());
        const pages = pdfDoc.getPages();
        const opacity = clampNumber(settings.opacity, DEFAULT_SETTINGS.opacity, 0.02, 1);
        const rotationValue = clampNumber(settings.rotation, DEFAULT_SETTINGS.rotation, -180, 180);
        const rotation = degrees(rotationValue);

        let textWatermarkImage = null;
        let textWatermarkMeta = null;
        let image = null;
        let imageMeta = null;

        if (settings.watermarkType === "text") {
          textWatermarkMeta = await createTextWatermarkImage({
            text: settings.text.trim(),
            fontSize: settings.fontSize,
            color: settings.color,
            opacity,
          });
          textWatermarkImage = await pdfDoc.embedPng(textWatermarkMeta.bytes);
        } else {
          image = await embedWatermarkImage(pdfDoc, watermarkImage);
          imageMeta = watermarkImage;
        }

        pages.forEach((page, pageIndex) => {
          if (!selectedPages.has(pageIndex)) {
            return;
          }

          const { width: pageWidth, height: pageHeight } = page.getSize();
          if (settings.watermarkType === "text") {
            const rects =
              settings.layoutMode === "tile"
                ? getTextTileRects({
                    pageWidth,
                    pageHeight,
                    textWidth: textWatermarkMeta.width,
                    textHeight: textWatermarkMeta.height,
                    rotationDegrees: rotationValue,
                  })
                : [
                    getTextWatermarkRect({
                      pageWidth,
                      pageHeight,
                      textWidth: textWatermarkMeta.width,
                      textHeight: textWatermarkMeta.height,
                      position: settings.position,
                      rotationDegrees: rotationValue,
                    }),
                  ];

            rects.forEach((rect) => {
              page.drawImage(textWatermarkImage, {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                rotate: rotation,
              });
            });
            return;
          }

          const widthRatio = clampNumber(settings.imageScale, DEFAULT_SETTINGS.imageScale, 0.08, 0.9);
          const rects =
            settings.layoutMode === "tile"
              ? getImageTileRects({
                  pageWidth,
                  pageHeight,
                  imageWidth: imageMeta.width,
                  imageHeight: imageMeta.height,
                  widthRatio,
                  rotationDegrees: rotationValue,
                })
              : [
                  getImageWatermarkRect({
                    pageWidth,
                    pageHeight,
                    imageWidth: imageMeta.width,
                    imageHeight: imageMeta.height,
                    widthRatio,
                    position: settings.position,
                    rotationDegrees: rotationValue,
                  }),
                ];

          rects.forEach((rect) => {
            page.drawImage(image, {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              opacity,
              rotate: rotation,
            });
          });
        });

        const outputBytes = await pdfDoc.save();
        saveAs(new Blob([outputBytes], { type: "application/pdf" }), makeOutputFileName(pdfItem.name));
        successCount += 1;
      }

      setStatusMessage(t("pdfwatermark_success_batch", { count: successCount }));
    } catch (error) {
      console.error("Export watermarked PDF failed:", error);
      if (error?.message === "invalid page range" || error?.message === "missing page range") {
        showModal(t("pdfwatermark_error_invalid_page_range"), "error");
      } else {
        showModal(t("pdfwatermark_error_export"), "error");
      }
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[600px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("pdfwatermark_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("pdfwatermark_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept=".pdf" multiple onChange={handlePdfUpload} title={t("pdfwatermark_upload_hint")} maxSize={80} className="min-h-32" />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("pdfwatermark_files_title", { count: pdfItems.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("pdfwatermark_files_hint")}</p>
              </div>
              {pdfItems.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:ml-auto sm:flex sm:items-center">
                  <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">{t("pdfwatermark_pdf_count", { count: pdfItems.length })}</p>
                    <p className="text-lg font-semibold text-gray-950">{pdfItems.length}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">{t("pdfwatermark_page_count", { count: totalPageCount })}</p>
                    <p className="text-lg font-semibold text-gray-950">{totalPageCount}</p>
                  </div>
                </div>
              )}
            </div>

            {pdfItems.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("pdfwatermark_no_files")}</div>
            ) : (
              <div className="mt-5 max-h-[420px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {pdfItems.map((item) => (
                  <div key={item.id} className="flex min-w-0 items-start justify-between gap-3 rounded border border-gray-200 bg-gray-50 px-4 py-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {t("pdfwatermark_page_count", { count: item.pageCount })} · {formatFileSize(item.size)}
                      </div>
                    </div>
                    <button type="button" onClick={() => removePdfItem(item.id)} className="shrink-0 rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50">
                      {t("pdfwatermark_delete")}
                    </button>
                  </div>
                ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-900">{t("pdfwatermark_summary_title")}</div>
              <dl className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfwatermark_type_label")}</dt>
                  <dd>{t(`pdfwatermark_type_${settings.watermarkType}`)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfwatermark_layout_label")}</dt>
                  <dd>{t(`pdfwatermark_layout_${settings.layoutMode}`)}</dd>
                </div>
                {settings.layoutMode === "single" && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-gray-500">{t("pdfwatermark_position_label")}</dt>
                    <dd>{t(`pdfwatermark_position_${settings.position}`)}</dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfwatermark_target_pages_label")}</dt>
                  <dd className="text-right break-all">{targetPagesSummary}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-950">{t("pdfwatermark_action_title")}</h2>
                  <p className="mt-1 text-sm text-gray-600">{t("pdfwatermark_privacy_note")}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {statusMessage && <span className="text-green-700">{statusMessage}</span>}
                    {progressText && <span className="text-blue-700">{progressText}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:ml-auto sm:w-fit sm:flex-row">
                  <button onClick={exportPdf} disabled={isProcessing || pdfItems.length === 0} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || pdfItems.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                    {isProcessing ? t("pdfwatermark_processing") : t("pdfwatermark_export_button")}
                  </button>
                  <button onClick={clearAll} disabled={isProcessing || (pdfItems.length === 0 && !watermarkImage)} className={`px-5 py-3 rounded font-medium ${isProcessing || (pdfItems.length === 0 && !watermarkImage) ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
                    {t("pdfwatermark_clear")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("pdfwatermark_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("pdfwatermark_settings_hint")}</p>

            <div className="mt-5 space-y-6">
              <div>
                <div className="mb-2 text-sm font-medium text-gray-900">{t("pdfwatermark_type_label")}</div>
                <div className="grid grid-cols-2 gap-2">
                  {WATERMARK_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateSetting("watermarkType", type)}
                      className={`rounded border px-3 py-2.5 text-sm font-medium ${settings.watermarkType === type ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"}`}
                    >
                      {t(`pdfwatermark_type_${type}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-900">{t("pdfwatermark_layout_label")}</div>
                <div className="grid grid-cols-2 gap-2">
                  {WATERMARK_LAYOUT_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateSetting("layoutMode", mode)}
                      className={`rounded border px-3 py-2.5 text-sm font-medium ${settings.layoutMode === mode ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"}`}
                    >
                      {t(`pdfwatermark_layout_${mode}`)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-500">{t(`pdfwatermark_layout_${settings.layoutMode}_hint`)}</p>
              </div>

              {settings.watermarkType === "text" ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfwatermark_text_label")}</span>
                    <textarea
                      value={settings.text}
                      onChange={(event) => updateSetting("text", event.target.value)}
                      rows={3}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfwatermark_font_size_label")}</span>
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
                      <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfwatermark_color_label")}</span>
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
                    <div className="mb-2 text-sm font-medium text-gray-900">{t("pdfwatermark_image_upload_title")}</div>
                    <FileUploadBox accept={IMAGE_ACCEPT} onChange={handleImageUpload} title={t("pdfwatermark_image_upload_hint")} maxSize={20} className="min-h-28" />
                    <p className="mt-2 text-xs text-gray-500">{t("pdfwatermark_image_upload_note")}</p>
                  </div>

                  {watermarkImage ? (
                    <div className="rounded border border-gray-200 bg-gray-50 p-4">
                      <img src={watermarkImage.previewUrl} alt={t("pdfwatermark_image_preview_alt")} className="max-h-36 w-auto rounded border border-gray-200 bg-white object-contain" />
                      <p className="mt-3 text-sm text-gray-800">{watermarkImage.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {watermarkImage.width} × {watermarkImage.height} · {formatFileSize(watermarkImage.size)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">{t("pdfwatermark_no_image")}</div>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfwatermark_image_scale_label", { value: Math.round(clampNumber(settings.imageScale, DEFAULT_SETTINGS.imageScale, 0.08, 0.9) * 100) })}</span>
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
                    <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfwatermark_position_label")}</span>
                    <select value={settings.position} onChange={(event) => updateSetting("position", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                      {WATERMARK_POSITIONS.map((position) => (
                        <option key={position} value={position}>
                          {t(`pdfwatermark_position_${position}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfwatermark_rotation_label")}</span>
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
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfwatermark_opacity_label", { value: Math.round(clampNumber(settings.opacity, DEFAULT_SETTINGS.opacity, 0.02, 1) * 100) })}</span>
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
                <h3 className="text-base font-semibold text-gray-950">{t("pdfwatermark_scope_title")}</h3>
                <p className="mt-1 text-sm text-gray-600">{t("pdfwatermark_scope_hint")}</p>

                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {PAGE_SELECTION_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateSetting("pageMode", mode)}
                        className={`rounded border px-3 py-2.5 text-sm font-medium ${settings.pageMode === mode ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"}`}
                      >
                        {t(`pdfwatermark_page_mode_${mode}`)}
                      </button>
                    ))}
                  </div>

                  {settings.pageMode === "custom" && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfwatermark_page_range_label")}</span>
                      <input
                        type="text"
                        value={settings.pageRange}
                        onChange={(event) => updateSetting("pageRange", event.target.value)}
                        placeholder={t("pdfwatermark_custom_pages_placeholder")}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                      <p className="mt-2 text-xs text-gray-500">{t("pdfwatermark_page_range_help")}</p>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalType === "error" ? t("pdfwatermark_error_title") : t("pdfwatermark_notice_title")}>
        <div className="text-sm text-gray-700 whitespace-pre-wrap">{modalMessage}</div>
        <div className="mt-6 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t("pdfwatermark_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
