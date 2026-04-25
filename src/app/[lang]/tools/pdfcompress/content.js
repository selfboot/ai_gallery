"use client";

import { useState } from "react";
import PizZip from "pizzip";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  PDF_COMPRESS_PRESETS,
  formatFileSize,
  getCompressionSummary,
  getPresetConfig,
  makeCompressedPdfName,
  makeCompressedPdfZipName,
  makeUniqueFileName,
  summarizePdfCompression,
} from "./logic";

const DEFAULT_SETTINGS = {
  mode: "structure",
  preset: "balanced",
  keepOriginalIfLarger: true,
};

const PDFJS_BASE_URL = (process.env.NEXT_PUBLIC_PDFJS_BASE_URL || "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149").replace(/\/$/, "");
const PDFJS_MODULE_URL = `${PDFJS_BASE_URL}/pdf.mjs`;
const PDFJS_WORKER_URL = `${PDFJS_BASE_URL}/pdf.worker.mjs`;

let pdfjsPromise = null;

async function loadPdfJs() {
  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = (async () => {
    const pdfjsLib = await import(/* webpackIgnore: true */ PDFJS_MODULE_URL);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return pdfjsLib;
  })();

  return pdfjsPromise;
}

function makePdfId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
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

async function optimizePdfStructure(pdfBytes) {
  const sourcePdf = await PDFDocument.load(pdfBytes.slice(), { ignoreEncryption: true });
  return sourcePdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
}

async function rasterizePdfToCompressedPdf({ pdfBytes, settings, onProgress }) {
  const pdfjsLib = await loadPdfJs();
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
  const pdf = await loadingTask.promise;
  const outputPdf = await PDFDocument.create();
  const preset = getPresetConfig(settings.preset);

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress(pageNumber, pdf.numPages);

      const page = await pdf.getPage(pageNumber);
      const pageViewport = page.getViewport({ scale: 1 });
      const renderViewport = page.getViewport({ scale: preset.scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);

      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: renderViewport,
        background: "white",
      }).promise;

      const imageBlob = await canvasToBlob(canvas, "image/jpeg", preset.jpegQuality);
      const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
      const image = await outputPdf.embedJpg(imageBytes);
      const outputPage = outputPdf.addPage([pageViewport.width, pageViewport.height]);
      outputPage.drawImage(image, {
        x: 0,
        y: 0,
        width: pageViewport.width,
        height: pageViewport.height,
      });

      page.cleanup();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      // Ignore cleanup errors from pdf.js.
    }
  }

  return outputPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
}

async function loadPdfInfo(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(bytes.slice(), { ignoreEncryption: true });
  return {
    id: makePdfId(file),
    file,
    bytes,
    name: file.name,
    size: file.size,
    pageCount: pdfDoc.getPageCount(),
  };
}

async function compressOnePdf(item, settings, usedNames, onProgress) {
  let outputBytes;
  if (settings.mode === "image") {
    outputBytes = await rasterizePdfToCompressedPdf({
      pdfBytes: item.bytes,
      settings,
      onProgress,
    });
  } else {
    outputBytes = await optimizePdfStructure(item.bytes);
  }

  const compressedBlob = new Blob([outputBytes], { type: "application/pdf" });
  const originalBlob = new Blob([item.bytes], { type: "application/pdf" });
  const shouldKeepOriginal = settings.keepOriginalIfLarger && compressedBlob.size >= item.size;
  const outputBlob = shouldKeepOriginal ? originalBlob : compressedBlob;
  const outputName = makeUniqueFileName(shouldKeepOriginal ? item.name : makeCompressedPdfName(item.name), usedNames);
  const summary = getCompressionSummary(item.size, outputBlob.size);

  return {
    id: item.id,
    name: item.name,
    outputName,
    pageCount: item.pageCount,
    originalSize: item.size,
    outputSize: outputBlob.size,
    savingPercent: summary.savingPercent,
    isSmaller: summary.isSmaller,
    blob: outputBlob,
    mode: settings.mode,
    keptOriginal: shouldKeepOriginal,
  };
}

