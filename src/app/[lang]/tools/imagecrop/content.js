"use client";

import { useMemo, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  ASPECT_PRESETS,
  CROP_MODES,
  CROP_POSITIONS,
  OUTPUT_FORMATS,
  clampNumber,
  formatFileSize,
  getAspectRatio,
  getCropPlan,
  getMimeFromOutputFormat,
  makeOutputFileName,
  makeZipName,
  summarizeResults,
} from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEFAULT_SETTINGS = {
  cropMode: "inset",
  insetTop: 0,
  insetRight: 0,
  insetBottom: 0,
  insetLeft: 0,
  aspectPreset: "1:1",
  customAspectWidth: 1,
  customAspectHeight: 1,
  cropPosition: "center",
  outputFormat: "original",
  quality: 0.92,
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
  const cropPlan = getCropPlan(item, settings);
  const mimeType = getMimeFromOutputFormat(settings.outputFormat, item.type);
  const flattenBackground = mimeType === "image/jpeg";
  const canvas = document.createElement("canvas");
  canvas.width = cropPlan.width;
  canvas.height = cropPlan.height;

  const context = canvas.getContext("2d", { alpha: !flattenBackground });
  if (flattenBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(
    image,
    cropPlan.sourceX,
    cropPlan.sourceY,
    cropPlan.sourceWidth,
    cropPlan.sourceHeight,
    0,
    0,
    cropPlan.width,
    cropPlan.height
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
    width: cropPlan.width,
    height: cropPlan.height,
    blob,
    previewUrl: URL.createObjectURL(blob),
  };
}

export default function ImageCropContent() {
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
  const resultMap = useMemo(() => new Map(results.map((item) => [item.id, item])), [results]);
  const aspectRatio = useMemo(() => getAspectRatio(settings), [settings]);

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
        errors.push(`${file.name}: ${t("imagecrop_invalid_format")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("imagecrop_file_exists")}`);
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
      setStatusMessage(t("imagecrop_files_added", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imagecrop_read_error"), "error");
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
      showModal(t("imagecrop_min_files_error"), "error");
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
        setProgressText(t("imagecrop_progress", { current: index + 1, total: images.length }));
        const result = await processOneImage(images[index], settings);
        nextResults.push(result);
        setResults([...nextResults]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      setStatusMessage(t("imagecrop_success", { count: nextResults.length }));
    } catch (error) {
      console.error("Image crop failed:", error);
      showModal(t("imagecrop_process_error"), "error");
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
      showModal(t("imagecrop_no_results"), "error");
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
            <h2 className="text-xl font-semibold text-gray-950">{t("imagecrop_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagecrop_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept={IMAGE_ACCEPT} multiple onChange={handleFileUpload} title={t("imagecrop_upload_hint")} maxSize={60} className="min-h-32" />
            </div>
            {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagecrop_images_title", { count: images.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("imagecrop_images_hint")}</p>
              </div>
              {results.length > 0 && (
                <p className="text-sm text-gray-600">
                  {t("imagecrop_results_summary", {
                    original: formatFileSize(summary.originalSize),
                    output: formatFileSize(summary.outputSize),
                  })}
                </p>
              )}
            </div>

            {images.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("imagecrop_no_files")}</div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {images.map((item, index) => {
                  const result = resultMap.get(item.id);
                  return (
                    <div key={item.id} className="flex min-h-full flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                      <div className="aspect-[4/3] overflow-hidden bg-gray-50">
                        <img src={result?.previewUrl || item.previewUrl} alt={item.name} className="h-full w-full object-contain" />
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <p className="truncate text-sm font-medium text-gray-900" title={item.name}>{item.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.width} × {item.height}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded bg-gray-50 px-2 py-2">
                            <p className="text-gray-500">{t("imagecrop_original_size")}</p>
                            <p className="mt-1 font-semibold text-gray-900">{formatFileSize(item.size)}</p>
                          </div>
                          <div className="rounded bg-blue-50 px-2 py-2">
                            <p className="text-blue-700">{t("imagecrop_output_size")}</p>
                            <p className="mt-1 font-semibold text-blue-900">{result ? formatFileSize(result.outputSize) : "-"}</p>
                          </div>
                        </div>
                        {result && (
                          <div className="mt-3 space-y-1 text-xs text-gray-500">
                            <p>{t("imagecrop_output_dimensions", { width: result.width, height: result.height })}</p>
                          </div>
                        )}
                        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                          <button onClick={() => result && downloadOne(result)} disabled={!result} className={`rounded px-3 py-2 text-sm font-medium ${result ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-gray-200 text-gray-500"}`}>
                            {t("imagecrop_download_one")}
                          </button>
                          <button onClick={() => removeImage(index)} disabled={isProcessing} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                            {t("imagecrop_delete")}
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
            <h2 className="text-xl font-semibold text-gray-950">{t("imagecrop_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagecrop_settings_hint")}</p>

            <div className="mt-5 space-y-5">
              <div>
                <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagecrop_mode_label")}</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CROP_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateSetting("cropMode", mode)}
                      className={`rounded border px-3 py-2 text-sm font-medium ${settings.cropMode === mode ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:border-blue-200"}`}
                    >
                      {t(`imagecrop_mode_${mode}`)}
                    </button>
                  ))}
                </div>
              </div>

              {settings.cropMode === "inset" ? (
                <div className="grid grid-cols-2 gap-3">
                  {["Top", "Right", "Bottom", "Left"].map((side) => {
                    const key = `inset${side}`;
                    return (
                      <label key={key} className="block text-sm text-gray-700">
                        <span className="mb-2 block font-medium">{t(`imagecrop_inset_${side.toLowerCase()}`)}</span>
                        <input
                          type="number"
                          min="0"
                          max="45"
                          step="1"
                          value={settings[key]}
                          onChange={(event) => updateSetting(key, event.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2"
                        />
                      </label>
                    );
                  })}
                </div>
              ) : (
                <>
                  <label className="block text-sm text-gray-700">
                    <span className="mb-2 block font-medium">{t("imagecrop_aspect_label")}</span>
                    <select value={settings.aspectPreset} onChange={(event) => updateSetting("aspectPreset", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                      {ASPECT_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>{t(preset.labelKey)}</option>
                      ))}
                    </select>
                  </label>

                  {settings.aspectPreset === "custom" && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm text-gray-700">
                        <span className="mb-2 block font-medium">{t("imagecrop_custom_aspect_width")}</span>
                        <input type="number" min="1" max="999" step="1" value={settings.customAspectWidth} onChange={(event) => updateSetting("customAspectWidth", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-gray-700">
                        <span className="mb-2 block font-medium">{t("imagecrop_custom_aspect_height")}</span>
                        <input type="number" min="1" max="999" step="1" value={settings.customAspectHeight} onChange={(event) => updateSetting("customAspectHeight", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                      </label>
                    </div>
                  )}

                  <div>
                    <span className="mb-2 block text-sm font-medium text-gray-900">{t("imagecrop_position_label")}</span>
                    <div className="grid grid-cols-3 gap-2">
                      {CROP_POSITIONS.map((position) => (
                        <button
                          key={position}
                          type="button"
                          onClick={() => updateSetting("cropPosition", position)}
                          className={`rounded border px-2 py-2 text-xs font-medium ${settings.cropPosition === position ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:border-blue-200"}`}
                        >
                          {t(`imagecrop_position_${position.replace(/-/g, "_")}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imagecrop_output_format")}</span>
                <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  {Object.keys(OUTPUT_FORMATS).map((format) => (
                    <option key={format} value={format}>{t(OUTPUT_FORMATS[format].labelKey)}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imagecrop_quality_label", { value: Math.round(clampNumber(settings.quality, DEFAULT_SETTINGS.quality, 0.4, 1) * 100) })}</span>
                <input type="range" min="0.4" max="1" step="0.01" value={settings.quality} onChange={(event) => updateSetting("quality", Number(event.target.value))} className="w-full" disabled={settings.outputFormat === "png"} />
              </label>

              <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <div className="font-medium text-gray-900">{t("imagecrop_summary_title")}</div>
                <dl className="mt-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-gray-500">{t("imagecrop_mode_label")}</dt>
                    <dd>{t(`imagecrop_mode_${settings.cropMode}`)}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-gray-500">{t("imagecrop_output_format")}</dt>
                    <dd>{t(OUTPUT_FORMATS[settings.outputFormat].labelKey)}</dd>
                  </div>
                  {settings.cropMode === "aspect" && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-gray-500">{t("imagecrop_aspect_summary_label")}</dt>
                      <dd>{settings.aspectPreset === "custom" ? `${settings.customAspectWidth}:${settings.customAspectHeight}` : settings.aspectPreset} ({aspectRatio.toFixed(3)})</dd>
                    </div>
                  )}
                </dl>
              </div>

              <p className="text-xs leading-5 text-gray-500">{t("imagecrop_settings_note")}</p>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">{t("imagecrop_action_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagecrop_privacy_note")}</p>
            {progressText && <p className="mt-3 text-sm text-blue-700">{progressText}</p>}
            <div className="mt-4 flex flex-col gap-3">
              <button onClick={processImages} disabled={isProcessing || images.length === 0} className={`rounded px-5 py-3 font-medium text-white ${isProcessing || images.length === 0 ? "cursor-not-allowed bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                {isProcessing ? t("imagecrop_processing") : t("imagecrop_process_button", { count: images.length })}
              </button>
              <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className={`rounded px-5 py-3 font-medium ${results.length === 0 || isProcessing ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-green-600 text-white hover:bg-green-700"}`}>
                {t("imagecrop_download_all")}
              </button>
              <button onClick={clearImages} disabled={isProcessing || images.length === 0} className={`rounded px-5 py-3 font-medium ${images.length === 0 || isProcessing ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
                {t("imagecrop_clear")}
              </button>
            </div>
          </section>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="whitespace-pre-line text-gray-700">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            {t("imagecrop_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
