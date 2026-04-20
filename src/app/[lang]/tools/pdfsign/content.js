"use client";

import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import { clampPlacementToPage, createDefaultPlacement, formatFileSize, makeOutputFileName, uiPlacementToPdfPlacement } from "./logic";

const PDFJS_BASE_URL = (process.env.NEXT_PUBLIC_PDFJS_BASE_URL || "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149").replace(/\/$/, "");
const PDFJS_MODULE_URL = `${PDFJS_BASE_URL}/pdf.mjs`;
const PDFJS_WORKER_URL = `${PDFJS_BASE_URL}/pdf.worker.mjs`;
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PREVIEW_SCALE = 1.35;
const SIGNATURE_STORAGE_KEY = "pdfsign_saved_signature_v1";
const BACKGROUND_REMOVAL_TIMEOUT_MS = 15000;

let pdfjsPromise = null;

async function loadPdfJs() {
  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = (async () => {
    const pdfjsLib = await import(/* webpackIgnore: true */ PDFJS_MODULE_URL);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return pdfjsLib;
  })();

  return pdfjsPromise;
}

function getImageSize(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    image.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("data url export failed"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*?);base64/)?.[1] || "image/png";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function imageFileToPngBlob(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("png export failed"));
        }
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    image.src = url;
  });
}

function removeWhiteBackground(file, threshold = 242) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        if (red >= threshold && green >= threshold && blue >= threshold && max - min < 28) {
          pixels[index + 3] = 0;
        } else if (red > 220 && green > 220 && blue > 220 && max - min < 36) {
          pixels[index + 3] = Math.min(pixels[index + 3], Math.max(0, (threshold - min) * 7));
        }
      }

      context.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("transparent png export failed"));
        }
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    image.src = url;
  });
}

async function removeBackgroundInBrowser(file) {
  const module = await import("@imgly/background-removal");
  const removeBackground = module.default || module.removeBackground;
  return removeBackground(file, {
    model: "isnet_quint8",
    output: {
      format: "image/png",
      type: "foreground",
    },
  });
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("background removal timed out")), timeoutMs);
    }),
  ]);
}

function drawPage(canvas, page, viewport) {
  const context = canvas.getContext("2d", { alpha: false });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return page.render({ canvasContext: context, viewport, background: "white" }).promise;
}

function clampAspectPlacementToPage(placement, pageSize) {
  if (!placement?.aspectRatio) {
    return clampPlacementToPage(placement, pageSize);
  }

  const ratio = placement.aspectRatio;
  let width = Math.max(placement.width, 48);
  let height = width / ratio;
  if (height < 24) {
    height = 24;
    width = height * ratio;
  }
  if (pageSize?.width && width > pageSize.width) {
    width = pageSize.width;
    height = width / ratio;
  }
  if (pageSize?.height && height > pageSize.height) {
    height = pageSize.height;
    width = height * ratio;
  }

  return clampPlacementToPage(
    {
      ...placement,
      width,
      height,
    },
    pageSize
  );
}