export default function PdfCompressContent() {
  const { t } = useI18n();
  const [pdfs, setPdfs] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const summary = summarizePdfCompression(results);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const clearResults = () => {
    setResults([]);
    setStatusMessage("");
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    clearResults();
  };

  const handleFileUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        errors.push(`${file.name}: ${t("pdfcompress_error_invalid_format")}`);
        return false;
      }
      if (pdfs.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("pdfcompress_file_exists")}`);
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
    setProgressText(t("pdfcompress_reading"));
    try {
      const loadedPdfs = await Promise.all(validFiles.map(loadPdfInfo));
      setPdfs((current) => [...current, ...loadedPdfs]);
      setResults([]);
      setStatusMessage(t("pdfcompress_files_added", { count: loadedPdfs.length }));
    } catch (error) {
      console.error("PDF compress read failed:", error);
      showModal(t("pdfcompress_error_read"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const removePdf = (index) => {
    setPdfs((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setResults([]);
  };

  const clearAll = () => {
    setPdfs([]);
    setResults([]);
    setStatusMessage("");
    setProgressText("");
  };

  const compressPdfs = async () => {
    if (pdfs.length === 0) {
      showModal(t("pdfcompress_error_missing_file"), "error");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("");
    setResults([]);

    try {
      const nextResults = [];
      const usedNames = new Set();
      for (let index = 0; index < pdfs.length; index += 1) {
        const item = pdfs[index];
        if (settings.mode === "structure") {
          setProgressText(t("pdfcompress_progress_file", { current: index + 1, total: pdfs.length, name: item.name }));
        }
        const result = await compressOnePdf(item, settings, usedNames, (page, totalPages) => {
          setProgressText(t("pdfcompress_progress_page", { current: index + 1, total: pdfs.length, page, pages: totalPages }));
        });
        nextResults.push(result);
        setResults([...nextResults]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      setStatusMessage(t("pdfcompress_success_batch", { count: nextResults.length }));
    } catch (error) {
      console.error("PDF compression failed:", error);
      showModal(t("pdfcompress_error_process"), "error");
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
      showModal(t("pdfcompress_error_no_result"), "error");
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
    saveAs(content, makeCompressedPdfZipName());
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfcompress_upload_title")}</h2>
          <FileUploadBox accept=".pdf" multiple onChange={handleFileUpload} title={t("pdfcompress_upload_hint")} maxSize={180} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("pdfcompress_upload_note")}</p>
          {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfcompress_settings_title")}</h2>
          <div className="space-y-4">
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("pdfcompress_mode")}</span>
              <select value={settings.mode} onChange={(event) => updateSetting("mode", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="structure">{t("pdfcompress_mode_structure")}</option>
                <option value="image">{t("pdfcompress_mode_image")}</option>
              </select>
              <span className="mt-1 block text-xs text-gray-500">
                {settings.mode === "structure" ? t("pdfcompress_mode_structure_hint") : t("pdfcompress_mode_image_hint")}
              </span>
            </label>

            {settings.mode === "image" && (
              <label className="block text-sm text-gray-700">
                <span className="block font-medium mb-1">{t("pdfcompress_preset")}</span>
                <select value={settings.preset} onChange={(event) => updateSetting("preset", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                  {Object.entries(PDF_COMPRESS_PRESETS).map(([key, option]) => (
                    <option key={key} value={key}>{t(option.labelKey)}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-gray-500">{t(getPresetConfig(settings.preset).descriptionKey)}</span>
              </label>
            )}

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={settings.keepOriginalIfLarger} onChange={(event) => updateSetting("keepOriginalIfLarger", event.target.checked)} className="mt-1" />
              <span>{t("pdfcompress_keep_original")}</span>
            </label>

            <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              {t("pdfcompress_limit_note")}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("pdfcompress_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("pdfcompress_privacy_note")}</p>
            {progressText && <p className="text-sm text-blue-700 mt-2">{progressText}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={compressPdfs} disabled={isProcessing || pdfs.length === 0} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || pdfs.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("pdfcompress_processing") : t("pdfcompress_button", { count: pdfs.length })}
            </button>
            <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className={`px-5 py-3 rounded font-medium ${results.length === 0 || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"}`}>
              {t("pdfcompress_download_all")}
            </button>
            <button onClick={clearAll} disabled={isProcessing || pdfs.length === 0} className={`px-5 py-3 rounded font-medium ${pdfs.length === 0 || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("pdfcompress_clear")}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfcompress_result_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdfcompress_original_size")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatFileSize(summary.originalSize)}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdfcompress_output_size")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatFileSize(summary.outputSize)}</p>
            </div>
            <div className={`rounded border p-4 ${summary.savingPercent > 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
              <p className={`text-sm ${summary.savingPercent > 0 ? "text-green-700" : "text-yellow-700"}`}>{t("pdfcompress_saved")}</p>
              <p className={`mt-1 text-2xl font-bold ${summary.savingPercent > 0 ? "text-green-700" : "text-yellow-700"}`}>
                {summary.savingPercent > 0 ? `${summary.savingPercent}%` : t("pdfcompress_no_smaller")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 min-h-56">
        <h2 className="text-xl font-semibold mb-1">{t("pdfcompress_files_title", { count: pdfs.length })}</h2>
        <p className="text-sm text-gray-600 mb-4">{t("pdfcompress_files_hint")}</p>
        {pdfs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pdfs.map((item, index) => {
              const result = results.find((entry) => entry.id === item.id);
              return (
                <div key={item.id} className="flex min-h-full flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="relative flex aspect-[4/3] items-center justify-center bg-gray-50 p-4">
                    <div className="flex h-24 w-20 items-center justify-center rounded border border-red-100 bg-white text-lg font-bold text-red-600 shadow-sm">PDF</div>
                    <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                      {t("pdfcompress_page_count", { count: item.pageCount })}
                    </span>
                    {result && (
                      <span className={`absolute right-2 top-2 rounded px-2 py-1 text-xs font-semibold shadow-sm ${result.savingPercent > 0 ? "bg-green-600 text-white" : "bg-gray-700 text-white"}`}>
                        {result.savingPercent > 0 ? t("pdfcompress_saved_percent", { value: result.savingPercent }) : t("pdfcompress_no_smaller")}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-3">
                    <p className="font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded bg-gray-50 px-2 py-2">
                        <p className="text-xs text-gray-500">{t("pdfcompress_original_size")}</p>
                        <p className="mt-1 font-semibold text-gray-900">{formatFileSize(item.size)}</p>
                      </div>
                      <div className="rounded bg-blue-50 px-2 py-2">
                        <p className="text-xs text-blue-700">{t("pdfcompress_output_size")}</p>
                        <p className="mt-1 font-semibold text-blue-900">{result ? formatFileSize(result.outputSize) : "-"}</p>
                      </div>
                    </div>
                    {result && (
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <p className="truncate" title={result.outputName}>{result.outputName}</p>
                        <p>{t(result.mode === "structure" ? "pdfcompress_result_structure" : "pdfcompress_result_image")}</p>
                        {result.keptOriginal && <p className="inline-block rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700">{t("pdfcompress_result_kept_original")}</p>}
                      </div>
                    )}
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                      <button onClick={() => result && downloadOne(result)} disabled={!result} className={`rounded px-3 py-2 text-sm font-medium ${result ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>
                        {t("pdfcompress_download_one")}
                      </button>
                      <button onClick={() => removePdf(index)} disabled={isProcessing} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">{t("pdfcompress_delete")}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-24 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-4 text-sm text-gray-500">
            {t("pdfcompress_upload_hint")}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("pdfcompress_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
