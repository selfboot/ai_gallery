"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  FIT_MODES,
  OUTPUT_FORMATS,
  PRESET_GROUPS,
  SCREENSHOT_SIZE_ACCEPT,
  SIZE_PRESETS,
  SUPPORTED_IMAGE_TYPES,
  clampNumber,
  formatFileSize,
  getDrawPlan,
  getMimeFromOutputFormat,
  getPresetById,
  makeOutputFileName,
  makeZipName,
  normalizeSelectedPresetIds,
} from "./logic";

const DEFAULT_SETTINGS = {
  activePresetId: "opengraph",
  selectedPresetIds: ["opengraph"],
  fitMode: FIT_MODES.COVER,
  zoom: 1,
  focusX: 50,
  focusY: 50,
  backgroundColor: "#ffffff",
  outputFormat: OUTPUT_FORMATS.PNG,
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
        type: file.type,
        size: file.size,
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
        if (blob) resolve(blob);
        else reject(new Error("canvas export failed"));
      },
      mimeType,
      quality
    );
  });
}

function drawPresetImage(context, image, preset, settings) {
  context.fillStyle = settings.backgroundColor;
  context.fillRect(0, 0, preset.width, preset.height);
  const plan = getDrawPlan({ width: image.width, height: image.height }, preset, settings);
  context.drawImage(
    image,
    plan.sourceX,
    plan.sourceY,
    plan.sourceWidth,
    plan.sourceHeight,
    plan.destX,
    plan.destY,
    plan.destWidth,
    plan.destHeight
  );
}

async function renderPresetBlob(imageInfo, preset, settings) {
  const image = await fileToImage(imageInfo.file);
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const context = canvas.getContext("2d");
  drawPresetImage(context, image, preset, settings);
  if (typeof image.close === "function") image.close();
  const mimeType = getMimeFromOutputFormat(settings.outputFormat);
  const blob = await canvasToBlob(canvas, mimeType, settings.quality);
  return {
    blob,
    outputName: makeOutputFileName(imageInfo.name, preset, mimeType),
  };
}

function getPreviewSize(preset) {
  const maxWidth = 860;
  const maxHeight = 560;
  const scale = Math.min(1, maxWidth / preset.width, maxHeight / preset.height);
  return {
    width: Math.max(1, Math.round(preset.width * scale)),
    height: Math.max(1, Math.round(preset.height * scale)),
  };
}

