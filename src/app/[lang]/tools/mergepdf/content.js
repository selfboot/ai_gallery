"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function PdfMergerContent() {
  const { t } = useI18n();
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [statusMessage, setStatusMessage] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleFileUpload = (uploadedFiles) => {
    setStatusMessage("");

    const filesToProcess = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

    const validFiles = [];
    const errors = [];

    filesToProcess.forEach((file) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        errors.push(`${file.name}: ${t("mergepdf_invalid_format")}`);
        return;
      }

      if (files.some((existing) => existing.name === file.name)) {
        errors.push(`${file.name}: ${t("mergepdf_file_exists")}`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      showModal(errors.join("\n"), "error");
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);

      if (validFiles.length === 1) {
        setStatusMessage(`✓ ${t("mergepdf_file_added")}${validFiles[0].name}`);
      } else {
        setStatusMessage(`✓ ${t("mergepdf_files_added", { count: validFiles.length })}`);
      }
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setStatusMessage("");
  };

  const moveFile = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= files.length) {
      return;
    }

    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setFiles(newFiles);
  };

  const mergeDocuments = async () => {
    if (files.length < 2) {
      showModal(t("mergepdf_min_files_error"), "error");
      return;
    }

    setIsProcessing(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const sourcePageIndices = sourcePdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const fileName = `${t("mergepdf_merged_filename")}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
      saveAs(new Blob([mergedPdfBytes], { type: "application/pdf" }), fileName);

      showModal(t("mergepdf_merge_success"), "success");
    } catch (error) {
      console.error("PDF merge failed:", error);
      showModal(`${t("mergepdf_merge_error")} ${error.message || t("mergepdf_read_file_error")}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAllFiles = () => {
    setFiles([]);
    setStatusMessage("");
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDropCard = (index) => {
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    moveFile(draggedIndex, index);
    setDraggedIndex(null);
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="flex flex-col lg:flex-row lg:space-x-8 mb-8">
        <div className="lg:w-1/2">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">{t("mergepdf_upload_title")}</h2>
            <FileUploadBox
              accept=".pdf"
              multiple
              onChange={handleFileUpload}
              title={t("mergepdf_upload_hint")}
              maxSize={120}
              className="min-h-32"
            />
            {statusMessage && <p className="text-sm text-green-600 mt-2 font-medium">{statusMessage}</p>}

            <div className="mt-auto pt-6">
              <button
                onClick={mergeDocuments}
                disabled={isProcessing || files.length < 2}
                className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-colors text-lg ${
                  isProcessing || files.length < 2 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isProcessing ? t("mergepdf_merging") : t("mergepdf_merge_button", { count: files.length || 0 })}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-1/2 mt-6 lg:mt-0">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">{t("mergepdf_feature_title")}</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">{t("mergepdf_merge_process")}</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {t("mergepdf_merge_info_1")}</li>
                  <li>• {t("mergepdf_merge_info_2")}</li>
                  <li>• {t("mergepdf_merge_info_3")}</li>
                  <li>• {t("mergepdf_merge_info_4")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">{t("mergepdf_features")}</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{t("mergepdf_feature_1")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{t("mergepdf_feature_2")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{t("mergepdf_feature_3")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{t("mergepdf_feature_4")}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {t("mergepdf_uploaded_files")} ({files.length})
            </h2>
            <button onClick={clearAllFiles} className="text-red-500 hover:text-red-700 text-sm">
              {t("mergepdf_clear_all")}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-move"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDropCard(index)}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">#{index + 1}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => moveFile(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title={t("mergepdf_move_up")}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveFile(index, index + 1)}
                      disabled={index === files.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title={t("mergepdf_move_down")}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title={t("mergepdf_delete")}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("mergepdf_file_size")}
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500 mt-4 text-center">{t("mergepdf_order_hint")}</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-center">
          <div
            className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              modalType === "error"
                ? "bg-red-100"
                : modalType === "success"
                  ? "bg-green-100"
                  : "bg-blue-100"
            }`}
          >
            <span
              className={`text-2xl ${
                modalType === "error"
                  ? "text-red-600"
                  : modalType === "success"
                    ? "text-green-600"
                    : "text-blue-600"
              }`}
            >
              {modalType === "error" ? "✕" : modalType === "success" ? "✓" : "ℹ"}
            </span>
          </div>
          <p className="text-gray-700 mb-4 whitespace-pre-line">{modalMessage}</p>
          <button
            onClick={() => setIsModalOpen(false)}
            className={`px-6 py-2 rounded text-white font-medium ${
              modalType === "error"
                ? "bg-red-500 hover:bg-red-600"
                : modalType === "success"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {t("mergepdf_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
