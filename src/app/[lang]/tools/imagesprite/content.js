"use client";

import { useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  DEFAULT_SETTINGS,
  IMAGE_SPRITE_ACCEPT,
  calculateSpriteLayout,
  canvasToBlob,
  formatFileSize,
  makeCss,
  makeImageId,
  makeManifest,
  makeZipName,
} from "./logic";

const SUPPORTED_TYPES = ["image/png", "image/webp", "image/jpeg"];

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

async function generateSprite(images, settings) {
  const loadedImages = await Promise.all(images.map((item) => fileToImage(item.file)));
  const layout = calculateSpriteLayout(images, settings);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, layout.width);
  canvas.height = Math.max(1, layout.height);
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (settings.backgroundMode === "solid") {
    context.fillStyle = settings.backgroundColor || "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  layout.frames.forEach((frame, index) => {
    context.drawImage(loadedImages[index], frame.x, frame.y, frame.width, frame.height);
  });
  loadedImages.forEach((image) => {
    if (typeof image.close === "function") image.close();
  });

  const spriteBlob = await canvasToBlob(canvas, "image/png");
  const cssText = makeCss(layout.frames, canvas.width, canvas.height, settings);
  const manifestText = makeManifest(layout.frames, canvas.width, canvas.height, settings);

  return {
    sprite: {
      name: "sprite.png",
      blob: spriteBlob,
      previewUrl: URL.createObjectURL(spriteBlob),
      width: canvas.width,
      height: canvas.height,
      size: spriteBlob.size,
    },
    css: new Blob([cssText], { type: "text/css;charset=utf-8" }),
    json: new Blob([manifestText], { type: "application/json;charset=utf-8" }),
    cssText,
    manifestText,
    frames: layout.frames,
  };
}