export default function ScreenshotSizeContent() {
  const { t } = useI18n();
  const previewCanvasRef = useRef(null);
  const previewImageRef = useRef(null);
  const [images, setImages] = useState([]);
  const [activeImageId, setActiveImageId] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activePreset = useMemo(() => getPresetById(settings.activePresetId), [settings.activePresetId]);
  const selectedPresetIds = useMemo(() => normalizeSelectedPresetIds(settings.selectedPresetIds), [settings.selectedPresetIds]);
  const previewSize = useMemo(() => getPreviewSize(activePreset), [activePreset]);
  const activeImage = useMemo(() => images.find((image) => image.id === activeImageId) || images[0] || null, [activeImageId, images]);
  const totalInputSize = useMemo(() => images.reduce((sum, image) => sum + image.size, 0), [images]);

  useEffect(() => {
    if (!activeImage || !previewCanvasRef.current || !previewImageRef.current) return;
    const canvas = previewCanvasRef.current;
    const image = previewImageRef.current;
    const draw = () => {
      canvas.width = activePreset.width;
      canvas.height = activePreset.height;
      canvas.style.width = `${previewSize.width}px`;
      canvas.style.height = `${previewSize.height}px`;
      drawPresetImage(canvas.getContext("2d"), image, activePreset, settings);
    };

    if (image.complete) draw();
    else image.addEventListener("load", draw, { once: true });

    return () => image.removeEventListener("load", draw);
  }, [activeImage, activePreset, previewSize.height, previewSize.width, settings]);

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setStatusMessage("");
  };

  const handleUpload = async (uploadedFiles) => {
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles].filter(Boolean);
    if (files.length === 0) return;
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t("screenshotsize_invalid_format")}`);
        return false;
      }
      if (images.some((image) => image.name === file.name && image.size === file.size)) {
        errors.push(`${file.name}: ${t("screenshotsize_file_exists")}`);
        return false;
      }
      return true;
    });
    if (errors.length > 0) showModal(errors.join("\n"));
    if (validFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const loadedImages = await Promise.all(validFiles.map(loadImageInfo));
      setImages((current) => [...current, ...loadedImages]);
      setActiveImageId((current) => current || loadedImages[0]?.id || "");
      setStatusMessage(t("screenshotsize_loaded_batch", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("screenshotsize_read_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const clearImages = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setActiveImageId("");
    setStatusMessage("");
  };

  const removeImage = (id) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const nextImages = current.filter((image) => image.id !== id);
      if (activeImageId === id) {
        setActiveImageId(nextImages[0]?.id || "");
      }
      return nextImages;
    });
  };

  const togglePreset = (presetId) => {
    setSettings((current) => {
      const selected = new Set(current.selectedPresetIds);
      if (selected.has(presetId)) selected.delete(presetId);
      else selected.add(presetId);
      const nextSelected = normalizeSelectedPresetIds(Array.from(selected));
      return {
        ...current,
        selectedPresetIds: nextSelected.length > 0 ? nextSelected : [presetId],
        activePresetId: presetId,
      };
    });
  };

  const selectPreset = (presetId) => {
    setSettings((current) => ({
      ...current,
      activePresetId: presetId,
      selectedPresetIds: current.selectedPresetIds.includes(presetId) ? current.selectedPresetIds : [...current.selectedPresetIds, presetId],
    }));
  };

  const exportCurrent = async () => {
    if (images.length === 0) {
      showModal(t("screenshotsize_no_image"));
      return;
    }
    setIsProcessing(true);
    try {
      const outputs = [];
      for (const image of images) {
        outputs.push(await renderPresetBlob(image, activePreset, settings));
      }
      if (outputs.length === 1) {
        saveAs(outputs[0].blob, outputs[0].outputName);
      } else {
        const zip = new PizZip();
        for (const output of outputs) {
          zip.file(output.outputName, await output.blob.arrayBuffer());
        }
        const content = zip.generate({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        saveAs(content, makeZipName());
      }
      setStatusMessage(t("screenshotsize_exported", { count: outputs.length }));
    } catch (error) {
      console.error("Export failed:", error);
      showModal(t("screenshotsize_process_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSelected = async () => {
    if (images.length === 0) {
      showModal(t("screenshotsize_no_image"));
      return;
    }
    setIsProcessing(true);
    try {
      const outputs = [];
      for (const image of images) {
        for (const presetId of selectedPresetIds) {
          const preset = getPresetById(presetId);
          outputs.push(await renderPresetBlob(image, preset, settings));
        }
      }
      if (outputs.length === 1) {
        saveAs(outputs[0].blob, outputs[0].outputName);
      } else {
        const zip = new PizZip();
        for (const output of outputs) {
          zip.file(output.outputName, await output.blob.arrayBuffer());
        }
        const content = zip.generate({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        saveAs(content, makeZipName());
      }
      setStatusMessage(t("screenshotsize_exported", { count: outputs.length }));
    } catch (error) {
      console.error("Batch export failed:", error);
      showModal(t("screenshotsize_process_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto mt-4 w-full">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">{t("screenshotsize_workspace_title")}</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">{t("screenshotsize_workspace_hint")}</p>
            </div>
            {images.length > 0 && (
              <button onClick={clearImages} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                {t("screenshotsize_clear_images")}
              </button>
            )}
          </div>

          {images.length === 0 ? (
            <div className="mt-5">
              <FileUploadBox accept={SCREENSHOT_SIZE_ACCEPT} multiple onChange={handleUpload} title={t("screenshotsize_upload_hint")} maxSize={30} className="min-h-56" />
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                <span>{t("screenshotsize_image_summary", { count: images.length, size: formatFileSize(totalInputSize) })} {statusMessage && `· ${statusMessage}`}</span>
                <span className="rounded bg-blue-50 px-3 py-1 font-medium text-blue-700">{activePreset.width} x {activePreset.height}</span>
              </div>
              <div className="mb-4">
                <FileUploadBox accept={SCREENSHOT_SIZE_ACCEPT} multiple onChange={handleUpload} title={t("screenshotsize_add_more")} maxSize={30} className="min-h-24" />
              </div>
              <div className="mb-4 max-h-36 overflow-auto rounded border border-gray-200 bg-gray-50 p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((image) => (
                    <div key={image.id} className={`flex items-center gap-2 rounded border p-2 ${activeImage?.id === image.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
                      <button onClick={() => setActiveImageId(image.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <img src={image.previewUrl} alt={image.name} className="h-10 w-10 rounded object-cover" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-gray-900">{image.name}</span>
                          <span className="text-[11px] text-gray-500">{image.width} x {image.height}</span>
                        </span>
                      </button>
                      <button onClick={() => removeImage(image.id)} className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                        {t("screenshotsize_remove_image")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-auto rounded border border-gray-200 bg-gray-100 p-4">
                <div className="mx-auto w-fit rounded border border-gray-300 bg-white shadow-sm" style={{ width: previewSize.width, height: previewSize.height }}>
                  <img ref={previewImageRef} src={activeImage.previewUrl} alt={activeImage.name} className="hidden" />
                  <canvas ref={previewCanvasRef} className="block" />
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">{t("screenshotsize_preview_tip")}</p>
            </div>
          )}
        </section>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("screenshotsize_settings_title")}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{t("screenshotsize_settings_hint")}</p>

            <div className="mt-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t("screenshotsize_presets_title")}</h3>
                <div className="mt-3 max-h-80 space-y-4 overflow-y-scroll pr-2 [scrollbar-gutter:stable] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar]:w-2">
                  {PRESET_GROUPS.map((group) => (
                    <div key={group.id}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t(group.labelKey)}</p>
                      <div className="space-y-2">
                        {SIZE_PRESETS.filter((preset) => preset.group === group.id).map((preset) => {
                          const checked = selectedPresetIds.includes(preset.id);
                          const active = activePreset.id === preset.id;
                          return (
                            <div key={preset.id} className={`rounded border p-2 ${active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
                              <label className="flex cursor-pointer items-start gap-2 text-sm">
                                <input type="checkbox" checked={checked} onChange={() => togglePreset(preset.id)} className="mt-1" />
                                <button type="button" onClick={() => selectPreset(preset.id)} className="min-w-0 flex-1 text-left">
                                  <span className="block font-medium text-gray-900">{t(preset.labelKey)}</span>
                                  <span className="text-xs text-gray-500">{preset.width} x {preset.height}</span>
                                </button>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => updateSetting("fitMode", FIT_MODES.COVER)} className={`rounded px-3 py-2 text-sm font-medium ${settings.fitMode === FIT_MODES.COVER ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {t("screenshotsize_mode_cover")}
                </button>
                <button onClick={() => updateSetting("fitMode", FIT_MODES.CONTAIN)} className={`rounded px-3 py-2 text-sm font-medium ${settings.fitMode === FIT_MODES.CONTAIN ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {t("screenshotsize_mode_contain")}
                </button>
              </div>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 flex justify-between font-medium"><span>{t("screenshotsize_zoom")}</span><span>{settings.zoom.toFixed(2)}x</span></span>
                <input type="range" min="1" max="3" step="0.01" value={settings.zoom} onChange={(event) => updateSetting("zoom", Number(event.target.value))} className="w-full" />
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 flex justify-between font-medium"><span>{t("screenshotsize_focus_x")}</span><span>{Math.round(settings.focusX)}%</span></span>
                <input type="range" min="0" max="100" value={settings.focusX} onChange={(event) => updateSetting("focusX", Number(event.target.value))} className="w-full" />
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 flex justify-between font-medium"><span>{t("screenshotsize_focus_y")}</span><span>{Math.round(settings.focusY)}%</span></span>
                <input type="range" min="0" max="100" value={settings.focusY} onChange={(event) => updateSetting("focusY", Number(event.target.value))} className="w-full" />
              </label>

              {settings.fitMode === FIT_MODES.CONTAIN && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 block font-medium">{t("screenshotsize_background")}</span>
                  <input type="color" value={settings.backgroundColor} onChange={(event) => updateSetting("backgroundColor", event.target.value)} className="h-10 w-full rounded border border-gray-300" />
                </label>
              )}

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("screenshotsize_output_format")}</span>
                <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value={OUTPUT_FORMATS.PNG}>PNG</option>
                  <option value={OUTPUT_FORMATS.JPEG}>JPG</option>
                  <option value={OUTPUT_FORMATS.WEBP}>WebP</option>
                </select>
              </label>

              {(settings.outputFormat === OUTPUT_FORMATS.JPEG || settings.outputFormat === OUTPUT_FORMATS.WEBP) && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 flex justify-between font-medium"><span>{t("screenshotsize_quality")}</span><span>{Math.round(settings.quality * 100)}%</span></span>
                  <input type="range" min="0.5" max="1" step="0.01" value={settings.quality} onChange={(event) => updateSetting("quality", clampNumber(event.target.value, 0.92, 0.5, 1))} className="w-full" />
                </label>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <button onClick={exportCurrent} disabled={images.length === 0 || isProcessing} className="rounded bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {isProcessing ? t("screenshotsize_processing") : t("screenshotsize_export_current")}
              </button>
              <button onClick={exportSelected} disabled={images.length === 0 || selectedPresetIds.length === 0 || isProcessing} className="rounded bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {t("screenshotsize_export_selected", { count: selectedPresetIds.length, imageCount: images.length })}
              </button>
            </div>
          </section>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-gray-700">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            {t("screenshotsize_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
