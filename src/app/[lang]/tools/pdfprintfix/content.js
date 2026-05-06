"use client";

import { useMemo, useState } from "react";
import { degrees, PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  formatFileSize,
  getVisualOrientation,
  getVisualPageSize,
  makeOutputFileName,
  normalizeRotationAngle,
  summarizePages,
} from "./logic";

function buildPageItems(pdfDoc) {
  return pdfDoc.getPages().map((page, index) => {
    const rawWidth = page.getWidth();
    const rawHeight = page.getHeight();
    const rotation = normalizeRotationAngle(page.getRotation().angle || 0);
    const visualSize = getVisualPageSize(rawWidth, rawHeight, rotation);

    return {
      id: `page-${index + 1}`,
      pageNumber: index + 1,
      rotation,
      rawWidth,
      rawHeight,
      visualWidth: visualSize.width,
      visualHeight: visualSize.height,
      visualOrientation: getVisualOrientation(rawWidth, rawHeight, rotation),
      needsFix: rotation !== 0,
    };
  });
}

function getDrawRotation(pageRotation) {
  if (pageRotation === 90) return 270;
  if (pageRotation === 270) return 90;
  return pageRotation;
}

function drawEmbeddedPage(targetPage, embeddedPage, pageInfo) {
  const { rotation, rawWidth, rawHeight, visualWidth, visualHeight } = pageInfo;
  const drawRotation = getDrawRotation(rotation);

  if (drawRotation === 90) {
    targetPage.drawPage(embeddedPage, {
      x: visualWidth,
      y: 0,
      width: rawWidth,
      height: rawHeight,
      rotate: degrees(90),
    });
    return;
  }

  if (drawRotation === 180) {
    targetPage.drawPage(embeddedPage, {
      x: visualWidth,
      y: visualHeight,
      width: rawWidth,
      height: rawHeight,
      rotate: degrees(180),
    });
    return;
  }

  if (drawRotation === 270) {
    targetPage.drawPage(embeddedPage, {
      x: 0,
      y: visualHeight,
      width: rawWidth,
      height: rawHeight,
      rotate: degrees(270),
    });
    return;
  }

  targetPage.drawPage(embeddedPage, {
    x: 0,
    y: 0,
    width: rawWidth,
    height: rawHeight,
  });
}

async function flattenPrintOrientation(pdfBytes, pageItems, onProgress) {
  const sourcePdf = await PDFDocument.load(pdfBytes.slice(), { ignoreEncryption: true });
  const outputPdf = await PDFDocument.create();
  const sourcePages = sourcePdf.getPages();

  for (let index = 0; index < sourcePages.length; index += 1) {
    const sourcePage = sourcePages[index];
    const pageInfo = pageItems[index];
    const embeddedPage = await outputPdf.embedPage(sourcePage);
    const targetPage = outputPdf.addPage([pageInfo.visualWidth, pageInfo.visualHeight]);
    drawEmbeddedPage(targetPage, embeddedPage, pageInfo);
    onProgress?.(index + 1, sourcePages.length);

    if (index % 4 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return outputPdf.save({ useObjectStreams: true });
}

export default function PdfPrintFixContent() {
  const { t } = useI18n();
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageItems, setPageItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const summary = useMemo(() => summarizePages(pageItems), [pageItems]);

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showModal(t("pdfprintfix_error_invalid_format"));
      return;
    }

    setIsProcessing(true);
    setStatusMessage(t("pdfprintfix_reading"));
    setPdfFile(null);
    setPdfBytes(null);
    setPageItems([]);

    try {
      const rawBytes = new Uint8Array(await file.arrayBuffer());
      const pdfDoc = await PDFDocument.load(rawBytes.slice(), { ignoreEncryption: true });
      const items = buildPageItems(pdfDoc);
      setPdfFile(file);
      setPdfBytes(rawBytes);
      setPageItems(items);
      setStatusMessage(t("pdfprintfix_loaded", { count: items.length, rotated: items.filter((item) => item.needsFix).length }));
    } catch (error) {
      console.error("PDF print fix read failed:", error);
      showModal(t("pdfprintfix_error_read"));
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setPdfFile(null);
    setPdfBytes(null);
    setPageItems([]);
    setStatusMessage("");
  };

  const exportPdf = async () => {
    if (!pdfBytes || !pdfFile || pageItems.length === 0) {
      showModal(t("pdfprintfix_error_missing_file"));
      return;
    }

    setIsProcessing(true);
    setStatusMessage(t("pdfprintfix_processing"));

    try {
      const outputBytes = await flattenPrintOrientation(pdfBytes, pageItems, (current, total) => {
        setStatusMessage(t("pdfprintfix_progress", { current, total }));
      });
      saveAs(new Blob([outputBytes], { type: "application/pdf" }), makeOutputFileName(pdfFile.name));
      setStatusMessage(t("pdfprintfix_success"));
    } catch (error) {
      console.error("PDF print fix failed:", error);
      showModal(t("pdfprintfix_error_process"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfprintfix_upload_title")}</h2>
          <FileUploadBox accept=".pdf" onChange={handleFileUpload} title={t("pdfprintfix_upload_hint")} maxSize={120} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("pdfprintfix_upload_note")}</p>
          {pdfFile && (
            <div className="mt-4 rounded border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">{pdfFile.name}</p>
              <p>{formatFileSize(pdfFile.size)}</p>
            </div>
          )}
          {statusMessage && <p className="mt-3 text-sm text-blue-700">{statusMessage}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfprintfix_summary_title")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdfprintfix_total_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.totalPages || 0}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdfprintfix_rotated_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.rotatedPages || 0}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdfprintfix_portrait_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.portraitPages || 0}</p>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{t("pdfprintfix_landscape_pages")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.landscapePages || 0}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-600">{t("pdfprintfix_summary_hint")}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("pdfprintfix_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("pdfprintfix_action_note")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={exportPdf}
              disabled={isProcessing || pageItems.length === 0}
              className={`px-5 py-3 rounded font-medium text-white ${isProcessing || pageItems.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isProcessing ? t("pdfprintfix_processing") : t("pdfprintfix_export_button")}
            </button>
            <button
              onClick={clearAll}
              disabled={isProcessing || !pdfFile}
              className={`px-5 py-3 rounded font-medium ${!pdfFile || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}
            >
              {t("pdfprintfix_clear_button")}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold">{t("pdfprintfix_pages_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("pdfprintfix_pages_hint")}</p>
          </div>
        </div>

        {pageItems.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
            {t("pdfprintfix_empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t("pdfprintfix_page_number")}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t("pdfprintfix_rotation_header")}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t("pdfprintfix_original_size")}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t("pdfprintfix_visual_size")}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t("pdfprintfix_orientation_header")}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t("pdfprintfix_fix_header")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-gray-800">{item.pageNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{item.rotation}°</td>
                    <td className="px-4 py-3 text-gray-700">
                      {Math.round(item.rawWidth)} x {Math.round(item.rawHeight)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {Math.round(item.visualWidth)} x {Math.round(item.visualHeight)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.visualOrientation === "portrait" ? t("pdfprintfix_portrait") : t("pdfprintfix_landscape")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.needsFix ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                        {item.needsFix ? t("pdfprintfix_needs_fix") : t("pdfprintfix_already_flat")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("pdfprintfix_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
