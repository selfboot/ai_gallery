"use client";

import { useEffect, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import { formatFileSize, makeTransparentPngName, makeZipName } from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BACKGROUND_REMOVAL_TIMEOUT_MS = 120000;
const MODEL_PRELOAD_TIMEOUT_MS = 45000;
const MAX_PROCESS_SIDE = 1024;
const BACKGROUND_REMOVAL_CONFIG = {
  model: "isnet_quint8",
  output: {
    format: "image/png",
    quality: 0.9,
  },
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

function imageBlobToPngBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { alpha: true });
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(url);
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error("png export failed"));
        }
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image conversion failed"));
    };
    image.src = url;
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    image.src = url;
  });
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

async function prepareImageForRemoval(item) {
  const maxSide = Math.max(item.width, item.height);
  if (maxSide <= MAX_PROCESS_SIDE) {
    return item.file;
  }

  const image = await fileToImage(item.file);
  const scale = MAX_PROCESS_SIDE / maxSide;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(item.width * scale));
  canvas.height = Math.max(1, Math.round(item.height * scale));

  const context = canvas.getContext("2d", { alpha: item.type !== "image/jpeg" });
  if (item.type === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvasToBlob(canvas, item.type === "image/png" ? "image/png" : "image/jpeg", 0.92);
}

function getProgressPercent(current, total) {
  return total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
}

function getProgressMessage(t, key, current, total, itemIndex, totalItems) {
  const percent = getProgressPercent(current, total);
  if (key.startsWith("fetch:")) {
    return t("backgroundremover_progress_download", { current: itemIndex, total: totalItems, percent });
  }
  if (key === "compute:decode") {
    return t("backgroundremover_progress_decode", { current: itemIndex, total: totalItems });
  }
  if (key === "compute:inference") {
    return t("backgroundremover_progress_inference", { current: itemIndex, total: totalItems });
  }
  if (key === "compute:mask") {
    return t("backgroundremover_progress_mask", { current: itemIndex, total: totalItems });
  }
  if (key === "compute:encode") {
    return t("backgroundremover_progress_encode", { current: itemIndex, total: totalItems });
  }
  return t("backgroundremover_progress", { current: itemIndex, total: totalItems });
}

async function removeBackgroundInBrowser(file, { onProgress }) {
  const module = await import("@imgly/background-removal");
  const removeBackground = module.default || module.removeBackground;
  return removeBackground(file, {
    ...BACKGROUND_REMOVAL_CONFIG,
    progress: onProgress,
  });
}

