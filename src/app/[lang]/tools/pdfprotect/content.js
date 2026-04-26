"use client";

import { useMemo, useState } from "react";
import PizZip from "pizzip";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  PDF_PROTECT_ACCEPT,
  formatFileSize,
  makePdfId,
  makeProtectedPdfName,
  makeProtectedZipName,
  makeUniqueFileName,
  summarizeResults,
  validatePassword,
} from "./logic";

const DEFAULT_SETTINGS = {
  userPassword: "",
  ownerPassword: "",
  useSeparateOwnerPassword: false,
  showPasswords: false,
};

async function loadPdfInfo(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(bytes.slice());
  return {
    id: makePdfId(file),
    file,
    bytes,
    name: file.name,
    size: file.size,
    pageCount: pdfDoc.getPageCount(),
  };
}

async function protectOnePdf(item, settings, usedNames) {
  const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt-lite");
  const ownerPassword = settings.useSeparateOwnerPassword && settings.ownerPassword ? settings.ownerPassword : undefined;
  const protectedBytes = await encryptPDF(item.bytes.slice(), settings.userPassword, ownerPassword);
  const blob = new Blob([protectedBytes], { type: "application/pdf" });

  return {
    id: item.id,
    name: item.name,
    outputName: makeUniqueFileName(makeProtectedPdfName(item.name), usedNames),
    pageCount: item.pageCount,
    originalSize: item.size,
    outputSize: blob.size,
    blob,
  };
}