export default function PdfSignContent() {
  const { t } = useI18n();
  const pageCanvasRefs = useRef([]);
  const pageFrameRefs = useRef([]);
  const dragStateRef = useRef(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSizes, setPageSizes] = useState([]);
  const [signature, setSignature] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [activePlacementId, setActivePlacementId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isSignatureSaved, setIsSignatureSaved] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canPlaceSignature = Boolean(signature && pageSizes.length > 0);

  const getPageSize = (pageIndex) => pageSizes[pageIndex] || { width: 612, height: 792, renderScale: PREVIEW_SCALE };

  useEffect(() => {
    let isMounted = true;

    async function restoreSavedSignature() {
      try {
        const saved = window.localStorage.getItem(SIGNATURE_STORAGE_KEY);
        if (!saved) {
          return;
        }
        const parsed = JSON.parse(saved);
        if (!parsed?.dataUrl) {
          return;
        }
        const blob = dataUrlToBlob(parsed.dataUrl);
        const imageSize = await getImageSize(blob);
        if (!isMounted) {
          return;
        }
        setSignature({
          name: parsed.name || t("pdfsign_saved_signature_name"),
          size: blob.size,
          blob,
          previewUrl: URL.createObjectURL(blob),
          width: imageSize.width,
          height: imageSize.height,
        });
        setIsSignatureSaved(true);
        setStatusMessage(t("pdfsign_saved_signature_loaded"));
      } catch (error) {
        console.warn("Restore saved signature failed:", error);
      }
    }

    restoreSavedSignature();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!pdfBytes || pageCount === 0) {
      return;
    }

    let cancelled = false;
    let loadingTask = null;

    async function renderPdfPages() {
      try {
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        const pdfjsLib = await loadPdfJs();
        loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
        const pdf = await loadingTask.promise;

        for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
          if (cancelled) {
            return;
          }
          setProgressText(t("pdfsign_rendering_page", { page: pageIndex + 1 }));
          const page = await pdf.getPage(pageIndex + 1);
          const viewport = page.getViewport({ scale: PREVIEW_SCALE });
          const nextPageSize = {
            width: Math.ceil(viewport.width),
            height: Math.ceil(viewport.height),
            renderScale: PREVIEW_SCALE,
          };
          setPageSizes((current) => {
            const next = [...current];
            next[pageIndex] = nextPageSize;
            return next;
          });

          const canvas = pageCanvasRefs.current[pageIndex];
          if (canvas) {
            await drawPage(canvas, page, viewport);
          }
          page.cleanup();
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("PDF page render failed:", error);
          showModal(t("pdfsign_error_render_pdf"), "error");
        }
      } finally {
        if (!cancelled) {
          setProgressText("");
        }
        try {
          await loadingTask?.destroy();
        } catch {
          // Ignore pdf.js cleanup errors.
        }
      }
    }

    renderPdfPages();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [pageCount, pdfBytes, t]);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const updatePlacement = (id, updater) => {
    setPlacements((current) =>
      current.map((placement) => {
        if (placement.id !== id) {
          return placement;
        }
        const nextPlacement = typeof updater === "function" ? updater(placement) : updater;
        return clampAspectPlacementToPage(nextPlacement, getPageSize(nextPlacement.pageIndex));
      })
    );
  };

  const setSignatureBlob = async ({ blob, name, statusKey, saved = false }) => {
    const imageSize = await getImageSize(blob);
    const previewUrl = URL.createObjectURL(blob);
    setSignature((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return {
        name,
        size: blob.size,
        blob,
        previewUrl,
        width: imageSize.width,
        height: imageSize.height,
      };
    });
    setIsSignatureSaved(saved);
    if (statusKey) {
      setStatusMessage(t(statusKey));
    }
  };

  const handlePdfUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showModal(t("pdfsign_error_invalid_pdf"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText(t("pdfsign_reading_pdf"));
    setStatusMessage("");
    setPlacements([]);
    setActivePlacementId(null);
    setCurrentPageIndex(0);
    setPageSizes([]);

    try {
      const pdfjsLib = await loadPdfJs();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
      const pdf = await loadingTask.promise;
      const total = pdf.numPages;
      await loadingTask.destroy();

      setPdfFile(file);
      setPdfBytes(bytes);
      setPageCount(total);
      setStatusMessage(t("pdfsign_pdf_loaded", { count: total }));
    } catch (error) {
      console.error("PDF read failed:", error);
      showModal(t("pdfsign_error_read_pdf"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const handleSignatureUpload = async (file) => {
    if (!file || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      showModal(t("pdfsign_error_invalid_signature"), "error");
      return;
    }

    setStatusMessage("");
    setIsRemovingBackground(true);
    setProgressText(t("pdfsign_removing_background_fast"));

    try {
      const quickBlob = await removeWhiteBackground(file);
      await setSignatureBlob({ blob: quickBlob, name: file.name, statusKey: "pdfsign_signature_ready_threshold" });
      setProgressText(t("pdfsign_removing_background_ai"));

      try {
        let outputBlob = await withTimeout(removeBackgroundInBrowser(file), BACKGROUND_REMOVAL_TIMEOUT_MS);
        if (outputBlob.type !== "image/png") {
          outputBlob = await imageFileToPngBlob(outputBlob);
        }
        await setSignatureBlob({ blob: outputBlob, name: file.name, statusKey: "pdfsign_signature_ready_ai" });
      } catch (error) {
        console.warn("IMG.LY background removal failed or timed out, keeping threshold result:", error);
        setStatusMessage(t("pdfsign_signature_ready_threshold"));
      }
    } catch (error) {
      console.error("Signature processing failed:", error);
      showModal(t("pdfsign_error_signature_process"), "error");
    } finally {
      setIsRemovingBackground(false);
      setProgressText("");
    }
  };

  const addSignaturePlacement = () => {
    if (!canPlaceSignature) {
      showModal(t("pdfsign_error_missing_signature_or_pdf"), "error");
      return;
    }

    const targetPageSize = getPageSize(currentPageIndex);
    const placement = clampPlacementToPage({
      ...createDefaultPlacement({ pageIndex: currentPageIndex, pageSize: targetPageSize, imageSize: signature }),
      id: `signature-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      aspectRatio: signature.width / signature.height,
    }, targetPageSize);
    setPlacements((current) => [...current, placement]);
    setActivePlacementId(placement.id);
    setStatusMessage(t("pdfsign_placement_added", { page: currentPageIndex + 1 }));
  };

  const createPlacementAt = (pageIndex, x, y) => {
    if (!canPlaceSignature) {
      showModal(t("pdfsign_error_missing_signature_or_pdf"), "error");
      return null;
    }

    const targetPageSize = getPageSize(pageIndex);
    const defaultPlacement = createDefaultPlacement({ pageIndex, pageSize: targetPageSize, imageSize: signature });
    return clampPlacementToPage(
      {
        ...defaultPlacement,
        x: x - defaultPlacement.width / 2,
        y: y - defaultPlacement.height / 2,
        pageIndex,
        id: `signature-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        aspectRatio: signature.width / signature.height,
      },
      targetPageSize
    );
  };

  const handleSignatureDragStart = (event) => {
    if (!signature) {
      return;
    }
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-pdf-signature", "signature");
  };

  const handlePreviewDragOver = (event) => {
    if (!signature || !pdfFile) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handlePreviewDrop = (event, pageIndex) => {
    const pageFrame = pageFrameRefs.current[pageIndex];
    if (!signature || !pageFrame) {
      return;
    }
    event.preventDefault();
    const rect = pageFrame.getBoundingClientRect();
    const placement = createPlacementAt(pageIndex, event.clientX - rect.left, event.clientY - rect.top);
    if (!placement) {
      return;
    }
    setCurrentPageIndex(pageIndex);
    setPlacements((current) => [...current, placement]);
    setActivePlacementId(placement.id);
    setStatusMessage(t("pdfsign_placement_added", { page: pageIndex + 1 }));
  };

  const saveSignatureToBrowser = async () => {
    if (!signature) {
      showModal(t("pdfsign_error_missing_signature"), "error");
      return;
    }

    try {
      const dataUrl = await blobToDataUrl(signature.blob);
      window.localStorage.setItem(
        SIGNATURE_STORAGE_KEY,
        JSON.stringify({
          name: signature.name,
          dataUrl,
          savedAt: Date.now(),
        })
      );
      setIsSignatureSaved(true);
      setStatusMessage(t("pdfsign_signature_saved"));
    } catch (error) {
      console.error("Save signature failed:", error);
      showModal(t("pdfsign_error_save_signature"), "error");
    }
  };

  const removeSavedSignature = () => {
    window.localStorage.removeItem(SIGNATURE_STORAGE_KEY);
    setIsSignatureSaved(false);
    setStatusMessage(t("pdfsign_signature_removed_from_browser"));
  };

  const focusPlacement = (placement) => {
    setCurrentPageIndex(placement.pageIndex);
    setActivePlacementId(placement.id);
    window.requestAnimationFrame(() => {
      const pageFrame = pageFrameRefs.current[placement.pageIndex];
      pageFrame?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
  };

  const removePlacement = (id) => {
    setPlacements((current) => current.filter((placement) => placement.id !== id));
    if (activePlacementId === id) {
      setActivePlacementId(null);
    }
  };

  const startPointerAction = (event, placement, mode) => {
    event.preventDefault();
    event.stopPropagation();
    setActivePlacementId(placement.id);
    dragStateRef.current = {
      id: placement.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      placement,
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopPointerAction, { once: true });
  };

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const resizeDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * (dragState.placement.aspectRatio || 1);
    const resizedWidth = dragState.placement.width + resizeDelta;
    const resizedHeight = resizedWidth / (dragState.placement.aspectRatio || (dragState.placement.width / dragState.placement.height));
    updatePlacement(dragState.id, {
      ...dragState.placement,
      x: dragState.mode === "move" ? dragState.placement.x + deltaX : dragState.placement.x,
      y: dragState.mode === "move" ? dragState.placement.y + deltaY : dragState.placement.y,
      width: dragState.mode === "resize" ? resizedWidth : dragState.placement.width,
      height: dragState.mode === "resize" ? resizedHeight : dragState.placement.height,
    });
  };

  const stopPointerAction = () => {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
  };

  const clearPdf = () => {
    setPdfFile(null);
    setPdfBytes(null);
    setPageCount(0);
    setCurrentPageIndex(0);
    setPageSizes([]);
    pageCanvasRefs.current = [];
    pageFrameRefs.current = [];
    setPlacements([]);
    setActivePlacementId(null);
    setProgressText("");
    setStatusMessage(t("pdfsign_pdf_cleared"));
  };

  const exportPdf = async () => {
    if (!pdfBytes || !pdfFile) {
      showModal(t("pdfsign_error_missing_pdf"), "error");
      return;
    }
    if (!signature) {
      showModal(t("pdfsign_error_missing_signature"), "error");
      return;
    }
    if (placements.length === 0) {
      showModal(t("pdfsign_error_missing_placement"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText(t("pdfsign_exporting"));

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(), { ignoreEncryption: true });
      const embeddedSignature = await pdfDoc.embedPng(await signature.blob.arrayBuffer());

      placements.forEach((placement) => {
        const page = pdfDoc.getPage(placement.pageIndex);
        const { height: pageHeight } = page.getSize();
        const pdfPlacement = uiPlacementToPdfPlacement(placement, pageHeight, getPageSize(placement.pageIndex).renderScale || PREVIEW_SCALE);
        page.drawImage(embeddedSignature, {
          x: pdfPlacement.x,
          y: pdfPlacement.y,
          width: pdfPlacement.width,
          height: pdfPlacement.height,
        });
      });

      const outputBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 });
      saveAs(new Blob([outputBytes], { type: "application/pdf" }), makeOutputFileName(pdfFile.name));
      setStatusMessage(t("pdfsign_success"));
    } catch (error) {
      console.error("PDF signature export failed:", error);
      showModal(t("pdfsign_error_export"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfsign_pdf_upload_title")}</h2>
          <FileUploadBox accept=".pdf" onChange={handlePdfUpload} title={t("pdfsign_pdf_upload_hint")} maxSize={160} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("pdfsign_pdf_upload_note")}</p>
          {pdfFile && (
            <div className="mt-4 rounded border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium truncate" title={pdfFile.name}>{pdfFile.name}</p>
              <p>{formatFileSize(pdfFile.size)} · {t("pdfsign_page_count", { count: pageCount })}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfsign_signature_upload_title")}</h2>
          <FileUploadBox accept={IMAGE_ACCEPT} onChange={handleSignatureUpload} title={t("pdfsign_signature_upload_hint")} maxSize={20} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("pdfsign_signature_upload_note")}</p>
          {signature && (
            <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3">
              <p className="mt-2 truncate text-xs text-gray-600" title={signature.name}>{signature.name} · {formatFileSize(signature.size)}</p>
              {isRemovingBackground && <p className="mt-1 text-xs text-blue-700">{t("pdfsign_background_running")}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={saveSignatureToBrowser} className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">
                  {isSignatureSaved ? t("pdfsign_save_signature_again") : t("pdfsign_save_signature")}
                </button>
                {isSignatureSaved && (
                  <button onClick={removeSavedSignature} className="rounded bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200">
                    {t("pdfsign_remove_saved_signature")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfsign_action_title")}</h2>
          <p className="text-sm text-gray-600">{t("pdfsign_privacy_note")}</p>
          {progressText && <p className="mt-3 text-sm text-blue-700">{progressText}</p>}
          {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
          <div className="mt-5 flex flex-col gap-3">
            <button onClick={addSignaturePlacement} disabled={isProcessing || !canPlaceSignature} className={`rounded px-4 py-3 font-medium ${isProcessing || !canPlaceSignature ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              {t("pdfsign_add_signature_button")}
            </button>
            <button onClick={exportPdf} disabled={isProcessing || !pdfFile || !signature || placements.length === 0} className={`rounded px-4 py-3 font-medium text-white ${isProcessing || !pdfFile || !signature || placements.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}>
              {isProcessing ? t("pdfsign_processing") : t("pdfsign_export_button")}
            </button>
            <button onClick={clearPdf} disabled={isProcessing || (!pdfFile && placements.length === 0)} className={`rounded px-4 py-3 font-medium ${isProcessing || (!pdfFile && placements.length === 0) ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("pdfsign_clear")}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("pdfsign_preview_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("pdfsign_preview_hint")}</p>
          </div>
          <span className="text-sm text-gray-700">{pageCount ? t("pdfsign_scroll_page_indicator", { current: currentPageIndex + 1, total: pageCount }) : t("pdfsign_no_pdf")}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="max-h-[78vh] overflow-auto rounded border border-gray-200 bg-gray-100 p-4">
            {pdfFile ? (
              <div className="space-y-6">
                {Array.from({ length: pageCount }, (_, pageIndex) => {
                  const renderedPageSize = getPageSize(pageIndex);
                  const pagePlacements = placements.filter((placement) => placement.pageIndex === pageIndex);
                  return (
                    <div key={`page-${pageIndex}`} className="mx-auto w-fit" onMouseEnter={() => setCurrentPageIndex(pageIndex)}>
                      <div className="mb-2 text-center text-sm font-medium text-gray-700">
                        {t("pdfsign_page_label", { page: pageIndex + 1 })}
                      </div>
                      <div
                        ref={(element) => {
                          pageFrameRefs.current[pageIndex] = element;
                        }}
                        className="relative mx-auto w-fit bg-white shadow"
                        style={{ minHeight: renderedPageSize.height, minWidth: renderedPageSize.width }}
                        onClick={() => setCurrentPageIndex(pageIndex)}
                        onDragOver={handlePreviewDragOver}
                        onDrop={(event) => handlePreviewDrop(event, pageIndex)}
                      >
                        <canvas
                          ref={(element) => {
                            pageCanvasRefs.current[pageIndex] = element;
                          }}
                          className="block max-w-none"
                        />
                        {pagePlacements.map((placement) => (
                          <div
                            key={placement.id}
                            className={`absolute touch-none border-2 ${activePlacementId === placement.id ? "border-blue-600" : "border-blue-400"} bg-blue-50/10`}
                            style={{ left: placement.x, top: placement.y, width: placement.width, height: placement.height }}
                            onPointerDown={(event) => startPointerAction(event, placement, "move")}
                          >
                            {signature && <img src={signature.previewUrl} alt={t("pdfsign_signature_on_page_alt")} className="h-full w-full select-none object-fill pointer-events-none" draggable={false} />}
                            <button onClick={(event) => { event.stopPropagation(); removePlacement(placement.id); }} className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-red-600 text-xs font-bold text-white shadow" aria-label={t("pdfsign_remove_signature")}>
                              ×
                            </button>
                            <span
                              className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize rounded-tl bg-blue-600"
                              onPointerDown={(event) => startPointerAction(event, placement, "resize")}
                              aria-label={t("pdfsign_resize_signature")}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-96 items-center justify-center px-6 text-center text-sm text-gray-500">
                {t("pdfsign_empty_preview")}
              </div>
            )}
          </div>

          <aside className="xl:sticky xl:top-4 xl:max-h-[78vh] xl:overflow-auto">
            <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">{t("pdfsign_signature_panel_title")}</h3>
              {signature ? (
                <div className="mt-3 rounded border border-gray-200 bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] p-3">
                  <img
                    src={signature.previewUrl}
                    alt={t("pdfsign_signature_preview_alt")}
                    className="mx-auto max-h-28 max-w-full cursor-grab object-contain active:cursor-grabbing"
                    draggable
                    onDragStart={handleSignatureDragStart}
                  />
                  <p className="mt-2 truncate text-xs text-gray-600" title={signature.name}>{signature.name} · {formatFileSize(signature.size)}</p>
                  <p className="mt-1 text-xs text-gray-600">{t("pdfsign_drag_signature_hint")}</p>
                </div>
              ) : (
                <p className="mt-3 rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">{t("pdfsign_no_signature_preview")}</p>
              )}

              <div className="mt-5">
                <h3 className="text-base font-semibold text-gray-900">{t("pdfsign_placements_title", { count: placements.length })}</h3>
                {placements.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {placements.map((placement) => (
                      <div key={placement.id} className={`flex items-center justify-between gap-2 rounded border p-2 text-sm ${activePlacementId === placement.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                        <button onClick={() => focusPlacement(placement)} className="min-w-0 flex-1 text-left font-medium text-blue-700 hover:text-blue-900">
                          {t("pdfsign_placement_summary", {
                            page: placement.pageIndex + 1,
                            width: Math.round(placement.width / (getPageSize(placement.pageIndex).renderScale || PREVIEW_SCALE)),
                            height: Math.round(placement.height / (getPageSize(placement.pageIndex).renderScale || PREVIEW_SCALE)),
                          })}
                        </button>
                        <button onClick={() => removePlacement(placement.id)} className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                          {t("pdfsign_delete")}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">{t("pdfsign_no_placements")}</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("pdfsign_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
