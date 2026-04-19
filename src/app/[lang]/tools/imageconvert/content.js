"use client";

import { useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  IMAGE_CONVERT_FORMATS,
  calculateChangePercent,
  formatFileSize,
  getFormatFromMime,
  getMimeFromFormat,
  makeConvertedFileName,
  makeUniqueFileName,
  summarizeConvertedImages,
} from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.avif";
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const DEFAULT_SETTINGS = {
  outputFormat: "webp",
  quality: 0.88,
};

function makeImageId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function formatLabel(format) {
  return format === "jpeg" ? "JPG" : String(format || "").toUpperCase();
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
        format: getFormatFromMime(file.type),
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
        if (blob && blob.type === mimeType) {
          resolve(blob);
        } else {
          reject(new Error(`canvas export failed for ${mimeType}`));
        }
      },
      mimeType,
      quality
    );
  });
}

async function encodeAvifImage(imageData, quality) {
  const { encode } = await import("@jsquash/avif");
  const outputBuffer = await encode(imageData, {
    quality: Math.round(quality * 100),
    qualityAlpha: -1,
    speed: 6,
    bitDepth: 8,
  });

  return new Blob([outputBuffer], { type: "image/avif" });
}

async function convertOneImage(item, settings, usedNames) {
  const image = await fileToImage(item.file);
  const mimeType = getMimeFromFormat(settings.outputFormat);
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

  if (typeof image.close === "function") {
    image.close();
  }

  const blob = mimeType === "image/avif"
    ? await encodeAvifImage(context.getImageData(0, 0, canvas.width, canvas.height), settings.quality)
    : await canvasToBlob(canvas, mimeType, settings.quality);
  return {
    id: item.id,
    name: item.name,
    outputName: makeUniqueFileName(makeConvertedFileName(item.name, settings.outputFormat), usedNames),
    originalSize: item.size,
    outputSize: blob.size,
    changePercent: calculateChangePercent(item.size, blob.size),
    width: item.width,
    height: item.height,
    outputType: mimeType,
    outputFormat: settings.outputFormat,
    blob,
    previewUrl: URL.createObjectURL(blob),
  };
}