function withTimeout(task, timeoutMs) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error("background removal timed out"));
    }, timeoutMs);
  });

  return Promise.race([task(), timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

async function removeOneBackground(item, { onProgress }) {
  const inputBlob = await prepareImageForRemoval(item);
  let outputBlob = await withTimeout(
    () => removeBackgroundInBrowser(inputBlob, { onProgress }),
    BACKGROUND_REMOVAL_TIMEOUT_MS
  );
  if (outputBlob.type !== "image/png") {
    outputBlob = await imageBlobToPngBlob(outputBlob);
  }

  return {
    id: item.id,
    name: item.name,
    outputName: makeTransparentPngName(item.name),
    originalSize: item.size,
    outputSize: outputBlob.size,
    width: item.width,
    height: item.height,
    blob: outputBlob,
    previewUrl: URL.createObjectURL(outputBlob),
  };
}

export default function BackgroundRemoverContent() {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [modelStatus, setModelStatus] = useState("idle");
  const [modelProgress, setModelProgress] = useState(0);
  const [modelProgressText, setModelProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isModelLoading = modelStatus === "loading";

  useEffect(() => {
    let isMounted = true;

    async function preloadModel() {
      setModelStatus("loading");
      setModelProgress(8);
      setModelProgressText(t("backgroundremover_model_loading_start"));

      try {
        const module = await import("@imgly/background-removal");
        if (!isMounted) {
          return;
        }
        setModelProgress(12);
        setModelProgressText(t("backgroundremover_model_loading_connecting"));

        const preload = module.preload;
        if (typeof preload !== "function") {
          setModelStatus("idle");
          setModelProgressText("");
          return;
        }

        const preloadPromise = preload({
          ...BACKGROUND_REMOVAL_CONFIG,
          progress: (key, current, total) => {
            if (!isMounted || !key.startsWith("fetch:")) {
              return;
            }
            const percent = getProgressPercent(current, total);
            const visiblePercent = percent > 0 ? percent : 14;
            setModelProgress(visiblePercent);
            setModelProgressText(
              percent > 0
                ? t("backgroundremover_model_loading_progress", { percent })
                : t("backgroundremover_model_loading_connecting")
            );
          },
        });

        preloadPromise.then(() => {
          if (isMounted) {
            setModelStatus("ready");
            setModelProgress(100);
            setModelProgressText(t("backgroundremover_model_ready"));
          }
        }).catch(() => {
          // The awaited path below handles the visible fallback state.
        });

        await Promise.race([
          preloadPromise,
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error("model preload timed out")), MODEL_PRELOAD_TIMEOUT_MS);
          }),
        ]);

        if (isMounted) {
          setModelStatus("ready");
          setModelProgress(100);
          setModelProgressText(t("backgroundremover_model_ready"));
        }
      } catch (error) {
        console.warn("Background removal model preload failed:", error);
        if (isMounted) {
          setModelStatus("idle");
          setModelProgress(0);
          setModelProgressText(
            error?.message === "model preload timed out"
              ? t("backgroundremover_model_loading_timeout")
              : t("backgroundremover_model_loading_fallback")
          );
        }
      }
    }

    preloadModel();

    return () => {
      isMounted = false;
    };
  }, [t]);

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

  const handleFileUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t("backgroundremover_invalid_format")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("backgroundremover_file_exists")}`);
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
      setStatusMessage(t("backgroundremover_files_added", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("backgroundremover_read_error"), "error");
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
      const target = images[index];
      const removedResults = current.filter((entry) => entry.id === target?.id);
      clearResultUrls(removedResults);
      return current.filter((entry) => entry.id !== target?.id);
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

  const removeBackgrounds = async () => {
    if (images.length === 0) {
      showModal(t("backgroundremover_min_files_error"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText("");

    try {
      const completedIds = new Set(results.map((item) => item.id));
      const pendingImages = images.filter((item) => !completedIds.has(item.id));
      if (pendingImages.length === 0) {
        setStatusMessage(t("backgroundremover_all_done"));
        return;
      }

      const nextResults = [...results];
      const errors = [];
      for (let index = 0; index < pendingImages.length; index += 1) {
        const current = index + 1;
        const image = pendingImages[index];
        setProgressText(t("backgroundremover_progress_prepare", { current, total: pendingImages.length }));
        try {
          const result = await removeOneBackground(image, {
            onProgress: (key, progressCurrent, progressTotal) => {
              setProgressText(getProgressMessage(t, key, progressCurrent, progressTotal, current, pendingImages.length));
            },
          });
          nextResults.push(result);
          setResults([...nextResults]);
        } catch (error) {
          console.error("Background removal failed for image:", image.name, error);
          errors.push(`${image.name}: ${t("backgroundremover_one_failed")}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (errors.length > 0) {
        showModal(errors.join("\n"), "error");
      }
      if (nextResults.length > 0) {
        setStatusMessage(t("backgroundremover_success", { count: nextResults.length }));
      } else {
        setStatusMessage("");
      }
    } catch (error) {
      console.error("Background removal failed:", error);
      showModal(t("backgroundremover_process_error"), "error");
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
      showModal(t("backgroundremover_no_result_error"), "error");
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
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">{t("backgroundremover_upload_title")}</h2>
          <FileUploadBox accept={IMAGE_ACCEPT} multiple onChange={handleFileUpload} title={t("backgroundremover_upload_hint")} maxSize={40} className="min-h-32" />
          <p className="mt-3 text-xs text-gray-500">{t("backgroundremover_upload_note")}</p>
          {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
        </div>

        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">{t("backgroundremover_action_title")}</h2>
          <p className="text-sm leading-6 text-gray-600">{t("backgroundremover_action_note")}</p>
          <div className={`mt-4 rounded border p-4 ${modelStatus === "ready" ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}>
            <div className="flex items-center justify-between gap-4">
              <p className={`text-sm font-medium ${modelStatus === "ready" ? "text-green-800" : "text-blue-800"}`}>
                {isModelLoading ? t("backgroundremover_model_loading_title") : modelStatus === "ready" ? t("backgroundremover_model_ready_title") : t("backgroundremover_model_fallback_title")}
              </p>
              <p className={`shrink-0 text-sm font-semibold ${modelStatus === "ready" ? "text-green-700" : "text-blue-700"}`}>{modelProgress}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded bg-white">
              <div className={`h-full rounded ${modelStatus === "ready" ? "bg-green-600" : "bg-blue-600"} ${isModelLoading ? "animate-pulse" : ""}`} style={{ width: `${Math.max(modelProgress, isModelLoading ? 8 : 0)}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-600">{modelProgressText || t("backgroundremover_model_local_note")}</p>
          </div>
          {progressText && <p className="mt-3 text-sm text-blue-700">{progressText}</p>}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button onClick={removeBackgrounds} disabled={isProcessing || images.length === 0} className={`rounded px-5 py-3 font-medium text-white ${isProcessing || images.length === 0 ? "cursor-not-allowed bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("backgroundremover_processing") : t("backgroundremover_remove_button", { count: images.length })}
            </button>
            <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className={`rounded px-5 py-3 font-medium ${results.length === 0 || isProcessing ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-green-600 text-white hover:bg-green-700"}`}>
              {t("backgroundremover_download_all")}
            </button>
            <button onClick={clearImages} disabled={isProcessing || images.length === 0} className={`rounded px-5 py-3 font-medium ${images.length === 0 || isProcessing ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("backgroundremover_clear_all")}
            </button>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-1 text-xl font-semibold">{t("backgroundremover_images_title", { count: images.length })}</h2>
          <p className="mb-4 text-sm text-gray-600">{t("backgroundremover_images_hint")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((item, index) => {
              const result = results.find((entry) => entry.id === item.id);
              return (
                <div key={item.id} className="flex min-h-full flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="grid grid-cols-2 border-b border-gray-200">
                    <PreviewPanel label={t("backgroundremover_before")} src={item.previewUrl} alt={item.name} />
                    <PreviewPanel label={t("backgroundremover_after")} src={result?.previewUrl} alt={result?.outputName || item.name} isTransparent />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-3">
                    <p className="truncate font-medium text-gray-900" title={item.name}>{item.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.width} x {item.height}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded bg-gray-50 px-2 py-2">
                        <p className="text-xs text-gray-500">{t("backgroundremover_original_size")}</p>
                        <p className="mt-1 font-semibold text-gray-900">{formatFileSize(item.size)}</p>
                      </div>
                      <div className="rounded bg-blue-50 px-2 py-2">
                        <p className="text-xs text-blue-700">{t("backgroundremover_output_size")}</p>
                        <p className="mt-1 font-semibold text-blue-900">{result ? formatFileSize(result.outputSize) : "-"}</p>
                      </div>
                    </div>
                    {result && (
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <p className="truncate" title={result.outputName}>{result.outputName}</p>
                        <p>{t("backgroundremover_png_note")}</p>
                      </div>
                    )}
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                      <button onClick={() => result && downloadOne(result)} disabled={!result} className={`rounded px-3 py-2 text-sm font-medium ${result ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-gray-200 text-gray-500"}`}>
                        {t("backgroundremover_download_one")}
                      </button>
                      <button onClick={() => removeImage(index)} disabled={isProcessing} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">{t("backgroundremover_delete")}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="whitespace-pre-line text-gray-700">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            {t("backgroundremover_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function PreviewPanel({ label, src, alt, isTransparent = false }) {
  const checkerboard = {
    backgroundColor: "#f8fafc",
    backgroundImage: isTransparent
      ? "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)"
      : "none",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
    backgroundSize: "16px 16px",
  };

  return (
    <div className="relative aspect-[4/3] overflow-hidden" style={checkerboard}>
      <div className="absolute left-2 top-2 z-10 rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">{label}</div>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-contain p-2" />
      ) : (
        <div className="flex h-full items-center justify-center px-3 text-center text-sm text-gray-500">...</div>
      )}
    </div>
  );
}
