"use client";

import { useMemo, useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  PAGE_NUMBER_FORMATS,
  PAGE_NUMBER_POSITIONS,
  PAGE_NUMBER_WEIGHTS,
  PAGE_SELECTION_MODES,
  buildPageNumberText,
  formatFileSize,
  getPositionedPoint,
  makeOutputFileName,
  parsePageSelection,
} from "./logic";

const DEFAULT_SETTINGS = {
  position: "bottomCenter",
  format: "number",
  customTemplate: "第 {n} 页",
  fontFamily: '"Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif',
  fontWeight: "regular",
  fontSize: 14,
  color: "#334155",
  startNumber: 1,
  pageMode: "all",
  pageRange: "",
};

const FONT_FALLBACK_STACK = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", Arial, sans-serif';

function escapeFontFamilyName(name) {
  return `"${String(name || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function makeSystemFontValue(name) {
  return `${escapeFontFamilyName(name)}, ${FONT_FALLBACK_STACK}`;
}

function getPresetFonts(t) {
  return [
    { value: '"Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif', label: t("microsoftYahei") },
    { value: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif', label: "PingFang SC" },
    { value: '"Songti SC", "SimSun", "宋体", serif', label: "Songti SC / " + t("simsun") },
    { value: '"Heiti SC", "SimHei", "黑体", sans-serif', label: "Heiti SC / " + t("simhei") },
    { value: '"Kaiti SC", "KaiTi", "楷体", cursive', label: "Kaiti SC / " + t("kaiti") },
    { value: '"SimSun", "宋体", serif', label: t("simsun") },
    { value: '"SimHei", "黑体", sans-serif', label: t("simhei") },
    { value: '"KaiTi", "楷体", cursive', label: t("kaiti") },
    { value: '"FangSong", "仿宋", serif', label: t("fangsong") },
    { value: 'Arial, sans-serif', label: "Arial" },
    { value: 'Helvetica, sans-serif', label: "Helvetica" },
    { value: '"Times New Roman", Times, serif', label: "Times New Roman" },
  ];
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function getNormalizedRotationAngle(angle) {
  const normalized = ((Number(angle) || 0) % 360 + 360) % 360;
  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0;
}

function getDisplayPageSize(pageWidth, pageHeight, rotationAngle) {
  if (rotationAngle === 90 || rotationAngle === 270) {
    return { width: pageHeight, height: pageWidth };
  }
  return { width: pageWidth, height: pageHeight };
}

function mapDisplayRectToPageRect({ pageWidth, pageHeight, rotationAngle, rect }) {
  if (rotationAngle === 90) {
    return {
      x: rect.y,
      y: pageHeight - rect.x - rect.width,
      width: rect.height,
      height: rect.width,
    };
  }

  if (rotationAngle === 180) {
    return {
      x: pageWidth - rect.x - rect.width,
      y: pageHeight - rect.y - rect.height,
      width: rect.width,
      height: rect.height,
    };
  }

  if (rotationAngle === 270) {
    return {
      x: pageWidth - rect.y - rect.height,
      y: rect.x,
      width: rect.height,
      height: rect.width,
    };
  }

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function createPageNumberImage({ text, fontSize, color, fontWeight, fontFamily, rotationAngle = 0 }) {
  const content = `${text || ""}`.trim();
  if (!content) {
    throw new Error("missing page number text");
  }

  const safeFontSize = clampNumber(fontSize, DEFAULT_SETTINGS.fontSize, 8, 72);
  const renderScale = window.devicePixelRatio > 1 ? 2 : 1.5;
  const paddingX = Math.max(8, Math.round(safeFontSize * 0.45));
  const paddingY = Math.max(6, Math.round(safeFontSize * 0.28));
  const weight = fontWeight === "bold" ? 700 : 400;
  const cssFont = `${weight} ${safeFontSize}px ${fontFamily || FONT_FALLBACK_STACK}`;

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = cssFont;
  const textWidth = Math.max(Math.ceil(measureContext.measureText(content).width), safeFontSize);
  const textHeight = Math.round(safeFontSize * 1.2);

  const baseWidth = textWidth + paddingX * 2;
  const baseHeight = textHeight + paddingY * 2;
  const normalizedRotation = getNormalizedRotationAngle(rotationAngle);
  const cssWidth = normalizedRotation === 90 || normalizedRotation === 270 ? baseHeight : baseWidth;
  const cssHeight = normalizedRotation === 90 || normalizedRotation === 270 ? baseWidth : baseHeight;
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
  context.save();
  if (normalizedRotation === 90) {
    context.translate(cssWidth, 0);
    context.rotate(Math.PI / 2);
  } else if (normalizedRotation === 180) {
    context.translate(cssWidth, cssHeight);
    context.rotate(Math.PI);
  } else if (normalizedRotation === 270) {
    context.translate(0, cssHeight);
    context.rotate(-Math.PI / 2);
  }
  context.fillText(content, paddingX, paddingY);
  context.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("page number image export failed"));
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

export default function PdfPageNumberContent() {
  const { t } = useI18n();
  const [pdfItems, setPdfItems] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [localFonts, setLocalFonts] = useState([]);
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [fontLoadMessage, setFontLoadMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const presetFonts = useMemo(() => getPresetFonts(t), [t]);

  const totalPageCount = useMemo(() => pdfItems.reduce((sum, item) => sum + item.pageCount, 0), [pdfItems]);

  const targetPagesSummary = useMemo(() => {
    if (pdfItems.length === 0) {
      return t("pdfpagenumber_no_pdf");
    }
    if (settings.pageMode === "all") {
      return t("pdfpagenumber_all_pages_summary", { count: totalPageCount });
    }
    return settings.pageRange?.trim() || t("pdfpagenumber_custom_pages_placeholder");
  }, [pdfItems.length, settings.pageMode, settings.pageRange, t, totalPageCount]);

  const previewText = useMemo(() => {
    const startNumber = Math.round(clampNumber(settings.startNumber, DEFAULT_SETTINGS.startNumber, -999999, 999999));
    return buildPageNumberText(settings.format, startNumber, totalPageCount || 9, settings.customTemplate);
  }, [settings.customTemplate, settings.format, settings.startNumber, totalPageCount]);

  useEffect(() => {
    if (!settings.fontFamily && presetFonts[0]) {
      setSettings((current) => ({ ...current, fontFamily: presetFonts[0].value }));
    }
  }, [presetFonts, settings.fontFamily]);

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

  const loadLocalFonts = async () => {
    if (typeof window === "undefined" || typeof window.queryLocalFonts !== "function") {
      setFontLoadMessage(t("pdfpagenumber_font_detect_unsupported"));
      return;
    }

    setIsLoadingFonts(true);
    setFontLoadMessage("");
    try {
      const fontData = await window.queryLocalFonts();
      const presetValues = new Set(presetFonts.map((item) => item.value));
      const uniqueFamilies = Array.from(new Set(fontData.map((item) => item.family).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const nextFonts = uniqueFamilies
        .map((family) => ({ family, value: makeSystemFontValue(family) }))
        .filter((item) => !presetValues.has(item.value));

      setLocalFonts(nextFonts);
      setFontLoadMessage(nextFonts.length > 0 ? t("pdfpagenumber_font_detect_success", { count: nextFonts.length }) : t("pdfpagenumber_font_detect_empty"));
    } catch (error) {
      console.error("Load local fonts failed:", error);
      setFontLoadMessage(t("pdfpagenumber_font_detect_failed"));
    } finally {
      setIsLoadingFonts(false);
    }
  };

  const handlePdfUpload = async (uploadedFiles) => {
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const validFiles = files.filter((file) => file?.name?.toLowerCase().endsWith(".pdf"));
    const invalidFiles = files.filter((file) => !file?.name?.toLowerCase().endsWith(".pdf"));

    if (invalidFiles.length > 0) {
      showModal(t("pdfpagenumber_error_invalid_pdf"), "error");
    }
    if (validFiles.length === 0) {
      return;
    }

    setIsProcessing(true);
    setProgressText(t("pdfpagenumber_reading_pdf"));
    setStatusMessage("");
    try {
      const loadedItems = [];
      for (let index = 0; index < validFiles.length; index += 1) {
        setProgressText(t("pdfpagenumber_reading_pdf_item", { current: index + 1, total: validFiles.length, name: validFiles[index].name }));
        loadedItems.push(await loadPdfInfo(validFiles[index]));
      }

      setPdfItems((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const nextItems = loadedItems.filter((item) => !existingIds.has(item.id));
        return [...current, ...nextItems];
      });
      setStatusMessage(t("pdfpagenumber_pdf_loaded_batch", { count: loadedItems.length }));
    } catch (error) {
      console.error("PDF read failed:", error);
      showModal(t("pdfpagenumber_error_read_pdf"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const removePdfItem = (id) => {
    setPdfItems((current) => current.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setPdfItems([]);
    setSettings(DEFAULT_SETTINGS);
    setProgressText("");
    setStatusMessage("");
  };

  const exportPdf = async () => {
    if (pdfItems.length === 0) {
      showModal(t("pdfpagenumber_error_missing_pdf"), "error");
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;

      for (let fileIndex = 0; fileIndex < pdfItems.length; fileIndex += 1) {
        const pdfItem = pdfItems[fileIndex];
        setProgressText(t("pdfpagenumber_exporting_item", { current: fileIndex + 1, total: pdfItems.length, name: pdfItem.name }));

        const pdfDoc = await PDFDocument.load(pdfItem.bytes.slice(), { ignoreEncryption: true });
        const activePageMode = settings.pageMode === "custom" ? "custom" : "all";
        const activePageRange = activePageMode === "custom" ? settings.pageRange : "";
        const selectedPages = parsePageSelection(activePageMode, activePageRange, pdfDoc.getPageCount());
        const fontSize = clampNumber(settings.fontSize, DEFAULT_SETTINGS.fontSize, 8, 72);
        const startNumber = Math.round(clampNumber(settings.startNumber, DEFAULT_SETTINGS.startNumber, -999999, 999999));
        const imageCache = new Map();
        let appliedIndex = 0;

        pdfDoc.getPages().forEach((page, pageIndex) => {
          if (!selectedPages.has(pageIndex)) {
            return;
          }

          const pageNumberValue = startNumber + appliedIndex;
          const text = buildPageNumberText(settings.format, pageNumberValue, pdfDoc.getPageCount(), settings.customTemplate);
          const pageRotation = getNormalizedRotationAngle(page.getRotation().angle);
          const cacheKey = `${pageRotation}:${text}`;
          appliedIndex += 1;

          imageCache.set(cacheKey, imageCache.get(cacheKey) || createPageNumberImage({
            text,
            fontSize,
            color: settings.color,
            fontWeight: settings.fontWeight,
            fontFamily: settings.fontFamily,
            rotationAngle: (360 - pageRotation) % 360,
          }));
        });

        for (const [cacheKey, imagePromise] of imageCache.entries()) {
          const imageData = await imagePromise;
          imageCache.set(cacheKey, {
            ...imageData,
            image: await pdfDoc.embedPng(imageData.bytes),
          });
        }

        appliedIndex = 0;
        pdfDoc.getPages().forEach((page, pageIndex) => {
          if (!selectedPages.has(pageIndex)) {
            return;
          }

          const pageNumberValue = startNumber + appliedIndex;
          const text = buildPageNumberText(settings.format, pageNumberValue, pdfDoc.getPageCount(), settings.customTemplate);
          const pageRotation = getNormalizedRotationAngle(page.getRotation().angle);
          const imageData = imageCache.get(`${pageRotation}:${text}`);
          const { width: pageWidth, height: pageHeight } = page.getSize();
          const displayPageSize = getDisplayPageSize(pageWidth, pageHeight, pageRotation);
          const point = getPositionedPoint({
            pageWidth: displayPageSize.width,
            pageHeight: displayPageSize.height,
            textWidth: imageData.width,
            textHeight: imageData.height,
            position: settings.position,
            margin: Math.max(18, fontSize * 1.1),
          });
          const pageRect = mapDisplayRectToPageRect({
            pageWidth,
            pageHeight,
            rotationAngle: pageRotation,
            rect: {
              x: point.x,
              y: point.y,
              width: imageData.width,
              height: imageData.height,
            },
          });

          page.drawImage(imageData.image, {
            x: pageRect.x,
            y: pageRect.y,
            width: pageRect.width,
            height: pageRect.height,
          });

          appliedIndex += 1;
        });

        const outputBytes = await pdfDoc.save();
        saveAs(new Blob([outputBytes], { type: "application/pdf" }), makeOutputFileName(pdfItem.name));
        successCount += 1;
      }

      setStatusMessage(t("pdfpagenumber_success_batch", { count: successCount }));
    } catch (error) {
      console.error("Export page-numbered PDF failed:", error);
      if (error?.message === "invalid page range" || error?.message === "missing page range") {
        showModal(t("pdfpagenumber_error_invalid_page_range"), "error");
      } else {
        showModal(t("pdfpagenumber_error_export"), "error");
      }
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  return (
    <div className="mx-auto mt-4 w-full">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[600px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("pdfpagenumber_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("pdfpagenumber_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept=".pdf" multiple onChange={handlePdfUpload} title={t("pdfpagenumber_upload_hint")} maxSize={80} className="min-h-32" />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("pdfpagenumber_files_title", { count: pdfItems.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("pdfpagenumber_files_hint")}</p>
              </div>
              {pdfItems.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:ml-auto sm:flex sm:items-center">
                  <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">{t("pdfpagenumber_pdf_count", { count: pdfItems.length })}</p>
                    <p className="text-lg font-semibold text-gray-950">{pdfItems.length}</p>
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">{t("pdfpagenumber_page_count", { count: totalPageCount })}</p>
                    <p className="text-lg font-semibold text-gray-950">{totalPageCount}</p>
                  </div>
                </div>
              )}
            </div>

            {pdfItems.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("pdfpagenumber_no_files")}</div>
            ) : (
              <div className="mt-5 max-h-[420px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {pdfItems.map((item) => (
                    <div key={item.id} className="flex min-w-0 items-start justify-between gap-3 rounded border border-gray-200 bg-gray-50 px-4 py-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {t("pdfpagenumber_page_count", { count: item.pageCount })} · {formatFileSize(item.size)}
                        </div>
                      </div>
                      <button type="button" onClick={() => removePdfItem(item.id)} className="shrink-0 rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50">
                        {t("pdfpagenumber_delete")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-900">{t("pdfpagenumber_summary_title")}</div>
              <dl className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfpagenumber_position_label")}</dt>
                  <dd>{t(`pdfpagenumber_position_${settings.position}`)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfpagenumber_format_label")}</dt>
                  <dd>{t(`pdfpagenumber_format_${settings.format}`)}</dd>
                </div>
                {settings.format === "custom" && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-gray-500">{t("pdfpagenumber_custom_template_label")}</dt>
                    <dd className="break-all text-right">{settings.customTemplate || t("pdfpagenumber_custom_template_placeholder")}</dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfpagenumber_start_number_label")}</dt>
                  <dd>{Math.round(clampNumber(settings.startNumber, DEFAULT_SETTINGS.startNumber, -999999, 999999))}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfpagenumber_target_pages_label")}</dt>
                  <dd className="break-all text-right">{targetPagesSummary}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-950">{t("pdfpagenumber_action_title")}</h2>
                  <p className="mt-1 text-sm text-gray-600">{t("pdfpagenumber_privacy_note")}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {statusMessage && <span className="text-green-700">{statusMessage}</span>}
                    {progressText && <span className="text-blue-700">{progressText}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:ml-auto sm:w-fit sm:flex-row">
                  <button onClick={exportPdf} disabled={isProcessing || pdfItems.length === 0} className={`rounded px-5 py-3 font-medium text-white ${isProcessing || pdfItems.length === 0 ? "cursor-not-allowed bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                    {isProcessing ? t("pdfpagenumber_processing") : t("pdfpagenumber_export_button")}
                  </button>
                  <button onClick={clearAll} disabled={isProcessing || pdfItems.length === 0} className={`rounded px-5 py-3 font-medium ${isProcessing || pdfItems.length === 0 ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
                    {t("pdfpagenumber_clear")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("pdfpagenumber_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("pdfpagenumber_settings_hint")}</p>

            <div className="mt-5 space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 text-sm font-medium text-gray-900">{t("pdfpagenumber_preview_title")}</div>
                <div className="flex min-h-24 items-center justify-center rounded border border-dashed border-gray-300 bg-white px-4 py-6">
                  <span
                    style={{
                      color: settings.color,
                      fontSize: `${clampNumber(settings.fontSize, DEFAULT_SETTINGS.fontSize, 8, 72)}px`,
                      fontWeight: settings.fontWeight === "bold" ? 700 : 400,
                      fontFamily: settings.fontFamily,
                    }}
                    className="text-center"
                  >
                    {previewText}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_position_label")}</span>
                  <select value={settings.position} onChange={(event) => updateSetting("position", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    {PAGE_NUMBER_POSITIONS.map((position) => (
                      <option key={position} value={position}>
                        {t(`pdfpagenumber_position_${position}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_format_label")}</span>
                  <select value={settings.format} onChange={(event) => updateSetting("format", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    {PAGE_NUMBER_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {t(`pdfpagenumber_format_${format}`)}
                      </option>
                    ))}
                  </select>
                </label>

                {settings.format === "custom" && (
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_custom_template_label")}</span>
                    <input
                      type="text"
                      value={settings.customTemplate}
                      onChange={(event) => updateSetting("customTemplate", event.target.value)}
                      placeholder={t("pdfpagenumber_custom_template_placeholder")}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="mt-2 text-xs text-gray-500">{t("pdfpagenumber_custom_template_help")}</p>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_font_family_label")}</span>
                  <select value={settings.fontFamily} onChange={(event) => updateSetting("fontFamily", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    {presetFonts.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                    {localFonts.length > 0 && (
                      <optgroup label={t("pdfpagenumber_system_fonts_group")}>
                        {localFonts.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.family}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={loadLocalFonts} disabled={isLoadingFonts} className={`rounded border px-3 py-2 text-xs font-medium ${isLoadingFonts ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"}`}>
                      {isLoadingFonts ? t("pdfpagenumber_font_detect_loading") : t("pdfpagenumber_font_detect_button")}
                    </button>
                    {fontLoadMessage && <span className="text-xs text-gray-500">{fontLoadMessage}</span>}
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_font_size_label")}</span>
                  <input type="number" min="8" max="72" value={settings.fontSize} onChange={(event) => updateSetting("fontSize", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_font_weight_label")}</span>
                  <select value={settings.fontWeight} onChange={(event) => updateSetting("fontWeight", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    {PAGE_NUMBER_WEIGHTS.map((weight) => (
                      <option key={weight} value={weight}>
                        {t(`pdfpagenumber_font_weight_${weight}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_start_number_label")}</span>
                  <input type="number" value={settings.startNumber} onChange={(event) => updateSetting("startNumber", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_color_label")}</span>
                  <div className="flex items-center gap-3 rounded border border-gray-300 px-3 py-2">
                    <input type="color" value={settings.color} onChange={(event) => updateSetting("color", event.target.value)} className="h-8 w-10 rounded border-0 bg-transparent p-0" />
                    <span className="text-sm text-gray-700">{settings.color}</span>
                  </div>
                </label>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-base font-semibold text-gray-950">{t("pdfpagenumber_scope_title")}</h3>
                <p className="mt-1 text-sm text-gray-600">{t("pdfpagenumber_scope_hint")}</p>

                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {PAGE_SELECTION_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateSetting("pageMode", mode)}
                        className={`rounded border px-3 py-2.5 text-sm font-medium ${settings.pageMode === mode ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"}`}
                      >
                        {t(`pdfpagenumber_page_mode_${mode}`)}
                      </button>
                    ))}
                  </div>

                  {settings.pageMode === "custom" && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-900">{t("pdfpagenumber_page_range_label")}</span>
                      <input
                        type="text"
                        value={settings.pageRange}
                        onChange={(event) => updateSetting("pageRange", event.target.value)}
                        placeholder={t("pdfpagenumber_custom_pages_placeholder")}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                      <p className="mt-2 text-xs text-gray-500">{t("pdfpagenumber_page_range_help")}</p>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="whitespace-pre-wrap text-sm text-gray-700">{modalMessage}</div>
        <div className="mt-6 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t("pdfpagenumber_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