export default function ImageSpriteContent() {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [result, setResult] = useState(null);
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

  const clearResult = () => {
    if (result?.sprite?.previewUrl) URL.revokeObjectURL(result.sprite.previewUrl);
    setResult(null);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    clearResult();
  };

  const handleFileUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t("imagesprite_invalid_format")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("imagesprite_file_exists")}`);
        return false;
      }
      return true;
    });

    if (errors.length > 0) showModal(errors.join("\n"), "error");
    if (validFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const loaded = await Promise.all(validFiles.map(loadImageInfo));
      clearResult();
      setImages((current) => [...current, ...loaded]);
      setStatusMessage(t("imagesprite_files_added", { count: loaded.length }));
    } catch (error) {
      console.error("Image sprite load failed:", error);
      showModal(t("imagesprite_read_error"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (id) => {
    setImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
    clearResult();
  };

  const clearAll = () => {
    images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    clearResult();
    setImages([]);
    setProgressText("");
    setStatusMessage("");
  };

  const processImages = async () => {
    if (images.length === 0) {
      showModal(t("imagesprite_min_files_error"), "error");
      return;
    }
    setIsProcessing(true);
    clearResult();
    setProgressText(t("imagesprite_progress"));
    try {
      const nextResult = await generateSprite(images, settings);
      setResult(nextResult);
      setStatusMessage(t("imagesprite_success", { count: images.length }));
    } catch (error) {
      console.error("Image sprite generation failed:", error);
      showModal(t("imagesprite_process_error"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const downloadAll = async () => {
    if (!result) {
      showModal(t("imagesprite_no_results"), "error");
      return;
    }
    const zip = new PizZip();
    zip.file("sprite.png", await result.sprite.blob.arrayBuffer());
    zip.file("sprite.css", await result.css.arrayBuffer());
    zip.file("sprite.json", await result.json.arrayBuffer());
    const content = zip.generate({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    saveAs(content, makeZipName());
  };

  return (
    <div className="mx-auto mt-4 w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imagesprite_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagesprite_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept={IMAGE_SPRITE_ACCEPT} multiple onChange={handleFileUpload} title={t("imagesprite_upload_hint")} maxSize={60} className="min-h-32" />
            </div>
            {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagesprite_images_title", { count: images.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("imagesprite_images_hint")}</p>
              </div>
              <button onClick={clearAll} disabled={images.length === 0 || isProcessing} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                {t("imagesprite_clear")}
              </button>
            </div>

            {images.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("imagesprite_no_files")}</div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {images.map((item) => (
                  <div key={item.id} className="rounded border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex aspect-square items-center justify-center rounded bg-gray-50 p-2">
                      <img src={item.previewUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <p className="mt-3 truncate text-sm font-medium text-gray-950" title={item.name}>{item.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.width} × {item.height} · {formatFileSize(item.size)}</p>
                    <button onClick={() => removeImage(item.id)} disabled={isProcessing} className="mt-3 w-full rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                      {t("imagesprite_delete")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagesprite_results_title")}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("imagesprite_results_hint")}</p>
              </div>
              <button onClick={downloadAll} disabled={!result || isProcessing} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {t("imagesprite_download_all")}
              </button>
            </div>

            {!result ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("imagesprite_no_results_hint")}</div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="overflow-auto rounded border border-gray-200 bg-gray-50 p-4">
                  <img src={result.sprite.previewUrl} alt="sprite" className="max-w-none" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">{t("imagesprite_sprite_size")}</p>
                    <p className="mt-1 text-lg font-semibold text-gray-950">{result.sprite.width} × {result.sprite.height}</p>
                  </div>
                  <div className="rounded border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">{t("imagesprite_file_size")}</p>
                    <p className="mt-1 text-lg font-semibold text-gray-950">{formatFileSize(result.sprite.size)}</p>
                  </div>
                  <div className="rounded border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">{t("imagesprite_frame_count")}</p>
                    <p className="mt-1 text-lg font-semibold text-gray-950">{result.frames.length}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-950">sprite.css</h3>
                    <pre className="mt-2 max-h-72 overflow-auto rounded bg-gray-950 p-3 text-xs text-gray-100">{result.cssText}</pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-950">sprite.json</h3>
                    <pre className="mt-2 max-h-72 overflow-auto rounded bg-gray-950 p-3 text-xs text-gray-100">{result.manifestText}</pre>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imagesprite_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagesprite_settings_hint")}</p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imagesprite_layout")}</span>
                <select value={settings.layout} onChange={(event) => updateSetting("layout", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value="grid">{t("imagesprite_layout_grid")}</option>
                  <option value="horizontal">{t("imagesprite_layout_horizontal")}</option>
                  <option value="vertical">{t("imagesprite_layout_vertical")}</option>
                </select>
              </label>

              {settings.layout === "grid" && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 block font-medium">{t("imagesprite_columns")}</span>
                  <input type="number" min="1" max="12" value={settings.columns} onChange={(event) => updateSetting("columns", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
                </label>
              )}

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imagesprite_gap")}</span>
                <input type="number" min="0" max="128" value={settings.gap} onChange={(event) => updateSetting("gap", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imagesprite_class_prefix")}</span>
                <input type="text" value={settings.classPrefix} onChange={(event) => updateSetting("classPrefix", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imagesprite_retina_scale")}</span>
                <select value={settings.retinaScale} onChange={(event) => updateSetting("retinaScale", Number(event.target.value))} className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
              </label>

              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("imagesprite_background")}</span>
                <select value={settings.backgroundMode} onChange={(event) => updateSetting("backgroundMode", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                  <option value="transparent">{t("imagesprite_background_transparent")}</option>
                  <option value="solid">{t("imagesprite_background_solid")}</option>
                </select>
              </label>

              {settings.backgroundMode === "solid" && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 block font-medium">{t("imagesprite_background_color")}</span>
                  <input type="color" value={settings.backgroundColor} onChange={(event) => updateSetting("backgroundColor", event.target.value)} className="h-10 w-full rounded border border-gray-300 px-2 py-1" />
                </label>
              )}
            </div>

            <div className="mt-5 rounded border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              {t("imagesprite_coordinate_note")}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button onClick={processImages} disabled={isProcessing || images.length === 0} className="rounded bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {isProcessing ? t("imagesprite_processing") : t("imagesprite_generate", { count: images.length })}
              </button>
              <button onClick={downloadAll} disabled={!result || isProcessing} className="rounded bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {t("imagesprite_download_all")}
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
            {t("imagesprite_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
