"use client";

import { useEffect, useState } from "react";
import { degrees, PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import { formatFileSize, getVisiblePageStats, makeOutputFileName, moveItem, removePageItem, rotatePageItem } from "./logic";

function buildPageItems(pageCount) {
  return Array.from({ length: pageCount }, (_, index) => ({
    id: `page-${index + 1}-${Math.random().toString(36).slice(2)}`,
    sourceIndex: index,
    pageNumber: index + 1,
    rotation: 0,
  }));
}

function revokePreviewUrls(urls) {
  urls.forEach((url) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  });
}

async function createSinglePagePreviewUrls(sourcePdf) {
  const urls = [];
  const pageCount = sourcePdf.getPageCount();

  for (let index = 0; index < pageCount; index += 1) {
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(sourcePdf, [index]);
    singlePagePdf.addPage(copiedPage);
    const singlePageBytes = await singlePagePdf.save({ useObjectStreams: true });
    urls.push(URL.createObjectURL(new Blob([singlePageBytes], { type: "application/pdf" })));
  }

  return urls;
}

function PdfPreviewFrame({ url, title, rotation = 0, scale = 1.12, interactive = false }) {
  if (!url) {
    return null;
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      <div className="h-full w-full" style={{ transform: `rotate(${rotation}deg) scale(${scale})`, transformOrigin: "center" }}>
        <iframe
          src={`${url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
          title={title}
          className="h-full w-full border-0 bg-white"
          style={{ pointerEvents: interactive ? "auto" : "none" }}
        />
      </div>
    </div>
  );
}

export default function PdfOrganizeContent() {
  const { t } = useI18n();
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pagePreviewUrls, setPagePreviewUrls] = useState([]);
  const [originalPageCount, setOriginalPageCount] = useState(0);
  const [pages, setPages] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [previewPage, setPreviewPage] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = getVisiblePageStats(originalPageCount, pages);

  useEffect(() => {
    return () => {
      revokePreviewUrls(pagePreviewUrls);
    };
  }, [pagePreviewUrls]);

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showModal(t("pdforganize_error_invalid_format"));
      return;
    }

    setIsProcessing(true);
    setStatusMessage(t("pdforganize_reading"));
    setPdfFile(null);
    setPdfBytes(null);
    setPagePreviewUrls((current) => {
      revokePreviewUrls(current);
      return [];
    });
    setOriginalPageCount(0);
    setPages([]);
    setPreviewPage(null);

    try {
      const rawBytes = new Uint8Array(await file.arrayBuffer());
      const sourcePdf = await PDFDocument.load(rawBytes.slice(), { ignoreEncryption: true });
      const pageCount = sourcePdf.getPageCount();
      const previewUrls = await createSinglePagePreviewUrls(sourcePdf);

      setPdfFile(file);
      setPdfBytes(rawBytes);
      setPagePreviewUrls(previewUrls);
      setOriginalPageCount(pageCount);
      setPages(buildPageItems(pageCount));
      setStatusMessage(t("pdforganize_loaded", { count: pageCount }));
    } catch (error) {
      console.error("PDF organize read failed:", error);
      showModal(t("pdforganize_error_read"));
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  const rotatePage = (index) => {
    setPages((current) => current.map((page, pageIndex) => (pageIndex === index ? rotatePageItem(page, 90) : page)));
  };

  const removePage = (index) => {
    setPages((current) => removePageItem(current, index));
  };

  const movePage = (fromIndex, toIndex) => {
    setPages((current) => moveItem(current, fromIndex, toIndex));
  };

  const handleDropCard = (index) => {
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }
    movePage(draggedIndex, index);
    setDraggedIndex(null);
  };

  const resetFile = () => {
    setPdfFile(null);
    setPdfBytes(null);
    setPagePreviewUrls((current) => {
      revokePreviewUrls(current);
      return [];
    });
    setOriginalPageCount(0);
    setPages([]);
    setPreviewPage(null);
    setStatusMessage("");
  };

  const resetPages = () => {
    if (!originalPageCount) {
      return;
    }

    setPages(buildPageItems(originalPageCount));
    setDraggedIndex(null);
    setPreviewPage(null);
    setStatusMessage(t("pdforganize_reset_success"));
  };

  const downloadPdf = async () => {
    if (!pdfBytes || pages.length === 0) {
      showModal(t("pdforganize_error_no_pages"));
      return;
    }

    setIsProcessing(true);
    setStatusMessage(t("pdforganize_processing"));
    try {
      const sourcePdf = await PDFDocument.load(pdfBytes.slice(), { ignoreEncryption: true });
      const outputPdf = await PDFDocument.create();

      for (let index = 0; index < pages.length; index += 1) {
        const item = pages[index];
        const [copiedPage] = await outputPdf.copyPages(sourcePdf, [item.sourceIndex]);
        const originalRotation = copiedPage.getRotation().angle || 0;
        copiedPage.setRotation(degrees((originalRotation + item.rotation) % 360));
        outputPdf.addPage(copiedPage);
      }

      const outputBytes = await outputPdf.save({ useObjectStreams: true });
      saveAs(new Blob([outputBytes], { type: "application/pdf" }), makeOutputFileName(pdfFile?.name));
      setStatusMessage(t("pdforganize_success"));
    } catch (error) {
      console.error("PDF organize failed:", error);
      showModal(t("pdforganize_error_process"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdforganize_upload_title")}</h2>
          <FileUploadBox accept=".pdf" onChange={handleFileUpload} title={t("pdforganize_upload_hint")} maxSize={120} className="min-h-32" />
          {pdfFile && (
            <div className="mt-4 rounded border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">{pdfFile.name}</p>
              <p>{formatFileSize(pdfFile.size)}</p>
            </div>
          )}
          {statusMessage && <p className="mt-3 text-sm text-blue-700">{statusMessage}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdforganize_summary_title")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdforganize_original_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.originalPageCount}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdforganize_output_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.outputPageCount}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdforganize_deleted_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.deletedPageCount}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdforganize_rotated_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.rotatedPageCount}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-600">{t("pdforganize_summary_hint")}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("pdforganize_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("pdforganize_privacy_note")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={downloadPdf} disabled={isProcessing || pages.length === 0} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || pages.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("pdforganize_processing") : t("pdforganize_download_button")}
            </button>
            <button onClick={resetPages} disabled={isProcessing || !pdfFile} className={`px-5 py-3 rounded font-medium ${!pdfFile || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}>
              {t("pdforganize_reset_button")}
            </button>
            <button onClick={resetFile} disabled={isProcessing || !pdfFile} className={`px-5 py-3 rounded font-medium ${!pdfFile || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("pdforganize_clear_button")}
            </button>
          </div>
        </div>
      </div>

      {pages.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{t("pdforganize_pages_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("pdforganize_pages_hint")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {pages.map((page, index) => (
              <div
                key={page.id}
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDropCard(index)}
                onClick={() => setPreviewPage(page)}
                className="cursor-move rounded border border-gray-200 bg-gray-50 p-3 transition hover:bg-gray-100"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700">#{index + 1}</span>
                  <span className="text-xs text-gray-500">{t("pdforganize_source_page", { page: page.pageNumber })}</span>
                </div>
                <div className="relative aspect-[3/4] overflow-hidden rounded border border-gray-200 bg-white">
                  {pagePreviewUrls[page.sourceIndex] ? (
                    <PdfPreviewFrame
                      url={pagePreviewUrls[page.sourceIndex]}
                      title={t("pdforganize_page_alt", { page: page.pageNumber })}
                      rotation={page.rotation}
                      scale={1.14}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-50 p-4 text-center">
                      <p className="text-sm font-semibold text-gray-700">{t("pdforganize_page_placeholder", { page: page.pageNumber })}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-sm">
                  <button onClick={(event) => { event.stopPropagation(); movePage(index, index - 1); }} disabled={index === 0} className="rounded border border-gray-200 bg-white py-1 text-gray-600 disabled:opacity-30" title={t("pdforganize_move_up")}>↑</button>
                  <button onClick={(event) => { event.stopPropagation(); rotatePage(index); }} className="rounded border border-gray-200 bg-white py-1 text-gray-700" title={t("pdforganize_rotate")}>↻</button>
                  <button onClick={(event) => { event.stopPropagation(); movePage(index, index + 1); }} disabled={index === pages.length - 1} className="rounded border border-gray-200 bg-white py-1 text-gray-600 disabled:opacity-30" title={t("pdforganize_move_down")}>↓</button>
                </div>
                <button onClick={(event) => { event.stopPropagation(); removePage(index); }} className="mt-2 w-full rounded bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
                  {t("pdforganize_delete")}
                </button>
                {page.rotation !== 0 && <p className="mt-2 text-center text-xs text-gray-500">{t("pdforganize_rotation_label", { degree: page.rotation })}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type="error">
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("pdforganize_confirm")}
          </button>
        </div>
      </Modal>

      {previewPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4" onClick={() => setPreviewPage(null)}>
          <div className="max-h-[92vh] w-[96vw] max-w-[980px] rounded bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t("pdforganize_preview_title", { page: previewPage.pageNumber })}</h3>
                <p className="text-sm text-gray-500">{t("pdforganize_source_page", { page: previewPage.pageNumber })}</p>
              </div>
              <button onClick={() => setPreviewPage(null)} className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
                {t("pdforganize_preview_close")}
              </button>
            </div>
            <div className="relative mx-auto h-[78vh] max-h-[78vh] overflow-hidden rounded border border-gray-200 bg-white">
              {pagePreviewUrls[previewPage.sourceIndex] && (
                <PdfPreviewFrame
                  url={pagePreviewUrls[previewPage.sourceIndex]}
                  title={t("pdforganize_page_alt", { page: previewPage.pageNumber })}
                  rotation={previewPage.rotation}
                  scale={1.08}
                  interactive
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
