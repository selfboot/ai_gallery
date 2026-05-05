"use client";

import { useMemo, useState } from "react";
import { saveAs } from "file-saver";
import pixelmatch from "pixelmatch";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  ALIGN_MODES,
  DEFAULT_SETTINGS,
  IMAGE_COMPARE_ACCEPT,
  clampNumber,
  formatFileSize,
  getCompareSize,
  getDrawRect,
  hexToRgb,
  makeResultSummary,
} from "./logic";

function isSupportedImage(file) {
  return String(file?.type || "").startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(file?.name || "");
}

function loadImageFromFile(file) {
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
        image,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, mimeType = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas export failed"));
    }, mimeType);
  });
}

function drawImageToCompareCanvas(imageInfo, canvasSize, alignMode) {
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.clearRect(0, 0, canvas.width, canvas.height);
  const rect = getDrawRect(imageInfo, canvasSize, alignMode);
  context.drawImage(imageInfo.image, rect.x, rect.y, rect.width, rect.height);
  return canvas;
}

async function compareImages(leftImage, rightImage, settings) {
  const canvasSize = getCompareSize(leftImage, rightImage, settings.alignMode);
  const leftCanvas = drawImageToCompareCanvas(leftImage, canvasSize, settings.alignMode);
  const rightCanvas = drawImageToCompareCanvas(rightImage, canvasSize, settings.alignMode);
  const leftContext = leftCanvas.getContext("2d", { willReadFrequently: true });
  const rightContext = rightCanvas.getContext("2d", { willReadFrequently: true });
  const leftData = leftContext.getImageData(0, 0, canvasSize.width, canvasSize.height);
  const rightData = rightContext.getImageData(0, 0, canvasSize.width, canvasSize.height);
  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = canvasSize.width;
  diffCanvas.height = canvasSize.height;
  const diffContext = diffCanvas.getContext("2d", { willReadFrequently: true });
  const diffData = diffContext.createImageData(canvasSize.width, canvasSize.height);
  const diffPixels = pixelmatch(leftData.data, rightData.data, diffData.data, canvasSize.width, canvasSize.height, {
    threshold: clampNumber(settings.threshold, DEFAULT_SETTINGS.threshold, 0, 1),
    includeAA: !settings.ignoreAntiAlias,
    diffColor: hexToRgb(settings.diffColor),
    aaColor: [255, 180, 0],
    alpha: 0.25,
  });
  diffContext.putImageData(diffData, 0, 0);

  const [diffBlob, leftBlob, rightBlob] = await Promise.all([
    canvasToBlob(diffCanvas),
    canvasToBlob(leftCanvas),
    canvasToBlob(rightCanvas),
  ]);

  return {
    ...makeResultSummary({ diffPixels, width: canvasSize.width, height: canvasSize.height }),
    width: canvasSize.width,
    height: canvasSize.height,
    diffBlob,
    diffUrl: URL.createObjectURL(diffBlob),
    leftCanvasUrl: URL.createObjectURL(leftBlob),
    rightCanvasUrl: URL.createObjectURL(rightBlob),
  };
}

function ImageCard({ title, imageInfo, uploadTitle, onUpload, t }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-950">{title}</h3>
        {imageInfo && <span className="text-xs text-gray-500">{imageInfo.width} x {imageInfo.height}</span>}
      </div>
      <div className="mt-3">
        <FileUploadBox
          key={imageInfo ? imageInfo.previewUrl : "empty"}
          accept={IMAGE_COMPARE_ACCEPT}
          onChange={onUpload}
          title={uploadTitle}
          maxSize={50}
          className={imageInfo ? "min-h-24" : "min-h-48"}
        />
      </div>
      {imageInfo && (
        <div className="mt-3 space-y-2">
          <div className="overflow-auto rounded border border-gray-200 bg-gray-100 p-3">
            <img src={imageInfo.previewUrl} alt={imageInfo.name} className="mx-auto max-h-72 max-w-full object-contain" />
          </div>
          <p className="truncate text-xs text-gray-500" title={imageInfo.name}>
            {imageInfo.name} · {formatFileSize(imageInfo.size)}
          </p>
          <p className="text-xs text-gray-500">{t("imagecompare_local_note")}</p>
        </div>
      )}
    </section>
  );
}

