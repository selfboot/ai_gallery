"use client";

import { useEffect, useMemo, useState } from "react";
import { saveAs } from "file-saver";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";

const PDFJS_BASE_URL = (process.env.NEXT_PUBLIC_PDFJS_BASE_URL || "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149").replace(/\/$/, "");
const PDFJS_MODULE_URL = `${PDFJS_BASE_URL}/pdf.mjs`;
const PDFJS_WORKER_URL = `${PDFJS_BASE_URL}/pdf.worker.mjs`;

let pdfjsPromise = null;

async function loadPdfJs() {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = (async () => {
    const pdfjsLib = await import(/* webpackIgnore: true */ PDFJS_MODULE_URL);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return pdfjsLib;
  })();
  return pdfjsPromise;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function makeProxyUrl(file) {
  return `/api/courtwssd/file?url=${encodeURIComponent(file.sourceUrl)}&name=${encodeURIComponent(file.name)}`;
}

async function renderFirstPage(file) {
  const pdfjsLib = await loadPdfJs();
  const response = await fetch(makeProxyUrl(file));
  if (!response.ok) throw new Error("fetch pdf failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.55 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, background: "white" }).promise;
    page.cleanup();
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    await loadingTask.destroy();
  }
}

function PdfThumb({ file }) {
  const { t } = useI18n();
  const [previewUrl, setPreviewUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setPreviewUrl("");
    setFailed(false);
    renderFirstPage(file)
      .then((url) => {
        if (alive) setPreviewUrl(url);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [file]);

  if (previewUrl) {
    return <img src={previewUrl} alt={file.name} className="h-full w-full object-contain" />;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white text-sm text-gray-500">
      <div className="flex h-16 w-12 items-center justify-center rounded border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700">PDF</div>
      <span>{failed ? t("courtwssd_thumb_failed") : t("courtwssd_thumb_loading")}</span>
    </div>
  );
}

export default function CourtWssdContent() {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [deliveryId, setDeliveryId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadMode, setDownloadMode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const courtNames = useMemo(() => [...new Set(files.map((file) => file.courtName).filter(Boolean))], [files]);

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const getErrorMessage = (code) => {
    const key = `courtwssd_error_${code}`;
    const message = t(key);
    return message === key ? t("courtwssd_error_failed") : message;
  };

  const loadFiles = async () => {
    if (!url.trim()) {
      showModal(t("courtwssd_error_empty"));
      return;
    }
    setIsLoading(true);
    setStatusMessage(t("courtwssd_loading"));
    setFiles([]);
    try {
      const response = await fetch("/api/courtwssd/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "request failed");
      setFiles(payload.files || []);
      setDeliveryId(payload.params?.sdbh || "");
      setStatusMessage(t("courtwssd_loaded", { count: payload.count || 0 }));
    } catch (error) {
      console.error("Court delivery list failed:", error);
      setStatusMessage("");
      showModal(getErrorMessage(error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const downloadOne = async (file) => {
    saveAs(makeProxyUrl(file), file.name);
  };

  const downloadAll = async () => {
    if (!files.length) return;
    setDownloadMode("zip");
    setStatusMessage(t("courtwssd_downloading"));
    try {
      const response = await fetch("/api/courtwssd/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "download failed");
      }
      const blob = await response.blob();
      saveAs(blob, `court-delivery-${deliveryId || "documents"}.zip`);
      setStatusMessage(t("courtwssd_downloaded"));
    } catch (error) {
      console.error("Court delivery zip failed:", error);
      setStatusMessage("");
      showModal(t("courtwssd_error_download"));
    } finally {
      setDownloadMode("");
    }
  };

  const downloadMergedPdf = async () => {
    if (!files.length) return;
    setDownloadMode("merge");
    setStatusMessage(t("courtwssd_merging"));
    try {
      const response = await fetch("/api/courtwssd/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "merge failed");
      }
      const blob = await response.blob();
      saveAs(blob, `court-delivery-${deliveryId || "documents"}.pdf`);
      setStatusMessage(t("courtwssd_merged"));
    } catch (error) {
      console.error("Court delivery PDF merge failed:", error);
      setStatusMessage("");
      showModal(t("courtwssd_error_merge"));
    } finally {
      setDownloadMode("");
    }
  };

  const clearAll = () => {
    setFiles([]);
    setDeliveryId("");
    setStatusMessage("");
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-900">{t("courtwssd_input_label")}</span>
            <textarea
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t("courtwssd_input_placeholder")}
              className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex flex-col gap-2">
            <button onClick={loadFiles} disabled={isLoading} className="rounded bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300">
              {isLoading ? t("courtwssd_loading") : t("courtwssd_fetch_button")}
            </button>
            <button onClick={downloadAll} disabled={!files.length || Boolean(downloadMode)} className="rounded bg-green-600 px-5 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300">
              {downloadMode === "zip" ? t("courtwssd_downloading") : t("courtwssd_download_all")}
            </button>
            <button onClick={downloadMergedPdf} disabled={!files.length || Boolean(downloadMode)} className="rounded bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300">
              {downloadMode === "merge" ? t("courtwssd_merging") : t("courtwssd_download_merged_pdf")}
            </button>
            <button onClick={clearAll} disabled={!files.length && !statusMessage} className="rounded bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:text-gray-400">
              {t("courtwssd_clear")}
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-600">{t("courtwssd_input_note")}</p>
        {statusMessage && <p className="mt-3 text-sm font-medium text-gray-700">{statusMessage}</p>}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">{t("courtwssd_files_title", { count: files.length })}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              {files.length ? t("courtwssd_files_hint") : t("courtwssd_empty")}
            </p>
          </div>
          {files.length > 0 && (
            <div className="text-sm text-gray-500">
              {courtNames.join(" / ")}
              {deliveryId ? ` · ${deliveryId}` : ""}
            </div>
          )}
        </div>

        {files.length ? (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
            {files.map((file) => (
              <article key={file.id} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                <div className="mx-auto aspect-[3/4] max-h-44 overflow-hidden rounded border border-gray-200 bg-white">
                  <PdfThumb file={file} />
                </div>
                <div className="mt-2 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-xs font-semibold text-gray-950" title={file.name}>{file.name}</h3>
                    <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">#{file.index}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">{file.courtName || t("courtwssd_unknown_court")}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatDate(file.createdAt)}</p>
                  <div className="mt-2 flex gap-1.5">
                    <a href={makeProxyUrl(file)} target="_blank" rel="noreferrer" className="flex-1 rounded bg-white px-2 py-1.5 text-center text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100">
                      {t("courtwssd_preview")}
                    </a>
                    <button onClick={() => downloadOne(file)} className="flex-1 rounded bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                      {t("courtwssd_download_one")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex min-h-52 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-500">
            {t("courtwssd_empty_detail")}
          </div>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("courtwssd_notice")}>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{modalMessage}</p>
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t("courtwssd_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
