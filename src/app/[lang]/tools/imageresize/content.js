"use client";

import { useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  OUTPUT_FORMATS,
  formatFileSize,
  getDrawPlan,
  getMimeFromOutputFormat,
  getTargetSize,
  makeOutputFileName,
  makeZipName,
  summarizeResults,
} from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEFAULT_SETTINGS = {
  resizeMode: "fit",
  targetWidth: 1200,
  targetHeight: 1200,
  exactMode: "squash",
  cropPosition: "center",
  fitBy: "width",
  scalePercent: 100,
  outputFormat: "original",
  quality: 0.9,
};

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

async function processOneImage(item, settings) {
  const image = await fileToImage(item.file);
  const targetSize = getTargetSize(item, settings);
  const drawPlan = getDrawPlan(item, settings, targetSize);
  const mimeType = getMimeFromOutputFormat(settings.outputFormat, item.type);
  const flattenBackground = mimeType === "image/jpeg";
  const canvas = document.createElement("canvas");
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext("2d", { alpha: !flattenBackground });
  if (flattenBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(
    image,
    drawPlan.sourceX,
    drawPlan.sourceY,
    drawPlan.sourceWidth,
    drawPlan.sourceHeight,
    drawPlan.destX,
    drawPlan.destY,
    drawPlan.destWidth,
    drawPlan.destHeight
  );

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
    originalWidth: item.width,
    originalHeight: item.height,
    width: targetSize.width,
    height: targetSize.height,
    blob,
    previewUrl: URL.createObjectURL(blob),
  };
}