export default function ImageConvertContent() {
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

  const summary = summarizeConvertedImages(results);

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
        errors.push(`${file.name}: ${t("imageconvert_invalid_format")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("imageconvert_file_exists")}`);
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
      setStatusMessage(t("imageconvert_files_added", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imageconvert_read_error"), "error");
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
      clearResultUrls(current);
      return [];
    });
  };

  const clearImages = () => {
    images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    clearResultUrls(results);
    setImages([]);
    setResults([]);
    setProgressText("");
    setStatusMessage("");
  };

  const convertImages = async () => {
    if (images.length === 0) {
      showModal(t("imageconvert_min_files_error"), "error");
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
      for (let index = 0; index < images.length; index += 1) {
        setProgressText(t("imageconvert_progress", { current: index + 1, total: images.length }));
        const result = await convertOneImage(images[index], settings, usedNames);
        nextResults.push(result);
        setResults([...nextResults]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      setStatusMessage(t("imageconvert_success", { count: nextResults.length }));
    } catch (error) {
      console.error("Image conversion failed:", error);
      showModal(t(settings.outputFormat === "avif" ? "imageconvert_avif_error" : "imageconvert_convert_error"), "error");
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
      showModal(t("imageconvert_no_result_error"), "error");
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
    saveAs(content, `converted_images_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`);
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("imageconvert_upload_title")}</h2>
          <FileUploadBox accept={IMAGE_ACCEPT} multiple onChange={handleFileUpload} title={t("imageconvert_upload_hint")} maxSize={80} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("imageconvert_upload_note")}</p>
          {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("imageconvert_settings_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("imageconvert_output_format")}</span>
              <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                {IMAGE_CONVERT_FORMATS.map((item) => (
                  <option key={item} value={item}>{t(`imageconvert_format_${item}`)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("imageconvert_quality", { value: Math.round(settings.quality * 100) })}</span>
              <input type="range" min="0.55" max="0.96" step="0.01" value={settings.quality} onChange={(event) => updateSetting("quality", Number(event.target.value))} className="w-full" disabled={settings.outputFormat === "png"} />
              {settings.outputFormat === "png" && <span className="mt-1 block text-xs text-gray-500">{t("imageconvert_png_hint")}</span>}
            </label>
            <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 md:col-span-2">
              {settings.outputFormat === "jpeg" ? t("imageconvert_jpg_alpha_hint") : t("imageconvert_local_note")}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("imageconvert_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("imageconvert_privacy_note")}</p>
            {progressText && <p className="text-sm text-blue-700 mt-2">{progressText}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={convertImages} disabled={isProcessing || images.length === 0} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || images.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("imageconvert_processing") : t("imageconvert_convert_button", { count: images.length })}
            </button>
            <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className={`px-5 py-3 rounded font-medium ${results.length === 0 || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"}`}>
              {t("imageconvert_download_all")}
            </button>
            <button onClick={clearImages} disabled={isProcessing || images.length === 0} className={`px-5 py-3 rounded font-medium ${images.length === 0 || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("imageconvert_clear_all")}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("imageconvert_result_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("imageconvert_original_total")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatFileSize(summary.originalSize)}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("imageconvert_output_total")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatFileSize(summary.outputSize)}</p>
            </div>
            <div className={`rounded border p-4 ${summary.changePercent <= 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
              <p className={`text-sm ${summary.changePercent <= 0 ? "text-green-700" : "text-yellow-700"}`}>{t("imageconvert_size_change")}</p>
              <p className={`mt-1 text-2xl font-bold ${summary.changePercent <= 0 ? "text-green-700" : "text-yellow-700"}`}>{summary.changePercent > 0 ? "+" : ""}{summary.changePercent}%</p>
            </div>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-1">{t("imageconvert_images_title", { count: images.length })}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("imageconvert_images_hint")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((item, index) => {
              const result = results.find((entry) => entry.id === item.id);
              const previewUrl = result?.previewUrl || item.previewUrl;
              return (
                <div key={item.id} className="flex min-h-full flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img src={previewUrl} alt={result?.outputName || item.name} className="max-h-full max-w-full object-contain" />
                    <span className="absolute left-2 top-2 rounded bg-gray-800 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                      {formatLabel(item.format)} → {formatLabel(settings.outputFormat)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-3">
                    <p className="font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.width} × {item.height}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded bg-gray-50 px-2 py-2">
                        <p className="text-xs text-gray-500">{t("imageconvert_original_size")}</p>
                        <p className="mt-1 font-semibold text-gray-900">{formatFileSize(item.size)}</p>
                      </div>
                      <div className="rounded bg-blue-50 px-2 py-2">
                        <p className="text-xs text-blue-700">{t("imageconvert_output_size")}</p>
                        <p className="mt-1 font-semibold text-blue-900">{result ? formatFileSize(result.outputSize) : "-"}</p>
                      </div>
                    </div>
                    {result && (
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <p className="truncate" title={result.outputName}>{result.outputName}</p>
                        <p>{result.width} × {result.height}</p>
                        <p className={result.changePercent <= 0 ? "text-green-700" : "text-yellow-700"}>
                          {t("imageconvert_item_change", { value: `${result.changePercent > 0 ? "+" : ""}${result.changePercent}` })}
                        </p>
                      </div>
                    )}
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                      <button onClick={() => result && downloadOne(result)} disabled={!result} className={`rounded px-3 py-2 text-sm font-medium ${result ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>
                        {t("imageconvert_download_one")}
                      </button>
                      <button onClick={() => removeImage(index)} disabled={isProcessing} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">{t("imageconvert_delete")}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("imageconvert_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