export default function PdfProtectContent() {
  const { t } = useI18n();
  const [pdfItems, setPdfItems] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const summary = useMemo(() => summarizeResults(results), [results]);
  const totalPages = useMemo(() => pdfItems.reduce((sum, item) => sum + item.pageCount, 0), [pdfItems]);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setResults([]);
    setStatusMessage("");
  };

  const handleFileUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        errors.push(`${file.name}: ${t("pdfprotect_invalid_format")}`);
        return false;
      }
      if (pdfItems.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("pdfprotect_file_exists")}`);
        return false;
      }
      return true;
    });

    if (errors.length > 0) showModal(errors.join("\n"), "error");
    if (validFiles.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    try {
      const loaded = [];
      for (const file of validFiles) {
        try {
          loaded.push(await loadPdfInfo(file));
        } catch (error) {
          errors.push(`${file.name}: ${t("pdfprotect_read_error")}`);
        }
      }
      if (errors.length > 0) showModal(errors.join("\n"), "error");
      if (loaded.length > 0) {
        setPdfItems((current) => [...current, ...loaded]);
        setStatusMessage(t("pdfprotect_files_added", { count: loaded.length }));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const removePdf = (id) => {
    setPdfItems((current) => current.filter((item) => item.id !== id));
    setResults([]);
  };

  const clearAll = () => {
    setPdfItems([]);
    setResults([]);
    setProgressText("");
    setStatusMessage("");
  };

  const protectPdfs = async () => {
    if (pdfItems.length === 0) {
      showModal(t("pdfprotect_min_files_error"), "error");
      return;
    }
    const passwordValidation = validatePassword(settings.userPassword);
    if (!passwordValidation.ok) {
      showModal(t(passwordValidation.reason === "tooLong" ? "pdfprotect_password_too_long" : "pdfprotect_password_too_short"), "error");
      return;
    }
    if (settings.useSeparateOwnerPassword && settings.ownerPassword && !validatePassword(settings.ownerPassword).ok) {
      showModal(t("pdfprotect_owner_password_invalid"), "error");
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setProgressText("");
    try {
      const protectedResults = [];
      const usedNames = new Set();
      for (let index = 0; index < pdfItems.length; index += 1) {
        setProgressText(t("pdfprotect_progress", { current: index + 1, total: pdfItems.length }));
        const result = await protectOnePdf(pdfItems[index], settings, usedNames);
        protectedResults.push(result);
        setResults([...protectedResults]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      setStatusMessage(t("pdfprotect_success", { count: protectedResults.length }));
    } catch (error) {
      console.error("PDF protect failed:", error);
      showModal(t("pdfprotect_process_error"), "error");
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
      showModal(t("pdfprotect_no_results"), "error");
      return;
    }
    const zip = new PizZip();
    for (const result of results) {
      zip.file(result.outputName, await result.blob.arrayBuffer());
    }
    const content = zip.generate({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    saveAs(content, makeProtectedZipName());
  };

  return (
    <div className="mx-auto mt-4 w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("pdfprotect_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("pdfprotect_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept={PDF_PROTECT_ACCEPT} multiple onChange={handleFileUpload} title={t("pdfprotect_upload_hint")} maxSize={120} className="min-h-32" />
            </div>
            {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("pdfprotect_files_title", { count: pdfItems.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("pdfprotect_files_hint")}</p>
              </div>
              <button onClick={clearAll} disabled={pdfItems.length === 0 || isProcessing} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                {t("pdfprotect_clear")}
              </button>
            </div>

            {pdfItems.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("pdfprotect_no_files")}</div>
            ) : (
              <div className="mt-5 space-y-3">
                {pdfItems.map((item) => {
                  const result = results.find((entry) => entry.id === item.id);
                  return (
                    <div key={item.id} className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-950" title={item.name}>{item.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{item.pageCount} {t("pdfprotect_pages")} · {formatFileSize(item.size)}</p>
                          {result && <p className="mt-1 text-xs text-green-700">{t("pdfprotect_output_size", { size: formatFileSize(result.outputSize) })}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => result && downloadOne(result)} disabled={!result} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                            {t("pdfprotect_download_one")}
                          </button>
                          <button onClick={() => removePdf(item.id)} disabled={isProcessing} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                            {t("pdfprotect_delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {results.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-950">{t("pdfprotect_results_title")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">{t("pdfprotect_result_count")}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-950">{summary.count}</p>
                </div>
                <div className="rounded border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">{t("pdfprotect_original_size")}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-950">{formatFileSize(summary.originalSize)}</p>
                </div>
                <div className="rounded border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">{t("pdfprotect_protected_size")}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-950">{formatFileSize(summary.outputSize)}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("pdfprotect_settings_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("pdfprotect_settings_hint")}</p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-gray-700">
                <span className="mb-2 block font-medium">{t("pdfprotect_user_password")}</span>
                <input type={settings.showPasswords ? "text" : "password"} value={settings.userPassword} onChange={(event) => updateSetting("userPassword", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" placeholder={t("pdfprotect_user_password_placeholder")} />
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={settings.useSeparateOwnerPassword} onChange={(event) => updateSetting("useSeparateOwnerPassword", event.target.checked)} className="mt-1" />
                <span>{t("pdfprotect_use_owner_password")}</span>
              </label>

              {settings.useSeparateOwnerPassword && (
                <label className="block text-sm text-gray-700">
                  <span className="mb-2 block font-medium">{t("pdfprotect_owner_password")}</span>
                  <input type={settings.showPasswords ? "text" : "password"} value={settings.ownerPassword} onChange={(event) => updateSetting("ownerPassword", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" placeholder={t("pdfprotect_owner_password_placeholder")} />
                </label>
              )}

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={settings.showPasswords} onChange={(event) => updateSetting("showPasswords", event.target.checked)} className="mt-1" />
                <span>{t("pdfprotect_show_passwords")}</span>
              </label>
            </div>

            <div className="mt-5 rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <h3 className="font-semibold text-gray-950">{t("pdfprotect_summary_title")}</h3>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfprotect_summary_files")}</dt>
                  <dd>{pdfItems.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfprotect_summary_pages")}</dt>
                  <dd>{totalPages}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">{t("pdfprotect_encryption")}</dt>
                  <dd>RC4 128-bit</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 rounded border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              {t("pdfprotect_security_note")}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button onClick={protectPdfs} disabled={isProcessing || pdfItems.length === 0} className="rounded bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {isProcessing ? t("pdfprotect_processing") : t("pdfprotect_protect_button", { count: pdfItems.length })}
              </button>
              <button onClick={downloadAll} disabled={isProcessing || results.length === 0} className="rounded bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                {t("pdfprotect_download_all")}
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
            {t("pdfprotect_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