function SliderCompare({ result, slider, setSlider, t }) {
  const updateSliderFromEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = ((event.clientX - rect.left) / rect.width) * 100;
    setSlider(clampNumber(next, 50, 0, 100));
  };

  const startDrag = (event) => {
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    updateSliderFromEvent(event);
  };

  const dragSlider = (event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateSliderFromEvent(event);
  };

  const stopDrag = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!result) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
        {t("imagecompare_no_result")}
      </div>
    );
  }

  return (
    <div>
      <div className="relative mx-auto flex min-h-80 items-center justify-center rounded border border-gray-200 bg-gray-100 p-3">
        <div className="relative mx-auto w-full max-w-full" style={{ aspectRatio: `${result.width} / ${result.height}` }}>
          <img src={result.leftCanvasUrl} alt={t("imagecompare_left_label")} className="block h-full w-full select-none object-contain" draggable={false} />
          <img
            src={result.rightCanvasUrl}
            alt={t("imagecompare_right_label")}
            className="absolute inset-0 h-full w-full select-none object-contain"
            style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
            draggable={false}
          />
          <div
            className="absolute inset-0 cursor-ew-resize touch-none"
            onPointerDown={startDrag}
            onPointerMove={dragSlider}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            aria-label={t("imagecompare_drag_divider")}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(slider)}
          >
            <div className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-blue-500 shadow" style={{ left: `${slider}%` }} />
            <div
              className="pointer-events-none absolute top-1/2 flex h-9 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white shadow-lg"
              style={{ left: `${slider}%` }}
            >
              <span aria-hidden="true">← →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImageCompareContent() {
  const { t } = useI18n();
  const [leftImage, setLeftImage] = useState(null);
  const [rightImage, setRightImage] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [result, setResult] = useState(null);
  const [activeView, setActiveView] = useState("diff");
  const [slider, setSlider] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canCompare = Boolean(leftImage && rightImage);
  const dimensionsMatch = leftImage && rightImage && leftImage.width === rightImage.width && leftImage.height === rightImage.height;
  const diffPercent = useMemo(() => (result ? (result.diffRatio * 100).toFixed(result.diffRatio < 0.01 ? 4 : 2) : "0"), [result]);

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const clearResult = () => {
    if (result?.diffUrl) URL.revokeObjectURL(result.diffUrl);
    if (result?.leftCanvasUrl) URL.revokeObjectURL(result.leftCanvasUrl);
    if (result?.rightCanvasUrl) URL.revokeObjectURL(result.rightCanvasUrl);
    setResult(null);
  };

  const handleUpload = async (side, file) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      showModal(t("imagecompare_invalid_format"));
      return;
    }
    try {
      const next = await loadImageFromFile(file);
      clearResult();
      if (side === "left") {
        if (leftImage?.previewUrl) URL.revokeObjectURL(leftImage.previewUrl);
        setLeftImage(next);
      } else {
        if (rightImage?.previewUrl) URL.revokeObjectURL(rightImage.previewUrl);
        setRightImage(next);
      }
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imagecompare_read_error"));
    }
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    clearResult();
  };

  const runCompare = async () => {
    if (!canCompare) return;
    setIsProcessing(true);
    try {
      clearResult();
      const next = await compareImages(leftImage, rightImage, settings);
      setResult(next);
      setActiveView("diff");
    } catch (error) {
      console.error("Image compare failed:", error);
      showModal(t("imagecompare_process_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    clearResult();
    if (leftImage?.previewUrl) URL.revokeObjectURL(leftImage.previewUrl);
    if (rightImage?.previewUrl) URL.revokeObjectURL(rightImage.previewUrl);
    setLeftImage(null);
    setRightImage(null);
  };

  const downloadDiff = () => {
    if (!result?.diffBlob) return;
    saveAs(result.diffBlob, "image-diff-highlight.png");
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ImageCard title={t("imagecompare_left_label")} imageInfo={leftImage} uploadTitle={t("imagecompare_upload_left")} onUpload={(file) => handleUpload("left", file)} t={t} />
            <ImageCard title={t("imagecompare_right_label")} imageInfo={rightImage} uploadTitle={t("imagecompare_upload_right")} onUpload={(file) => handleUpload("right", file)} t={t} />
          </div>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagecompare_result_title")}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">{t("imagecompare_result_hint")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveView("diff")} className={`rounded px-3 py-2 text-sm font-medium ${activeView === "diff" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {t("imagecompare_view_diff")}
                </button>
                <button onClick={() => setActiveView("slider")} className={`rounded px-3 py-2 text-sm font-medium ${activeView === "slider" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {t("imagecompare_view_slider")}
                </button>
              </div>
            </div>

            <div className="mt-5">
              {activeView === "diff" ? (
                result ? (
                  <div className="overflow-auto rounded border border-gray-200 bg-gray-100 p-3">
                    <img src={result.diffUrl} alt={t("imagecompare_view_diff")} className="mx-auto max-h-[640px] max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex min-h-80 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                    {t("imagecompare_no_result")}
                  </div>
                )
              ) : (
                <SliderCompare result={result} slider={slider} setSlider={setSlider} t={t} />
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imagecompare_settings_title")}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{t("imagecompare_settings_hint")}</p>

            <div className="mt-5 space-y-4 text-sm text-gray-700">
              <label className="block">
                <span className="mb-2 flex justify-between font-medium"><span>{t("imagecompare_threshold")}</span><span>{settings.threshold}</span></span>
                <input type="range" min="0" max="1" step="0.01" value={settings.threshold} onChange={(event) => updateSetting("threshold", Number(event.target.value))} className="w-full" />
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.ignoreAntiAlias} onChange={(event) => updateSetting("ignoreAntiAlias", event.target.checked)} />
                <span>{t("imagecompare_ignore_aa")}</span>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{t("imagecompare_align_mode")}</span>
                <select value={settings.alignMode} onChange={(event) => updateSetting("alignMode", event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                  <option value={ALIGN_MODES.CENTER}>{t("imagecompare_align_center")}</option>
                  <option value={ALIGN_MODES.TOP_LEFT}>{t("imagecompare_align_top_left")}</option>
                  <option value={ALIGN_MODES.STRETCH}>{t("imagecompare_align_stretch")}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{t("imagecompare_diff_color")}</span>
                <input type="color" value={settings.diffColor} onChange={(event) => updateSetting("diffColor", event.target.value)} className="h-10 w-full rounded border border-gray-300" />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imagecompare_stats_title")}</h2>
            {result ? (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t("imagecompare_diff_pixels")}</p>
                  <p className="mt-1 font-semibold text-gray-950">{result.diffPixels.toLocaleString()}</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t("imagecompare_diff_percent")}</p>
                  <p className="mt-1 font-semibold text-gray-950">{diffPercent}%</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t("imagecompare_canvas_size")}</p>
                  <p className="mt-1 font-semibold text-gray-950">{result.width} x {result.height}</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t("imagecompare_dimension_match")}</p>
                  <p className="mt-1 font-semibold text-gray-950">{dimensionsMatch ? t("imagecompare_yes") : t("imagecompare_no")}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">{t("imagecompare_stats_empty")}</p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button onClick={runCompare} disabled={!canCompare || isProcessing} className="rounded bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {isProcessing ? t("imagecompare_processing") : t("imagecompare_start")}
              </button>
              <button onClick={downloadDiff} disabled={!result} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300">
                {t("imagecompare_download_diff")}
              </button>
              <button onClick={clearAll} disabled={!leftImage && !rightImage} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400">
                {t("imagecompare_clear")}
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">{t("imagecompare_privacy_note")}</p>
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
