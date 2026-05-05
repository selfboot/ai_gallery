"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  DEFAULT_SETTINGS,
  FIT_MODES,
  GRID_PRESETS,
  IMAGE_GRID_ACCEPT,
  OUTPUT_FORMATS,
  clampNumber,
  formatFileSize,
  getDrawPlan,
  getGridSize,
  getMimeFromOutputFormat,
  getPresetById,
  makeTileName,
  makeZipName,
} from "./logic";

function isSupportedImage(file) {
  return String(file?.type || "").startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(file?.name || "");
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

function drawGridImage(context, image, gridSize, settings) {
  context.fillStyle = settings.backgroundColor;
  context.fillRect(0, 0, gridSize.width, gridSize.height);
  const plan = getDrawPlan({ width: image.width, height: image.height }, gridSize, settings);
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

async function renderGrid(imageInfo, settings) {
  const image = await fileToImage(imageInfo.file);
  const gridSize = getGridSize(settings);
  const format = settings.outputFormat;
  const mimeType = getMimeFromOutputFormat(format);
  const canvas = document.createElement("canvas");
  canvas.width = gridSize.width;
  canvas.height = gridSize.height;
  const context = canvas.getContext("2d", { alpha: format === OUTPUT_FORMATS.PNG });
  drawGridImage(context, image, gridSize, settings);

  const tiles = [];
  for (let row = 0; row < gridSize.rows; row += 1) {
    for (let col = 0; col < gridSize.cols; col += 1) {
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = gridSize.tileSize;
      tileCanvas.height = gridSize.tileSize;
      const tileContext = tileCanvas.getContext("2d", { alpha: format === OUTPUT_FORMATS.PNG });
      tileContext.drawImage(
        canvas,
        col * gridSize.tileSize,
        row * gridSize.tileSize,
        gridSize.tileSize,
        gridSize.tileSize,
        0,
        0,
        gridSize.tileSize,
        gridSize.tileSize
      );
      const blob = await canvasToBlob(tileCanvas, mimeType, settings.quality);
      tiles.push({
        row,
        col,
        index: row * gridSize.cols + col + 1,
        blob,
        url: URL.createObjectURL(blob),
        outputName: makeTileName(imageInfo.name, row, col, gridSize.cols, format),
        size: blob.size,
      });
    }
  }

  if (typeof image.close === "function") image.close();
  return {
    gridSize,
    tiles,
    previewUrl: URL.createObjectURL(await canvasToBlob(canvas, "image/png", 0.92)),
  };
}

export default function ImageGridContent() {
  const { t } = useI18n();
  const previewCanvasRef = useRef(null);
  const previewImageRef = useRef(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activePreset = useMemo(() => getPresetById(settings.presetId), [settings.presetId]);
  const gridSize = useMemo(() => getGridSize(settings), [settings]);
  const previewSize = useMemo(() => {
    const maxWidth = 820;
    const maxHeight = 620;
    const scale = Math.min(1, maxWidth / gridSize.width, maxHeight / gridSize.height);
    return {
      width: Math.max(1, Math.round(gridSize.width * scale)),
      height: Math.max(1, Math.round(gridSize.height * scale)),
    };
  }, [gridSize.height, gridSize.width]);

  useEffect(() => {
    if (!imageInfo || !previewCanvasRef.current || !previewImageRef.current) return;
    const canvas = previewCanvasRef.current;
    const image = previewImageRef.current;
    const draw = () => {
      canvas.width = gridSize.width;
      canvas.height = gridSize.height;
      canvas.style.width = `${previewSize.width}px`;
      canvas.style.height = `${previewSize.height}px`;
      const context = canvas.getContext("2d");
      drawGridImage(context, image, gridSize, settings);
      context.save();
      context.strokeStyle = "rgba(255,255,255,0.95)";
      context.lineWidth = Math.max(6, Math.round(gridSize.tileSize * 0.008));
      for (let col = 1; col < gridSize.cols; col += 1) {
        const x = col * gridSize.tileSize;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, gridSize.height);
        context.stroke();
      }
      for (let row = 1; row < gridSize.rows; row += 1) {
        const y = row * gridSize.tileSize;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(gridSize.width, y);
        context.stroke();
      }
      context.restore();
    };

    if (image.complete) draw();
    else image.addEventListener("load", draw, { once: true });

    return () => image.removeEventListener("load", draw);
  }, [gridSize, imageInfo, previewSize.height, previewSize.width, settings]);

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const clearResult = () => {
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    result?.tiles?.forEach((tile) => URL.revokeObjectURL(tile.url));
    setResult(null);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    clearResult();
    setStatusMessage("");
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      showModal(t("imagegrid_invalid_format"));
      return;
    }
    setIsProcessing(true);
    try {
      const next = await loadImageInfo(file);
      clearResult();
      if (imageInfo?.previewUrl) URL.revokeObjectURL(imageInfo.previewUrl);
      setImageInfo(next);
      setStatusMessage(t("imagegrid_loaded", { name: file.name }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imagegrid_read_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const generateGrid = async () => {
    if (!imageInfo) return;
    setIsProcessing(true);
    setStatusMessage(t("imagegrid_processing"));
    try {
      clearResult();
      const next = await renderGrid(imageInfo, {
        ...settings,
        tileSize: clampNumber(settings.tileSize, activePreset.tileSize, 128, 4096),
        quality: clampNumber(settings.quality, DEFAULT_SETTINGS.quality, 0.1, 1),
      });
      setResult(next);
      setStatusMessage(t("imagegrid_done", { count: next.tiles.length }));
    } catch (error) {
      console.error("Image grid failed:", error);
      showModal(t("imagegrid_process_error"));
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    clearResult();
    if (imageInfo?.previewUrl) URL.revokeObjectURL(imageInfo.previewUrl);
    setImageInfo(null);
    setStatusMessage("");
  };

  const downloadTile = (tile) => {
    saveAs(tile.blob, tile.outputName);
  };

  const downloadAll = async () => {
    if (!result?.tiles?.length) return;
    if (result.tiles.length === 1) {
      downloadTile(result.tiles[0]);
      return;
    }
    const zip = new PizZip();
    for (const tile of result.tiles) {
      zip.file(tile.outputName, await tile.blob.arrayBuffer());
    }
    const content = zip.generate({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    saveAs(content, makeZipName(imageInfo?.name));
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagegrid_workspace_title")}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("imagegrid_workspace_hint")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={generateGrid} disabled={!imageInfo || isProcessing} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300">
                  {isProcessing ? t("imagegrid_processing") : t("imagegrid_generate")}
                </button>
                <button onClick={downloadAll} disabled={!result?.tiles?.length} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300">
                  {t("imagegrid_download_all")}
                </button>
                <button onClick={clearAll} disabled={!imageInfo} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400">
                  {t("imagegrid_clear")}
                </button>
              </div>
            </div>

            {!imageInfo ? (
              <div className="mt-5">
                <FileUploadBox accept={IMAGE_GRID_ACCEPT} onChange={handleUpload} title={t("imagegrid_upload_hint")} maxSize={50} className="min-h-64" />
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                  <span>{imageInfo.name} · {imageInfo.width} x {imageInfo.height} · {formatFileSize(imageInfo.size)}</span>
                  <FileUploadBox accept={IMAGE_GRID_ACCEPT} onChange={handleUpload} title={t("imagegrid_upload_another")} maxSize={50} className="min-h-20 min-w-72" />
                </div>
                <div className="overflow-auto rounded border border-gray-200 bg-gray-100 p-4">
                  <canvas ref={previewCanvasRef} className="mx-auto block max-w-full rounded bg-white shadow-sm" />
                  <img ref={previewImageRef} src={imageInfo.previewUrl} alt={imageInfo.name} className="hidden" />
                </div>
              </div>
            )}
            {statusMessage && <p className="mt-4 text-sm text-gray-600">{statusMessage}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagegrid_tiles_title")}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">{t("imagegrid_tiles_hint")}</p>
              </div>
              {result && <span className="text-sm text-gray-500">{result.gridSize.cols} x {result.gridSize.rows} · {result.gridSize.tileSize}px</span>}
            </div>

            {result?.tiles?.length ? (
              <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: `repeat(${result.gridSize.cols}, minmax(0, 1fr))` }}>
                {result.tiles.map((tile) => (
                  <div key={tile.outputName} className="rounded border border-gray-200 bg-gray-50 p-2">
                    <img src={tile.url} alt={tile.outputName} className="aspect-square w-full rounded object-cover" />
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                      <span>{tile.index}</span>
                      <button onClick={() => downloadTile(tile)} className="rounded bg-white px-2 py-1 font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100">
                        {t("imagegrid_download_tile")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex min-h-48 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                {t("imagegrid_no_tiles")}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imagegrid_settings_title")}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{t("imagegrid_settings_hint")}</p>

            <div className="mt-5 space-y-4 text-sm text-gray-700">
              <label className="block">
                <span className="mb-1 block font-medium">{t("imagegrid_preset")}</span>
                <select value={settings.presetId} onChange={(event) => updateSetting("presetId", event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                  {GRID_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>{t(preset.labelKey)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{t("imagegrid_tile_size")}</span>
                <input type="number" min="128" max="4096" value={settings.tileSize} onChange={(event) => updateSetting("tileSize", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{t("imagegrid_fit_mode")}</span>
                <select value={settings.fitMode} onChange={(event) => updateSetting("fitMode", event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                  <option value={FIT_MODES.COVER}>{t("imagegrid_fit_cover")}</option>
                  <option value={FIT_MODES.CONTAIN}>{t("imagegrid_fit_contain")}</option>
                </select>
              </label>

              {settings.fitMode === FIT_MODES.COVER && (
                <>
                  <label className="block">
                    <span className="mb-2 flex justify-between font-medium"><span>{t("imagegrid_focus_x")}</span><span>{settings.focusX}%</span></span>
                    <input type="range" min="0" max="100" value={settings.focusX} onChange={(event) => updateSetting("focusX", Number(event.target.value))} className="w-full" />
                  </label>
                  <label className="block">
                    <span className="mb-2 flex justify-between font-medium"><span>{t("imagegrid_focus_y")}</span><span>{settings.focusY}%</span></span>
                    <input type="range" min="0" max="100" value={settings.focusY} onChange={(event) => updateSetting("focusY", Number(event.target.value))} className="w-full" />
                  </label>
                </>
              )}

              {settings.fitMode === FIT_MODES.CONTAIN && (
                <label className="block">
                  <span className="mb-1 block font-medium">{t("imagegrid_background")}</span>
                  <input type="color" value={settings.backgroundColor} onChange={(event) => updateSetting("backgroundColor", event.target.value)} className="h-10 w-full rounded border border-gray-300" />
                </label>
              )}

              <label className="block">
                <span className="mb-1 block font-medium">{t("imagegrid_output_format")}</span>
                <select value={settings.outputFormat} onChange={(event) => updateSetting("outputFormat", event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                  <option value={OUTPUT_FORMATS.JPG}>JPG</option>
                  <option value={OUTPUT_FORMATS.PNG}>PNG</option>
                </select>
              </label>

              {settings.outputFormat === OUTPUT_FORMATS.JPG && (
                <label className="block">
                  <span className="mb-2 flex justify-between font-medium"><span>{t("imagegrid_quality")}</span><span>{Math.round(settings.quality * 100)}%</span></span>
                  <input type="range" min="0.1" max="1" step="0.01" value={settings.quality} onChange={(event) => updateSetting("quality", Number(event.target.value))} className="w-full" />
                </label>
              )}

              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                {t("imagegrid_output_summary", { width: gridSize.width, height: gridSize.height, count: gridSize.cols * gridSize.rows })}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">{t("imagegrid_publish_title")}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{t("imagegrid_publish_hint")}</p>
          </section>
        </aside>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="whitespace-pre-line text-gray-700">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            {t("fileUpload_modal_close")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
