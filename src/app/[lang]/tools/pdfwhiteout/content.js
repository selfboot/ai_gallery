"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import { clampAreaToPage, createAreaFromDrag, formatFileSize, makeOutputFileName, uiAreaToPdfRect } from "./logic";

const PDFJS_BASE_URL = (process.env.NEXT_PUBLIC_PDFJS_BASE_URL || "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149").replace(/\/$/, "");
const PDFJS_MODULE_URL = `${PDFJS_BASE_URL}/pdf.mjs`;
const PDFJS_WORKER_URL = `${PDFJS_BASE_URL}/pdf.worker.mjs`;
const PREVIEW_SCALE = 1.35;

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

function drawPage(canvas, page, viewport) {
  const context = canvas.getContext("2d", { alpha: false });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return page.render({ canvasContext: context, viewport, background: "white" }).promise;
}

function makeAreaId() {
  return `area-${Math.random().toString(36).slice(2, 10)}`;
}

function createWhitePngBytes() {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 1, 1);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("white png export failed"));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

export default function PdfWhiteoutContent() {
  const { t } = useI18n();
  const pageCanvasRefs = useRef([]);
  const pageFrameRefs = useRef([]);
  const dragStateRef = useRef(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageSizes, setPageSizes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const areaMap = useMemo(() => new Map(areas.map((item) => [item.id, item])), [areas]);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const getPageSize = (pageIndex) => pageSizes[pageIndex] || { width: 612, height: 792, renderScale: PREVIEW_SCALE };
  const getPageUiSize = (pageIndex) => {
    const frame = pageFrameRefs.current[pageIndex];
    const rect = frame?.getBoundingClientRect();
    if (rect?.width && rect?.height) {
      return { width: rect.width, height: rect.height };
    }
    const pageSize = getPageSize(pageIndex);
    return { width: pageSize.width, height: pageSize.height };
  };

  useEffect(() => {
    async function renderPdf() {
      if (!pdfBytes) {
        return;
      }

      setIsProcessing(true);
      setProgressText(t("pdfwhiteout_reading_pdf"));
      setStatusMessage("");

      try {
        const pdfjsLib = await loadPdfJs();
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
        const pdfDocument = await loadingTask.promise;
        const nextPageSizes = [];
        setPageCount(pdfDocument.numPages);

        for (let pageIndex = 0; pageIndex < pdfDocument.numPages; pageIndex += 1) {
          setProgressText(t("pdfwhiteout_rendering_page", { page: pageIndex + 1 }));
          const page = await pdfDocument.getPage(pageIndex + 1);
          const viewport = page.getViewport({ scale: PREVIEW_SCALE });
          nextPageSizes.push({
            width: viewport.width,
            height: viewport.height,
            renderScale: PREVIEW_SCALE,
          });
          const canvas = pageCanvasRefs.current[pageIndex];
          if (canvas) {
            await drawPage(canvas, page, viewport);
          }
        }

        setPageSizes(nextPageSizes);
        setAreas([]);
        setActiveAreaId(null);
        setStatusMessage(t("pdfwhiteout_pdf_loaded", { count: pdfDocument.numPages }));
      } catch (error) {
        console.error("PDF whiteout render failed:", error);
        showModal(t("pdfwhiteout_error_read_pdf"), "error");
      } finally {
        setIsProcessing(false);
        setProgressText("");
      }
    }

    renderPdf();
  }, [pdfBytes, t]);

  useEffect(() => {
    function handlePointerMove(event) {
      const state = dragStateRef.current;
      if (!state) {
        return;
      }

      const frame = pageFrameRefs.current[state.pageIndex];
      const pageSize = getPageUiSize(state.pageIndex);
      if (!frame || !pageSize) {
        return;
      }

      const rect = frame.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(event.clientX - rect.left, pageSize.width));
      const currentY = Math.max(0, Math.min(event.clientY - rect.top, pageSize.height));

      setAreas((current) =>
        current.map((item) => {
          if (item.id !== state.areaId) {
            return item;
          }

          if (state.type === "create") {
            return createAreaFromDrag({
              id: item.id,
              pageIndex: state.pageIndex,
              startX: state.startX,
              startY: state.startY,
              currentX,
              currentY,
              pageSize,
            });
          }

          if (state.type === "move") {
            return clampAreaToPage(
              {
                ...item,
                x: state.originX + (currentX - state.startX),
                y: state.originY + (currentY - state.startY),
              },
              pageSize
            );
          }

          if (state.type === "resize") {
            return clampAreaToPage(
              {
                ...item,
                width: state.originWidth + (currentX - state.startX),
                height: state.originHeight + (currentY - state.startY),
              },
              pageSize
            );
          }

          return item;
        })
      );
    }

    function handlePointerUp() {
      const state = dragStateRef.current;
      if (!state) {
        return;
      }

      dragStateRef.current = null;
      setAreas((current) => current.filter((item) => item.width >= 4 && item.height >= 4));
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [pageSizes]);

  const handlePdfUpload = async (uploadedFiles) => {
    const file = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;
    if (!file || file.type !== "application/pdf") {
      showModal(t("pdfwhiteout_error_invalid_pdf"), "error");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("");
    setProgressText(t("pdfwhiteout_reading_pdf"));
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setPdfFile(file);
      setPdfBytes(bytes.slice());
    } catch (error) {
      console.error("Read PDF failed:", error);
      showModal(t("pdfwhiteout_error_read_pdf"), "error");
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const clearPdf = () => {
    setPdfFile(null);
    setPdfBytes(null);
    setPageCount(0);
    setPageSizes([]);
    setAreas([]);
    setActiveAreaId(null);
    setProgressText("");
    setStatusMessage(t("pdfwhiteout_pdf_cleared"));
  };

  const startCreateArea = (pageIndex, event) => {
    if (!pdfBytes || event.target.closest("[data-area-item='true']")) {
      return;
    }

    const frame = pageFrameRefs.current[pageIndex];
    const pageSize = getPageUiSize(pageIndex);
    if (!frame || !pageSize) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    const startX = Math.max(0, Math.min(event.clientX - rect.left, pageSize.width));
    const startY = Math.max(0, Math.min(event.clientY - rect.top, pageSize.height));
    const areaId = makeAreaId();

    dragStateRef.current = {
      type: "create",
      areaId,
      pageIndex,
      startX,
      startY,
    };

    const area = createAreaFromDrag({
      id: areaId,
      pageIndex,
      startX,
      startY,
      currentX: startX + 4,
      currentY: startY + 4,
      pageSize,
    });

    setAreas((current) => [...current, area]);
    setActiveAreaId(areaId);
  };

  const startMoveArea = (areaId, pageIndex, event) => {
    event.stopPropagation();
    const area = areaMap.get(areaId);
    const frame = pageFrameRefs.current[pageIndex];
    const pageSize = getPageUiSize(pageIndex);
    if (!area || !frame || !pageSize) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    dragStateRef.current = {
      type: "move",
      areaId,
      pageIndex,
      startX: Math.max(0, Math.min(event.clientX - rect.left, pageSize.width)),
      startY: Math.max(0, Math.min(event.clientY - rect.top, pageSize.height)),
      originX: area.x,
      originY: area.y,
    };
    setActiveAreaId(areaId);
  };

  const startResizeArea = (areaId, pageIndex, event) => {
    event.stopPropagation();
    const area = areaMap.get(areaId);
    const frame = pageFrameRefs.current[pageIndex];
    const pageSize = getPageUiSize(pageIndex);
    if (!area || !frame || !pageSize) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    dragStateRef.current = {
      type: "resize",
      areaId,
      pageIndex,
      startX: Math.max(0, Math.min(event.clientX - rect.left, pageSize.width)),
      startY: Math.max(0, Math.min(event.clientY - rect.top, pageSize.height)),
      originWidth: area.width,
      originHeight: area.height,
    };
    setActiveAreaId(areaId);
  };

  const removeArea = (areaId) => {
    setAreas((current) => current.filter((item) => item.id !== areaId));
    if (activeAreaId === areaId) {
      setActiveAreaId(null);
    }
  };

  const jumpToArea = (areaId) => {
    const area = areaMap.get(areaId);
    if (!area) {
      return;
    }
    setActiveAreaId(areaId);
    pageFrameRefs.current[area.pageIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const exportPdf = async () => {
    if (!pdfBytes || !pdfFile) {
      showModal(t("pdfwhiteout_error_missing_pdf"), "error");
      return;
    }
    if (areas.length === 0) {
      showModal(t("pdfwhiteout_error_missing_area"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText(t("pdfwhiteout_exporting"));
    try {
      const pdfDocument = await PDFDocument.load(pdfBytes.slice(), { ignoreEncryption: true });
      const pages = pdfDocument.getPages();
      const whitePngBytes = await createWhitePngBytes();
      const whiteImage = await pdfDocument.embedPng(whitePngBytes);

      areas.forEach((area) => {
        const page = pages[area.pageIndex];
        const uiPageSize = getPageUiSize(area.pageIndex);
        if (!page || !uiPageSize) {
          return;
        }
        const pdfRect = uiAreaToPdfRect(area, page.getWidth(), page.getHeight(), uiPageSize.width, uiPageSize.height);
        page.drawImage(whiteImage, {
          x: pdfRect.x,
          y: pdfRect.y,
          width: pdfRect.width,
          height: pdfRect.height,
        });
      });

      const outputBytes = await pdfDocument.save();
      saveAs(new Blob([outputBytes], { type: "application/pdf" }), makeOutputFileName(pdfFile.name));
      setStatusMessage(t("pdfwhiteout_success"));
    } catch (error) {
      console.error("Export PDF whiteout failed:", error);
      showModal(t("pdfwhiteout_error_export"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfwhiteout_upload_title")}</h2>
          <FileUploadBox accept=".pdf" onChange={handlePdfUpload} title={t("pdfwhiteout_upload_hint")} maxSize={80} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("pdfwhiteout_upload_note")}</p>
          {pdfFile && <p className="mt-3 text-sm text-gray-700">{pdfFile.name} · {formatFileSize(pdfFile.size)}</p>}
          {statusMessage && <p className="mt-2 text-sm text-green-700">{statusMessage}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfwhiteout_action_title")}</h2>
          <p className="text-sm text-gray-600">{t("pdfwhiteout_privacy_note")}</p>
          {progressText && <p className="mt-3 text-sm text-blue-700">{progressText}</p>}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button onClick={exportPdf} disabled={isProcessing || !pdfBytes || areas.length === 0} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || !pdfBytes || areas.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("pdfwhiteout_processing") : t("pdfwhiteout_export_button")}
            </button>
            <button onClick={clearPdf} disabled={isProcessing || !pdfBytes} className={`px-5 py-3 rounded font-medium ${isProcessing || !pdfBytes ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("pdfwhiteout_clear")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-1">{t("pdfwhiteout_preview_title")}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("pdfwhiteout_preview_hint")}</p>

          {!pdfBytes ? (
            <div className="flex min-h-64 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-gray-500">
              {t("pdfwhiteout_empty_preview")}
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from({ length: pageCount }).map((_, pageIndex) => {
                const pageAreas = areas.filter((item) => item.pageIndex === pageIndex);
                const pageSize = getPageSize(pageIndex);
                return (
                  <div key={`page-${pageIndex}`} className="mx-auto max-w-full">
                    <div className="mb-2 text-sm font-medium text-gray-700">{t("pdfwhiteout_page_label", { page: pageIndex + 1 })}</div>
                    <div
                      ref={(element) => {
                        pageFrameRefs.current[pageIndex] = element;
                      }}
                      className="relative w-fit max-w-full overflow-hidden rounded border border-gray-200 bg-gray-100"
                      onMouseDown={(event) => startCreateArea(pageIndex, event)}
                      style={{ cursor: pdfBytes ? "crosshair" : "default" }}
                    >
                      <canvas
                        ref={(element) => {
                          pageCanvasRefs.current[pageIndex] = element;
                        }}
                        className="block max-w-full h-auto"
                      />
                      <div className="absolute inset-0">
                        {pageAreas.map((area) => (
                          <div
                            key={area.id}
                            data-area-item="true"
                            className={`absolute border ${activeAreaId === area.id ? "border-blue-500" : "border-gray-400"} bg-white`}
                            style={{
                              left: area.x,
                              top: area.y,
                              width: area.width,
                              height: area.height,
                              opacity: 0.98,
                            }}
                            onMouseDown={(event) => startMoveArea(area.id, pageIndex, event)}
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveAreaId(area.id);
                            }}
                          >
                            <div
                              data-area-item="true"
                              className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize"
                              onMouseDown={(event) => startResizeArea(area.id, pageIndex, event)}
                              aria-label={t("pdfwhiteout_resize")}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 h-fit">
          <h2 className="text-xl font-semibold mb-1">{t("pdfwhiteout_areas_title", { count: areas.length })}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("pdfwhiteout_areas_hint")}</p>
          {areas.length === 0 ? (
            <p className="text-sm text-gray-500">{t("pdfwhiteout_no_areas")}</p>
          ) : (
            <div className="space-y-3">
              {areas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => jumpToArea(area.id)}
                  className={`w-full rounded border px-3 py-3 text-left ${activeAreaId === area.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <div className="font-medium text-gray-900">{t("pdfwhiteout_area_summary", { page: area.pageIndex + 1 })}</div>
                  <div className="mt-1 text-xs text-gray-500">{t("pdfwhiteout_output_size", { width: Math.round(area.width), height: Math.round(area.height) })}</div>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{t("pdfwhiteout_jump")}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeArea(area.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          removeArea(area.id);
                        }
                      }}
                    >
                      {t("pdfwhiteout_delete")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("pdfwhiteout_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
