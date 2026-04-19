"use client";

import { useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  PDF_IMAGE_SCALE_OPTIONS,
  formatFileSize,
  getImageMimeType,
  makePageImageName,
  makeZipName,
  summarizeImages,
} from "./logic";

const DEFAULT_SETTINGS = {
  format: "jpg",
  scale: 2,
  jpegQuality: 0.9,
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

async function renderPdfPages({ pdfBytes, fileName, settings, onProgress }) {
  const pdfjsLib = await loadPdfJs();
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  const outputs = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress(pageNumber, pdf.numPages);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: Number(settings.scale) || 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
        background: "white",
      }).promise;

      const mimeType = getImageMimeType(settings.format);
      const blob = await canvasToBlob(canvas, mimeType, settings.jpegQuality);
      outputs.push({
        id: `${pageNumber}-${blob.size}`,
        pageNumber,
        name: makePageImageName(fileName, pageNumber, settings.format),
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
        blob,
        previewUrl: URL.createObjectURL(blob),
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

  return outputs;
}

export default function PdfImageContent() {
  const { t } = useI18n();
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [outputs, setOutputs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const summary = summarizeImages(outputs);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const clearOutputUrls = (items) => {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setOutputs((current) => {
      clearOutputUrls(current);
      return [];
    });
    setStatusMessage("");
  };

  const handleFileUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showModal(t("pdfimage_error_invalid_format"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText(t("pdfimage_reading"));
    setStatusMessage("");
    setPdfFile(null);
    setPdfBytes(null);
    setPageCount(0);
    setOutputs((current) => {
      clearOutputUrls(current);
      return [];
    });

    try {
      const pdfjsLib = await loadPdfJs();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
      const pdf = await loadingTask.promise;
      const total = pdf.numPages;
      await loadingTask.destroy();

      setPdfFile(file);
      setPdfBytes(bytes);
      setPageCount(total);
      setStatusMessage(t("pdfimage_loaded", { count: total }));
    } catch (error) {
      console.error("PDF image read failed:", error);
      showModal(t("pdfimage_error_read"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const convertPdf = async () => {
    if (!pdfBytes || !pdfFile) {
      showModal(t("pdfimage_error_missing_file"), "error");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("");
    setOutputs((current) => {
      clearOutputUrls(current);
      return [];
    });

    try {
      const nextOutputs = await renderPdfPages({
        pdfBytes: pdfBytes.slice(),
        fileName: pdfFile.name,
        settings,
        onProgress: (current, total) => setProgressText(t("pdfimage_progress", { current, total })),
      });
      setOutputs(nextOutputs);
      setStatusMessage(t("pdfimage_success", { count: nextOutputs.length }));
    } catch (error) {
      console.error("PDF to image failed:", error);
      showModal(t("pdfimage_error_convert"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const downloadOne = (item) => {
    saveAs(item.blob, item.name);
  };

  const downloadAll = async () => {
    if (outputs.length === 0) {
      showModal(t("pdfimage_error_no_result"), "error");
      return;
    }

    const zip = new PizZip();
    for (const item of outputs) {
      zip.file(item.name, await item.blob.arrayBuffer());
    }
    const content = zip.generate({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    saveAs(content, makeZipName(pdfFile?.name));
  };

  const clearAll = () => {
    setPdfFile(null);
    setPdfBytes(null);
    setPageCount(0);
    setStatusMessage("");
    setProgressText("");
    setOutputs((current) => {
      clearOutputUrls(current);
      return [];
    });
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfimage_upload_title")}</h2>
          <FileUploadBox accept=".pdf" onChange={handleFileUpload} title={t("pdfimage_upload_hint")} maxSize={120} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("pdfimage_upload_note")}</p>
          {pdfFile && (
            <div className="mt-4 rounded border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">{pdfFile.name}</p>
              <p>{formatFileSize(pdfFile.size)} · {t("pdfimage_page_count", { count: pageCount })}</p>
            </div>
          )}
          {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfimage_settings_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("pdfimage_output_format")}</span>
              <select value={settings.format} onChange={(event) => updateSetting("format", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                {["jpg", "png"].map((item) => (
                  <option key={item} value={item}>{t(`pdfimage_format_${item}`)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("pdfimage_scale")}</span>
              <select value={settings.scale} onChange={(event) => updateSetting("scale", Number(event.target.value))} className="w-full border border-gray-300 rounded px-3 py-2">
                {Object.entries(PDF_IMAGE_SCALE_OPTIONS).map(([value, option]) => (
                  <option key={value} value={value}>{t(option.labelKey)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700 md:col-span-2">
              <span className="block font-medium mb-1">{t("pdfimage_jpg_quality", { value: Math.round(settings.jpegQuality * 100) })}</span>
              <input type="range" min="0.65" max="0.96" step="0.01" value={settings.jpegQuality} onChange={(event) => updateSetting("jpegQuality", Number(event.target.value))} className="w-full" disabled={settings.format === "png"} />
              {settings.format === "png" && <span className="mt-1 block text-xs text-gray-500">{t("pdfimage_png_quality_hint")}</span>}
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("pdfimage_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("pdfimage_privacy_note")}</p>
            {progressText && <p className="text-sm text-blue-700 mt-2">{progressText}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={convertPdf} disabled={isProcessing || !pdfFile} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || !pdfFile ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("pdfimage_processing") : t("pdfimage_convert_button")}
            </button>
            <button onClick={downloadAll} disabled={isProcessing || outputs.length === 0} className={`px-5 py-3 rounded font-medium ${outputs.length === 0 || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"}`}>
              {t("pdfimage_download_all")}
            </button>
            <button onClick={clearAll} disabled={isProcessing || !pdfFile} className={`px-5 py-3 rounded font-medium ${!pdfFile || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("pdfimage_clear_all")}
            </button>
          </div>
        </div>
      </div>

      {outputs.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdfimage_result_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.count}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdfimage_result_total_size")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatFileSize(summary.totalSize)}</p>
            </div>
            <div className="rounded border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">{t("pdfimage_result_format")}</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{settings.format.toUpperCase()}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-1">{t("pdfimage_images_title", { count: outputs.length })}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("pdfimage_images_hint")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {outputs.map((item) => (
              <div key={item.id} className="flex min-h-full flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={item.previewUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
                  <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-sm">
                    {t("pdfimage_page_badge", { page: item.pageNumber })}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-3">
                  <p className="font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded bg-gray-50 px-2 py-2">
                      <p className="text-xs text-gray-500">{t("pdfimage_image_size")}</p>
                      <p className="mt-1 font-semibold text-gray-900">{formatFileSize(item.size)}</p>
                    </div>
                    <div className="rounded bg-blue-50 px-2 py-2">
                      <p className="text-xs text-blue-700">{t("pdfimage_image_dimensions")}</p>
                      <p className="mt-1 font-semibold text-blue-900">{item.width} × {item.height}</p>
                    </div>
                  </div>
                  <button onClick={() => downloadOne(item)} className="mt-auto rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    {t("pdfimage_download_one")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("pdfimage_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
