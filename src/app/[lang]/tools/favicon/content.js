"use client";

import { useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  FAVICON_ACCEPT,
  FAVICON_PNG_SIZES,
  ICO_SIZES,
  canvasToBlob,
  drawFaviconCanvas,
  formatFileSize,
  makeHtmlSnippet,
  makeImageId,
  makeManifest,
  makeZipName,
  pngBlobToIcoBlob,
} from "./logic";

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_SETTINGS = {
  fitMode: "cover",
  backgroundMode: "transparent",
  backgroundColor: "#ffffff",
  paddingRatio: 0.08,
};

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

function revokeResults(results) {
  results.forEach((item) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
}

async function generateFaviconPackage(source, settings) {
  const image = await fileToImage(source.file);
  const pngResults = [];

  try {
    for (const size of FAVICON_PNG_SIZES) {
      const canvas = drawFaviconCanvas(image, size, settings);
      const blob = await canvasToBlob(canvas, "image/png");
      const fileName =
        size === 180
          ? "apple-touch-icon.png"
          : size === 192
            ? "android-chrome-192x192.png"
            : size === 512
              ? "android-chrome-512x512.png"
              : `favicon-${size}x${size}.png`;
      pngResults.push({
        id: `${source.id}-${size}`,
        type: "png",
        fileName,
        size,
        blob,
        previewUrl: URL.createObjectURL(blob),
      });
    }

    const icoEntries = [];
    for (const size of ICO_SIZES) {
      const canvas = drawFaviconCanvas(image, size, settings);
      icoEntries.push({ size, blob: await canvasToBlob(canvas, "image/png") });
    }
    const icoBlob = await pngBlobToIcoBlob(icoEntries);
    const textFiles = [
      {
        id: `${source.id}-html`,
        type: "text",
        fileName: "favicon-html-snippet.txt",
        size: null,
        blob: new Blob([makeHtmlSnippet()], { type: "text/plain;charset=utf-8" }),
      },
      {
        id: `${source.id}-manifest`,
        type: "text",
        fileName: "site.webmanifest",
        size: null,
        blob: new Blob([makeManifest()], { type: "application/manifest+json;charset=utf-8" }),
      },
    ];

    return [
      {
        id: `${source.id}-ico`,
        type: "ico",
        fileName: "favicon.ico",
        size: "16/32/48",
        blob: icoBlob,
        previewUrl: pngResults.find((item) => item.size === 48)?.previewUrl || "",
      },
      ...pngResults,
      ...textFiles,
    ];
  } finally {
    if (typeof image.close === "function") {
      image.close();
    }
  }
}

export default function FaviconContent() {
  const { t } = useI18n();
  const [sourceImage, setSourceImage] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const clearResults = () => {
    revokeResults(results);
    setResults([]);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    clearResults();
    setStatusMessage("");
  };

  const handleFileUpload = async (uploadedFile) => {
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    if (!file) {
      return;
    }
    if (!SUPPORTED_TYPES.includes(file.type)) {
      showModal(t("favicon_invalid_format"), "error");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("");
    clearResults();
    if (sourceImage?.previewUrl) {
      URL.revokeObjectURL(sourceImage.previewUrl);
    }

    try {
      const loaded = await loadImageInfo(file);
      setSourceImage(loaded);
      setStatusMessage(t("favicon_file_loaded"));
    } catch (error) {
      console.error("Favicon source load failed:", error);
      showModal(t("favicon_read_error"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    if (sourceImage?.previewUrl) {
      URL.revokeObjectURL(sourceImage.previewUrl);
    }
    clearResults();
    setSourceImage(null);
    setProgressText("");
    setStatusMessage("");
  };

  const processImage = async () => {
    if (!sourceImage) {
      showModal(t("favicon_min_file_error"), "error");
      return;
    }

    setIsProcessing(true);
    clearResults();
    setProgressText(t("favicon_progress"));
    try {
      const generated = await generateFaviconPackage(sourceImage, settings);
      setResults(generated);
      setStatusMessage(t("favicon_success", { count: generated.length }));
    } catch (error) {
      console.error("Favicon generation failed:", error);
      showModal(t("favicon_process_error"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const downloadOne = (result) => {
    saveAs(result.blob, result.fileName);
  };

  const downloadAll = async () => {
    if (results.length === 0) {
      showModal(t("favicon_no_results"), "error");
      return;
    }

    const zip = new PizZip();
    for (const result of results) {
      zip.file(result.fileName, await result.blob.arrayBuffer());
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
            <h2 className="text-xl font-semibold text-gray-950">{t("favicon_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("favicon_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept={FAVICON_ACCEPT} onChange={handleFileUpload} title={t("favicon_upload_hint")} maxSize={50} className="min-h-32" />
            </div>
            {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("favicon_preview_title")}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("favicon_preview_hint")}</p>
              </div>
              <button onClick={clearAll} disabled={!sourceImage || isProcessing} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                {t("favicon_clear")}
              </button>
            </div>

            {!sourceImage ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("favicon_no_file")}</div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
                <div className="flex aspect-square items-center justify-center rounded border border-gray-200 bg-gray-50 p-4">
                  <img src={sourceImage.previewUrl} alt={sourceImage.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="truncate text-base font-semibold text-gray-950" title={sourceImage.name}>{sourceImage.name}</p>
                    <p className="mt-1 text-sm text-gray-500">{sourceImage.width} × {sourceImage.height} · {formatFileSize(sourceImage.size)}</p>
                  </div>
                  <div className="rounded border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                    {t("favicon_source_note")}
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    {[16, 32, 48, 180].map((size) => (
                      <div key={size} className="text-center">
                        <div className="mx-auto flex items-center justify-center rounded border border-gray-200 bg-white p-1" style={{ width: Math.min(size + 18, 82), height: Math.min(size + 18, 82) }}>
                          <canvas
                            width={size}
                            height={size}
                            className="hidden"
                          />
                          <img src={sourceImage.previewUrl} alt="" className="h-full w-full rounded object-cover" />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{size}×{size}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("favicon_results_title")}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("favicon_results_hint")}</p>
              </div>
              <button onClick={downloadAll} disabled={results.length === 0 || isProcessing} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {t("favicon_download_all")}
              </button>
            </div>

            {results.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("favicon_no_results_hint")}</div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {results.map((result) => (
                  <div key={result.id} className="rounded border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex aspect-square items-center justify-center rounded bg-gray-50 p-3">
                      {result.previewUrl ? (
                        <img src={result.previewUrl} alt={result.fileName} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-xs font-semibold uppercase text-gray-500">{result.fileName.split(".").pop()}</span>
                      )}
                    </div>
                    <p className="mt-3 truncate text-sm font-medium text-gray-950" title={result.fileName}>{result.fileName}</p>
                    <p className="mt-1 text-xs text-gray-500">{result.size ? `${result.size} px` : formatFileSize(result.blob.size)}</p>
                    <button onClick={() => downloadOne(result)} className="mt-3 w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                      {t("favicon_download_one")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("favicon_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("favicon_settings_hint")}</p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("favicon_fit_mode")}</span>
                <select value={settings.fitMode} onChange={(event) => updateSetting("fitMode", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value="cover">{t("favicon_fit_cover")}</option>
                  <option value="contain">{t("favicon_fit_contain")}</option>
                </select>
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("favicon_background_mode")}</span>
                <select value={settings.backgroundMode} onChange={(event) => updateSetting("backgroundMode", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value="transparent">{t("favicon_background_transparent")}</option>
                  <option value="solid">{t("favicon_background_solid")}</option>
                </select>
              </label>

              {settings.backgroundMode === "solid" && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 block font-medium">{t("favicon_background_color")}</span>
                  <input type="color" value={settings.backgroundColor} onChange={(event) => updateSetting("backgroundColor", event.target.value)} className="h-10 w-full rounded border border-gray-300 px-2 py-1" />
                </label>
              )}

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("favicon_padding", { value: Math.round(settings.paddingRatio * 100) })}</span>
                <input type="range" min="0" max="0.25" step="0.01" value={settings.paddingRatio} onChange={(event) => updateSetting("paddingRatio", Number(event.target.value))} className="w-full" />
              </label>
            </div>

            <div className="mt-5 rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <h3 className="font-semibold text-gray-950">{t("favicon_output_title")}</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>{t("favicon_output_ico")}</li>
                <li>{t("favicon_output_png")}</li>
                <li>{t("favicon_output_apple")}</li>
                <li>{t("favicon_output_manifest")}</li>
              </ul>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button onClick={processImage} disabled={!sourceImage || isProcessing} className="rounded bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {isProcessing ? t("favicon_processing") : t("favicon_generate")}
              </button>
              <button onClick={downloadAll} disabled={results.length === 0 || isProcessing} className="rounded bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {t("favicon_download_all")}
              </button>
            </div>
            {progressText && <p className="mt-3 text-sm text-blue-700">{progressText}</p>}
          </section>
        </aside>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className={`whitespace-pre-line ${modalType === "error" ? "text-red-700" : "text-gray-700"}`}>{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            {t("favicon_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
