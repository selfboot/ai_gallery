"use client";

import { useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  COLOR_PALETTE_ACCEPT,
  DEFAULT_SETTINGS,
  buildPaletteFromPixels,
  clampNumber,
  makeCssVariables,
  makePaletteJson,
} from "./logic";

const MAX_PREVIEW_SIZE = 960;

function isSupportedImage(file) {
  return String(file?.type || "").startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file?.name || "");
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = url;
  });
}

async function extractPalette(file, settings) {
  const previewUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromUrl(previewUrl);
    const scale = Math.min(1, MAX_PREVIEW_SIZE / image.naturalWidth, MAX_PREVIEW_SIZE / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const colors = buildPaletteFromPixels(pixels, settings);
    return {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      width: image.naturalWidth,
      height: image.naturalHeight,
      previewUrl,
      colors,
    };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

export default function ColorPaletteContent() {
  const { t } = useI18n();
  const [imageInfo, setImageInfo] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cssPrefix, setCssPrefix] = useState("palette");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageInfoRef = useRef(null);

  imageInfoRef.current = imageInfo;

  const cssVariables = useMemo(() => makeCssVariables(imageInfo?.colors || [], cssPrefix), [cssPrefix, imageInfo?.colors]);
  const hasPalette = Boolean(imageInfo?.colors?.length);

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const updateSetting = async (key, value) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    setCopyStatus("");
    if (!imageInfoRef.current?.file) return;
    setIsProcessing(true);
    try {
      const next = await extractPalette(imageInfoRef.current.file, nextSettings);
      URL.revokeObjectURL(imageInfoRef.current.previewUrl);
      setImageInfo(next);
    } catch (error) {
      console.error("Palette re-extract failed:", error);
      showModal(t("colorpalette_process_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async (file) => {
    const uploadedFile = Array.isArray(file) ? file[0] : file;
    if (!uploadedFile) return;
    if (!isSupportedImage(uploadedFile)) {
      showModal(t("colorpalette_invalid_format"));
      return;
    }

    setIsProcessing(true);
    setCopyStatus("");
    try {
      const next = await extractPalette(uploadedFile, settings);
      if (imageInfo?.previewUrl) URL.revokeObjectURL(imageInfo.previewUrl);
      setImageInfo(next);
    } catch (error) {
      console.error("Palette extraction failed:", error);
      showModal(t("colorpalette_read_error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const clearImage = () => {
    if (imageInfo?.previewUrl) URL.revokeObjectURL(imageInfo.previewUrl);
    setImageInfo(null);
    setCopyStatus("");
  };

  const copyText = async (text, message) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyStatus(message);
  };

  const downloadJson = () => {
    if (!hasPalette) return;
    const json = makePaletteJson(imageInfo.colors, {
      name: imageInfo.name,
      width: imageInfo.width,
      height: imageInfo.height,
      type: imageInfo.type,
    });
    saveAs(new Blob([json], { type: "application/json;charset=utf-8" }), "image-color-palette.json");
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">{t("colorpalette_workspace_title")}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("colorpalette_workspace_hint")}</p>
            </div>
            {imageInfo && (
              <button onClick={clearImage} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                {t("colorpalette_clear")}
              </button>
            )}
          </div>

          {!imageInfo ? (
            <div className="mt-5">
              <FileUploadBox accept={COLOR_PALETTE_ACCEPT} onChange={handleUpload} title={t("colorpalette_upload_hint")} maxSize={30} className="min-h-64" />
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                <span>{imageInfo.name} · {imageInfo.width} x {imageInfo.height}</span>
                <FileUploadBox accept={COLOR_PALETTE_ACCEPT} onChange={handleUpload} title={t("colorpalette_upload_another")} maxSize={30} className="min-h-20 min-w-72" />
              </div>

              <div className="overflow-auto rounded border border-gray-200 bg-gray-100 p-4">
                <img src={imageInfo.previewUrl} alt={imageInfo.name} className="mx-auto max-h-[520px] max-w-full rounded object-contain" />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-950">{t("colorpalette_colors_title")}</h3>
                  <span className="text-sm text-gray-500">{isProcessing ? t("colorpalette_processing") : t("colorpalette_found", { count: imageInfo.colors.length })}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {imageInfo.colors.map((color) => (
                    <div key={color.id} className="overflow-hidden rounded border border-gray-200 bg-white">
                      <div className="h-24" style={{ backgroundColor: color.hex }} />
                      <div className="space-y-2 p-3 text-sm">
                        <button onClick={() => copyText(color.hex, t("colorpalette_copied_hex"))} className="block w-full truncate rounded bg-gray-100 px-2 py-1 text-left font-mono font-semibold text-gray-900 hover:bg-gray-200">
                          {color.hex}
                        </button>
                        <button onClick={() => copyText(color.rgb, t("colorpalette_copied_rgb"))} className="block w-full truncate rounded bg-gray-50 px-2 py-1 text-left font-mono text-xs text-gray-700 hover:bg-gray-100">
                          {color.rgb}
                        </button>
                        <button onClick={() => copyText(color.hsl, t("colorpalette_copied_hsl"))} className="block w-full truncate rounded bg-gray-50 px-2 py-1 text-left font-mono text-xs text-gray-700 hover:bg-gray-100">
                          {color.hsl}
                        </button>
                        <div className="text-xs text-gray-500">{t("colorpalette_ratio", { value: color.percentage })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">{t("colorpalette_css_title")}</h3>
                  <button onClick={() => copyText(cssVariables, t("colorpalette_copied_css"))} disabled={!hasPalette} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300">
                    {t("colorpalette_copy_css")}
                  </button>
                </div>
                <pre className="mt-3 overflow-auto rounded bg-white p-3 font-mono text-sm leading-6 text-gray-900">{cssVariables}</pre>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("colorpalette_settings_title")}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{t("colorpalette_settings_hint")}</p>

            <div className="mt-5 space-y-5 text-sm text-gray-700">
              <label className="block">
                <span className="mb-2 flex justify-between font-medium"><span>{t("colorpalette_color_count")}</span><span>{settings.colorCount}</span></span>
                <input type="range" min="2" max="16" step="1" value={settings.colorCount} onChange={(event) => updateSetting("colorCount", clampNumber(event.target.value, 8, 2, 16))} className="w-full" />
              </label>

              <label className="block">
                <span className="mb-2 flex justify-between font-medium"><span>{t("colorpalette_sample_step")}</span><span>{settings.sampleStep}</span></span>
                <input type="range" min="1" max="16" step="1" value={settings.sampleStep} onChange={(event) => updateSetting("sampleStep", clampNumber(event.target.value, 6, 1, 16))} className="w-full" />
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.ignoreTransparent} onChange={(event) => updateSetting("ignoreTransparent", event.target.checked)} />
                <span>{t("colorpalette_ignore_transparent")}</span>
              </label>

              <label className="block">
                <span className="mb-2 block font-medium">{t("colorpalette_css_prefix")}</span>
                <input value={cssPrefix} onChange={(event) => setCssPrefix(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">{t("colorpalette_export_title")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button onClick={() => copyText(imageInfo?.colors?.map((color) => color.hex).join("\n"), t("colorpalette_copied_all"))} disabled={!hasPalette} className="rounded bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300">
                {t("colorpalette_copy_all")}
              </button>
              <button onClick={downloadJson} disabled={!hasPalette} className="rounded bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {t("colorpalette_download_json")}
              </button>
            </div>
            {copyStatus && <p className="mt-3 text-sm text-green-700">{copyStatus}</p>}
          </section>
        </aside>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("colorpalette_modal_title")}>
        <p className="whitespace-pre-wrap text-sm text-gray-700">{modalMessage}</p>
        <button onClick={() => setIsModalOpen(false)} className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {t("colorpalette_confirm")}
        </button>
      </Modal>
    </div>
  );
}