export default function ImageCropResizeContent() {
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

  const summary = summarizeResults(results);
  const resultMap = new Map(results.map((item) => [item.id, item]));

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
        errors.push(`${file.name}: ${t("imageresize_invalid_format")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("imageresize_file_exists")}`);
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
      setStatusMessage(t("imageresize_files_added", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imageresize_read_error"), "error");
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

  const processImages = async () => {
    if (images.length === 0) {
      showModal(t("imageresize_min_files_error"), "error");
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
        setProgressText(t("imageresize_progress", { current: index + 1, total: images.length }));
        const result = await processOneImage(images[index], settings);
        nextResults.push(result);
        setResults([...nextResults]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      setStatusMessage(t("imageresize_success", { count: nextResults.length }));
    } catch (error) {
      console.error("Batch resize failed:", error);
      showModal(t("imageresize_process_error"), "error");
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
      showModal(t("imageresize_no_results"), "error");
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

  const showSizeInputs = settings.resizeMode === "exact" || settings.resizeMode === "fit";

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("imageresize_upload_title")}</h2>
          <FileUploadBox accept={IMAGE_ACCEPT} multiple onChange={handleFileUpload} title={t("imageresize_upload_hint")} maxSize={40} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("imageresize_upload_note")}</p>
          {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("imageresize_settings_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700 md:col-span-2">
              <span className="block mb-1 font-medium">{t("imageresize_resize_mode")}</span>
              <select value={settings.resizeMode} onChange={(event) => updateSetting("resizeMode", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                <option value="exact">{t("imageresize_resize_mode_exact")}</option>
                <option value="fit">{t("imageresize_resize_mode_fit")}</option>
                <option value="scale">{t("imageresize_resize_mode_scale")}</option>
              </select>
            </label>

            {showSizeInputs && (
              <>
                {settings.resizeMode === "exact" ? (
                  <>
                    <label className="text-sm text-gray-700">
                      <span className="block mb-1 font-medium">{t("imageresize_target_width")}</span>
                      <input type="number" min="1" value={settings.targetWidth} onChange={(event) => updateSetting("targetWidth", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                    </label>
                    <label className="text-sm text-gray-700">
                      <span className="block mb-1 font-medium">{t("imageresize_target_height")}</span>
                      <input type="number" min="1" value={settings.targetHeight} onChange={(event) => updateSetting("targetHeight", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="text-sm text-gray-700 md:col-span-2">
                      <span className="block mb-1 font-medium">{t("imageresize_fit_by")}</span>
                      <select value={settings.fitBy} onChange={(event) => updateSetting("fitBy", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                        <option value="width">{t("imageresize_fit_by_width")}</option>
                        <option value="height">{t("imageresize_fit_by_height")}</option>
                      </select>
                    </label>
                    {settings.fitBy === "width" ? (
                      <label className="text-sm text-gray-700">
                        <span className="block mb-1 font-medium">{t("imageresize_target_width")}</span>
                        <input type="number" min="1" value={settings.targetWidth} onChange={(event) => updateSetting("targetWidth", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                      </label>
                    ) : (
                      <label className="text-sm text-gray-700">
                        <span className="block mb-1 font-medium">{t("imageresize_target_height")}</span>
                        <input type="number" min="1" value={settings.targetHeight} onChange={(event) => updateSetting("targetHeight", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                      </label>
                    )}
                  </>
                )}
              </>
            )}

            {settings.resizeMode === "exact" && (
              <>
                <label className="text-sm text-gray-700 md:col-span-2">
                  <span className="block mb-1 font-medium">{t("imageresize_exact_mode")}</span>
                  <select value={settings.exactMode} onChange={(event) => updateSetting("exactMode", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                    <option value="squash">{t("imageresize_exact_mode_squash")}</option>
                    <option value="crop">{t("imageresize_exact_mode_crop")}</option>
                  </select>
                </label>
                {settings.exactMode === "crop" && (
                  <label className="text-sm text-gray-700 md:col-span-2">
                    <span className="block mb-1 font-medium">{t("imageresize_crop_position")}</span>
                    <select value={settings.cropPosition} onChange={(event) => updateSetting("cropPosition", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                      <option value="top-left">{t("imageresize_crop_position_top_left")}</option>
                      <option value="top">{t("imageresize_crop_position_top")}</option>
                      <option value="top-right">{t("imageresize_crop_position_top_right")}</option>
                      <option value="left">{t("imageresize_crop_position_left")}</option>
                      <option value="center">{t("imageresize_crop_position_center")}</option>
                      <option value="right">{t("imageresize_crop_position_right")}</option>
                      <option value="bottom-left">{t("imageresize_crop_position_bottom_left")}</option>
                      <option value="bottom">{t("imageresize_crop_position_bottom")}</option>
                      <option value="bottom-right">{t("imageresize_crop_position_bottom_right")}</option>
                    </select>
                  </label>
                )}
              </>
            )}

            {settings.resizeMode === "scale" && (
              <label className="text-sm text-gray-700 md:col-span-2">
                <span className="block mb-1 font-medium">{t("imageresize_scale_percent", { value: settings.scalePercent })}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="300"
                    step="1"
                    value={settings.scalePercent}
                    onChange={(event) => updateSetting("scalePercent", event.target.value)}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="1"
                    max="300"
                    step="1"
                    value={settings.scalePercent}
                    onChange={(event) => updateSetting("scalePercent", event.target.value)}
                    className="w-24 rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </label>
            )}

            <label className="text-sm text-gray-700 md:col-span-2">
              <span className="block mb-1 font-medium">{t("imageresize_output_format")}</span>
              <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                {Object.entries(OUTPUT_FORMATS).map(([key, option]) => (
                  <option key={key} value={key}>{t(option.labelKey)}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-gray-500">{t("imageresize_settings_note")}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("imageresize_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("imageresize_privacy_note")}</p>
            {progressText && <p className="text-sm text-blue-700 mt-2">{progressText}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={processImages} disabled={isProcessing || images.length === 0} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || images.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("imageresize_processing") : t("imageresize_process_button", { count: images.length })}
            </button>
            <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className={`px-5 py-3 rounded font-medium ${isProcessing || results.length === 0 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
              {t("imageresize_download_all")}
            </button>
            <button onClick={clearImages} disabled={isProcessing || (images.length === 0 && results.length === 0)} className={`px-5 py-3 rounded font-medium ${isProcessing || (images.length === 0 && results.length === 0) ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("imageresize_clear")}
            </button>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">{t("imageresize_images_title", { count: images.length })}</h2>
              <p className="text-sm text-gray-600">{t("imageresize_images_hint")}</p>
              {results.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {t("imageresize_results_summary", {
                    original: formatFileSize(summary.originalSize),
                    output: formatFileSize(summary.outputSize),
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {images.map((item, index) => (
              <div key={item.id} className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={(resultMap.get(item.id) || item).previewUrl}
                    alt={(resultMap.get(item.id) || item).outputName || item.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="p-2.5">
                  <p className="font-medium text-sm text-gray-900 truncate" title={item.name}>{item.name}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{item.width} × {item.height} · {formatFileSize(item.size)}</p>
                  {resultMap.get(item.id) && (
                    <>
                      <p className="mt-1 text-[11px] text-blue-700">
                        {t("imageresize_output_size", {
                          width: resultMap.get(item.id).width,
                          height: resultMap.get(item.id).height,
                        })}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {formatFileSize(resultMap.get(item.id).outputSize)}
                      </p>
                    </>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {resultMap.get(item.id) && (
                      <button onClick={() => downloadOne(resultMap.get(item.id))} className="w-full rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">
                        {t("imageresize_download_one")}
                      </button>
                    )}
                  </div>
                  <button onClick={() => removeImage(index)} disabled={isProcessing} className="mt-3 w-full rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                    {t("imageresize_delete")}
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
            {t("imageresize_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
