"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  IMAGE_BLUR_ACCEPT,
  OUTPUT_FORMATS,
  REDACTION_MODES,
  SUPPORTED_IMAGE_TYPES,
  clampNumber,
  clampRegion,
  formatFileSize,
  getMimeFromOutputFormat,
  getRegionLabel,
  makeOutputFileName,
  makeRegionId,
  regionToPixels,
} from "./logic";

const DEFAULT_SETTINGS = {
  mode: REDACTION_MODES.MOSAIC,
  mosaicSize: 14,
  blurRadius: 12,
  fillColor: "#111827",
  outputFormat: OUTPUT_FORMATS.ORIGINAL,
  quality: 0.92,
};

const HANDLE_SIZE = 12;

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

function drawMosaic(context, sourceCanvas, rect, blockSize) {
  const safeBlockSize = Math.max(2, Math.round(blockSize));
  const tinyWidth = Math.max(1, Math.ceil(rect.width / safeBlockSize));
  const tinyHeight = Math.max(1, Math.ceil(rect.height / safeBlockSize));
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = tinyWidth;
  tempCanvas.height = tinyHeight;
  const tempContext = tempCanvas.getContext("2d");
  tempContext.imageSmoothingEnabled = true;
  tempContext.drawImage(sourceCanvas, rect.x, rect.y, rect.width, rect.height, 0, 0, tinyWidth, tinyHeight);
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(tempCanvas, 0, 0, tinyWidth, tinyHeight, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawBlur(context, sourceCanvas, rect, blurRadius) {
  context.save();
  context.filter = `blur(${Math.max(1, Math.round(blurRadius))}px)`;
  context.drawImage(sourceCanvas, rect.x, rect.y, rect.width, rect.height, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawSolid(context, rect, color) {
  context.save();
  context.fillStyle = color;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function applyRedactions(context, canvas, regions, settings, scaleRatio = 1) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = canvas.width;
  sourceCanvas.height = canvas.height;
  sourceCanvas.getContext("2d").drawImage(canvas, 0, 0);

  regions.forEach((region) => {
    const rect = regionToPixels(region, canvas.width, canvas.height);
    if (settings.mode === REDACTION_MODES.MOSAIC) {
      drawMosaic(context, sourceCanvas, rect, settings.mosaicSize * scaleRatio);
    } else if (settings.mode === REDACTION_MODES.BLUR) {
      drawBlur(context, sourceCanvas, rect, settings.blurRadius * scaleRatio);
    } else if (settings.mode === REDACTION_MODES.WHITE) {
      drawSolid(context, rect, "#ffffff");
    } else if (settings.mode === REDACTION_MODES.BLACK) {
      drawSolid(context, rect, "#000000");
    } else {
      drawSolid(context, rect, settings.fillColor);
    }
  });
}

async function processImage(imageInfo, regions, settings) {
  const image = await fileToImage(imageInfo.file);
  const mimeType = getMimeFromOutputFormat(settings.outputFormat, imageInfo.type);
  const flattenBackground = mimeType === "image/jpeg";
  const canvas = document.createElement("canvas");
  canvas.width = imageInfo.width;
  canvas.height = imageInfo.height;
  const context = canvas.getContext("2d", { alpha: !flattenBackground });
  if (flattenBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  applyRedactions(context, canvas, regions, settings);

  if (typeof image.close === "function") image.close();

  const blob = await canvasToBlob(canvas, mimeType, settings.quality);
  return {
    blob,
    outputName: makeOutputFileName(imageInfo.name, mimeType),
    outputSize: blob.size,
  };
}

function getPointerPercent(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: clampNumber((event.clientX - rect.left) / rect.width, 0, 0, 1),
    y: clampNumber((event.clientY - rect.top) / rect.height, 0, 0, 1),
  };
}

function getImageDisplaySize(imageInfo) {
  if (!imageInfo) return { width: 1, height: 1 };
  const maxWidth = Math.min(imageInfo.width, 1100);
  const maxHeight = 680;
  const scale = Math.min(1, maxWidth / imageInfo.width, maxHeight / imageInfo.height);
  return {
    width: Math.max(1, Math.round(imageInfo.width * scale)),
    height: Math.max(1, Math.round(imageInfo.height * scale)),
  };
}

function RegionOverlay({ regions, selectedRegionId, onPointerDown, t }) {
  return (
    <>
      {regions.map((region, index) => (
        <div
          key={region.id}
          onPointerDown={(event) => onPointerDown(event, region.id, "move")}
          className={`absolute cursor-move border ${selectedRegionId === region.id ? "border-blue-500 ring-2 ring-blue-300" : "border-white ring-1 ring-black/50"}`}
          style={{
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.width * 100}%`,
            height: `${region.height * 100}%`,
            background: "rgba(59, 130, 246, 0.16)",
          }}
          title={t("imageblur_drag_region")}
        >
          <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {getRegionLabel(index)}
          </span>
          {["nw", "ne", "sw", "se"].map((handle) => (
            <span
              key={handle}
              onPointerDown={(event) => onPointerDown(event, region.id, handle)}
              className={`absolute block rounded-sm border border-white bg-blue-600`}
              style={{
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                left: handle.endsWith("w") ? -HANDLE_SIZE / 2 : undefined,
                right: handle.endsWith("e") ? -HANDLE_SIZE / 2 : undefined,
                top: handle.startsWith("n") ? -HANDLE_SIZE / 2 : undefined,
                bottom: handle.startsWith("s") ? -HANDLE_SIZE / 2 : undefined,
                cursor: `${handle}-resize`,
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
}

export default function ImageBlurContent() {
  const { t } = useI18n();
  const previewRef = useRef(null);
  const previewImageRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [regions, setRegions] = useState([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dragState, setDragState] = useState(null);

  const selectedRegion = useMemo(() => regions.find((region) => region.id === selectedRegionId), [regions, selectedRegionId]);
  const displaySize = useMemo(() => getImageDisplaySize(imageInfo), [imageInfo]);

  useEffect(() => {
    if (!imageInfo || !previewImageRef.current || !previewCanvasRef.current) return;
    const imageElement = previewImageRef.current;
    const canvas = previewCanvasRef.current;
    const drawPreview = () => {
      const width = displaySize.width;
      const height = displaySize.height;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      context.drawImage(imageElement, 0, 0, width, height);
      const scaleRatio = width / imageInfo.width;
      applyRedactions(context, canvas, regions, settings, scaleRatio);
    };

    if (imageElement.complete) {
      drawPreview();
    } else {
      imageElement.addEventListener("load", drawPreview, { once: true });
    }

    const resizeObserver = new ResizeObserver(drawPreview);
    resizeObserver.observe(imageElement);
    return () => {
      imageElement.removeEventListener("load", drawPreview);
      resizeObserver.disconnect();
    };
  }, [displaySize.height, displaySize.width, imageInfo, regions, settings]);

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
  };

  const handleUpload = async (uploadedFile) => {
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    if (!file) return;
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      showModal(t("imageblur_invalid_format"));
      return;
    }
    setIsProcessing(true);
    try {
      if (imageInfo?.previewUrl) URL.revokeObjectURL(imageInfo.previewUrl);
      if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
      const loaded = await loadImageInfo(file);
      setImageInfo(loaded);
      setRegions([]);
      setSelectedRegionId("");
      setResult(null);
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imageblur_read_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImage = () => {
    if (imageInfo?.previewUrl) URL.revokeObjectURL(imageInfo.previewUrl);
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setImageInfo(null);
    setRegions([]);
    setSelectedRegionId("");
    setResult(null);
  };

  const startCreateRegion = (event) => {
    if (!previewRef.current || !imageInfo) return;
    const start = getPointerPercent(event, previewRef.current);
    const id = makeRegionId();
    const region = { id, x: start.x, y: start.y, width: 0.002, height: 0.002 };
    setRegions((current) => [...current, region]);
    setSelectedRegionId(id);
    setDragState({ type: "create", id, start, origin: region });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startEditRegion = (event, id, action) => {
    event.preventDefault();
    event.stopPropagation();
    if (!previewRef.current) return;
    const start = getPointerPercent(event, previewRef.current);
    const region = regions.find((item) => item.id === id);
    if (!region) return;
    setSelectedRegionId(id);
    setDragState({ type: action, id, start, origin: region });
    previewRef.current.setPointerCapture(event.pointerId);
  };

  const updateDrag = (event) => {
    if (!dragState || !previewRef.current) return;
    const point = getPointerPercent(event, previewRef.current);
    const dx = point.x - dragState.start.x;
    const dy = point.y - dragState.start.y;
    const origin = dragState.origin;

    setRegions((current) =>
      current.map((region) => {
        if (region.id !== dragState.id) return region;
        if (dragState.type === "create") {
          return clampRegion({
            ...region,
            x: Math.min(dragState.start.x, point.x),
            y: Math.min(dragState.start.y, point.y),
            width: Math.abs(point.x - dragState.start.x),
            height: Math.abs(point.y - dragState.start.y),
          });
        }
        if (dragState.type === "move") {
          return clampRegion({ ...region, x: origin.x + dx, y: origin.y + dy });
        }

        let next = { ...origin };
        if (dragState.type.includes("e")) next.width = origin.width + dx;
        if (dragState.type.includes("s")) next.height = origin.height + dy;
        if (dragState.type.includes("w")) {
          next.x = origin.x + dx;
          next.width = origin.width - dx;
        }
        if (dragState.type.includes("n")) {
          next.y = origin.y + dy;
          next.height = origin.height - dy;
        }
        return clampRegion(next);
      })
    );
  };

  const endDrag = () => {
    setDragState(null);
  };

  const addCenterRegion = () => {
    const id = makeRegionId();
    const region = { id, x: 0.35, y: 0.35, width: 0.3, height: 0.18 };
    setRegions((current) => [...current, region]);
    setSelectedRegionId(id);
  };

  const deleteSelectedRegion = () => {
    if (!selectedRegionId) return;
    setRegions((current) => current.filter((region) => region.id !== selectedRegionId));
    setSelectedRegionId("");
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
  };

  const clearRegions = () => {
    setRegions([]);
    setSelectedRegionId("");
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
  };

  const exportImage = async () => {
    if (!imageInfo) {
      showModal(t("imageblur_no_image"));
      return;
    }
    if (regions.length === 0) {
      showModal(t("imageblur_no_regions"));
      return;
    }
    setIsProcessing(true);
    try {
      if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
      const processed = await processImage(imageInfo, regions, settings);
      setResult({ ...processed, previewUrl: URL.createObjectURL(processed.blob) });
      saveAs(processed.blob, processed.outputName);
    } catch (error) {
      console.error("Image redaction failed:", error);
      showModal(t("imageblur_process_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAgain = () => {
    if (!result) return;
    saveAs(result.blob, result.outputName);
  };

  return (
    <div className="mx-auto mt-4 w-full">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">{t("imageblur_workspace_title")}</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">{t("imageblur_workspace_hint")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={addCenterRegion} disabled={!imageInfo} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300">
                {t("imageblur_add_region")}
              </button>
              <button onClick={deleteSelectedRegion} disabled={!selectedRegionId} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                {t("imageblur_delete_region")}
              </button>
              <button onClick={clearRegions} disabled={regions.length === 0} className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                {t("imageblur_clear_regions")}
              </button>
            </div>
          </div>

          {!imageInfo ? (
            <div className="mt-5">
              <FileUploadBox accept={IMAGE_BLUR_ACCEPT} onChange={handleUpload} title={t("imageblur_upload_hint")} maxSize={30} className="min-h-56" />
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                <span>{imageInfo.name} · {imageInfo.width} x {imageInfo.height} · {formatFileSize(imageInfo.size)}</span>
                <button onClick={resetImage} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  {t("imageblur_upload_another")}
                </button>
              </div>
              <div
                ref={previewRef}
                onPointerDown={startCreateRegion}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="relative mx-auto max-h-[680px] w-full overflow-hidden rounded border border-gray-200 bg-gray-950/5"
                style={{ width: displaySize.width, height: displaySize.height }}
              >
                <img ref={previewImageRef} src={imageInfo.previewUrl} alt={imageInfo.name} width={displaySize.width} height={displaySize.height} className="absolute inset-0 block select-none opacity-0" draggable={false} />
                <canvas ref={previewCanvasRef} className="pointer-events-none absolute inset-0" width={displaySize.width} height={displaySize.height} />
                <RegionOverlay regions={regions} selectedRegionId={selectedRegionId} onPointerDown={startEditRegion} t={t} />
              </div>
              <p className="mt-3 text-sm text-gray-500">{t("imageblur_canvas_tip")}</p>
            </div>
          )}
        </section>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imageblur_settings_title")}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{t("imageblur_settings_hint")}</p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imageblur_mode")}</span>
                <select value={settings.mode} onChange={(event) => updateSetting("mode", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value={REDACTION_MODES.MOSAIC}>{t("imageblur_mode_mosaic")}</option>
                  <option value={REDACTION_MODES.BLUR}>{t("imageblur_mode_blur")}</option>
                  <option value={REDACTION_MODES.BLACK}>{t("imageblur_mode_black")}</option>
                  <option value={REDACTION_MODES.WHITE}>{t("imageblur_mode_white")}</option>
                  <option value={REDACTION_MODES.COLOR}>{t("imageblur_mode_color")}</option>
                </select>
              </label>

              {settings.mode === REDACTION_MODES.MOSAIC && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 flex justify-between font-medium"><span>{t("imageblur_mosaic_size")}</span><span>{settings.mosaicSize}px</span></span>
                  <input type="range" min="4" max="60" value={settings.mosaicSize} onChange={(event) => updateSetting("mosaicSize", Number(event.target.value))} className="w-full" />
                </label>
              )}

              {settings.mode === REDACTION_MODES.BLUR && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 flex justify-between font-medium"><span>{t("imageblur_blur_radius")}</span><span>{settings.blurRadius}px</span></span>
                  <input type="range" min="2" max="40" value={settings.blurRadius} onChange={(event) => updateSetting("blurRadius", Number(event.target.value))} className="w-full" />
                </label>
              )}

              {settings.mode === REDACTION_MODES.COLOR && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 block font-medium">{t("imageblur_fill_color")}</span>
                  <input type="color" value={settings.fillColor} onChange={(event) => updateSetting("fillColor", event.target.value)} className="h-10 w-full rounded border border-gray-300" />
                </label>
              )}

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imageblur_output_format")}</span>
                <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value={OUTPUT_FORMATS.ORIGINAL}>{t("imageblur_format_original")}</option>
                  <option value={OUTPUT_FORMATS.PNG}>PNG</option>
                  <option value={OUTPUT_FORMATS.JPEG}>JPG</option>
                  <option value={OUTPUT_FORMATS.WEBP}>WebP</option>
                </select>
              </label>

              {(settings.outputFormat === OUTPUT_FORMATS.JPEG || settings.outputFormat === OUTPUT_FORMATS.WEBP) && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 flex justify-between font-medium"><span>{t("imageblur_quality")}</span><span>{Math.round(settings.quality * 100)}%</span></span>
                  <input type="range" min="0.5" max="1" step="0.01" value={settings.quality} onChange={(event) => updateSetting("quality", Number(event.target.value))} className="w-full" />
                </label>
              )}
            </div>

            <div className="mt-5 rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="flex justify-between gap-3"><span>{t("imageblur_region_count")}</span><strong>{regions.length}</strong></div>
              <div className="mt-2 flex justify-between gap-3"><span>{t("imageblur_selected_region")}</span><strong>{selectedRegion ? getRegionLabel(regions.findIndex((item) => item.id === selectedRegion.id)) : "-"}</strong></div>
            </div>

            <button onClick={exportImage} disabled={!imageInfo || regions.length === 0 || isProcessing} className="mt-5 w-full rounded bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
              {isProcessing ? t("imageblur_processing") : t("imageblur_export")}
            </button>
            {result && (
              <button onClick={downloadAgain} className="mt-3 w-full rounded bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">
                {t("imageblur_download_again", { size: formatFileSize(result.outputSize) })}
              </button>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">{t("imageblur_regions_title")}</h2>
            {regions.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">{t("imageblur_no_region_list")}</p>
            ) : (
              <div className="mt-3 space-y-2">
                {regions.map((region, index) => (
                  <button key={region.id} onClick={() => setSelectedRegionId(region.id)} className={`w-full rounded border px-3 py-2 text-left text-sm ${selectedRegionId === region.id ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
                    {getRegionLabel(index)} · {Math.round(region.width * imageInfo.width)} x {Math.round(region.height * imageInfo.height)} px
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-gray-700">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            {t("imageblur_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
