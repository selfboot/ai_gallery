"use client";

import { useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";

if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
}

function sanitizeFileName(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
}

function parseRanges(rangeInput, totalPages, t) {
  const tokens = rangeInput
    .split(/[;,，；]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error(t("splitpdf_error_range_empty"));
  }

  return tokens.map((token) => {
    const singleMatch = token.match(/^\d+$/);
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);

    let start = 0;
    let end = 0;

    if (singleMatch) {
      start = Number(token);
      end = start;
    } else if (rangeMatch) {
      start = Number(rangeMatch[1]);
      end = Number(rangeMatch[2]);
    } else {
      throw new Error(t("splitpdf_error_range_invalid", { token }));
    }

    if (start < 1 || end < start || end > totalPages) {
      throw new Error(t("splitpdf_error_range_exceed", { token, total: totalPages }));
    }

    return {
      type: "range",
      start,
      end,
      label: start === end ? `p${start}` : `p${start}-${end}`,
    };
  });
}

function buildFileName({ prefix, suffix, startIndex, padding, index }) {
  const safePrefix = sanitizeFileName(prefix || "");
  const safeSuffix = sanitizeFileName(suffix || "");
  const nameBase = safePrefix || "document";
  const serial = String(startIndex + index).padStart(Math.max(1, padding), "0");
  return `${nameBase}${safeSuffix}_${serial}.pdf`;
}

async function extractTopLevelBookmarks(pdfBytes) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;

  try {
    const outline = await pdf.getOutline();
    if (!outline || outline.length === 0) {
      return [];
    }

    const entries = [];

    for (const item of outline) {
      let destination = item.dest;
      if (typeof destination === "string") {
        destination = await pdf.getDestination(destination);
      }

      if (!Array.isArray(destination) || !destination[0]) {
        continue;
      }

      try {
        const pageIndex = await pdf.getPageIndex(destination[0]);
        entries.push({
          page: pageIndex + 1,
          title: (item.title || "").trim(),
        });
      } catch {
        // Ignore invalid destination entries.
      }
    }

    const dedup = new Map();
    entries
      .sort((a, b) => a.page - b.page)
      .forEach((entry) => {
        if (!dedup.has(entry.page)) {
          dedup.set(entry.page, entry);
        }
      });

    return Array.from(dedup.values());
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      // ignore destroy failure
    }
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function buildPagesForSegment(segment) {
  if (segment.type === "pages") {
    return segment.pages;
  }

  const pages = [];
  for (let p = segment.start; p <= segment.end; p += 1) {
    pages.push(p);
  }
  return pages;
}

export default function PdfSplitContent() {
  const { t } = useI18n();

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [splitMode, setSplitMode] = useState("single");
  const [rangeInput, setRangeInput] = useState("1-3;4-6");
  const [fixedPages, setFixedPages] = useState(5);

  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("_split");
  const [startIndex, setStartIndex] = useState(1);
  const [padding, setPadding] = useState(2);

  const [analysis, setAnalysis] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const modeOptions = useMemo(
    () => [
      { value: "single", label: t("splitpdf_mode_single") },
      { value: "oddEven", label: t("splitpdf_mode_oddeven") },
      { value: "range", label: t("splitpdf_mode_range") },
      { value: "fixed", label: t("splitpdf_mode_fixed") },
      { value: "pageBreak", label: t("splitpdf_mode_pagebreak") },
      { value: "heading1", label: t("splitpdf_mode_heading1") },
    ],
    [t]
  );

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    setOutputs([]);

    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showModal(t("splitpdf_error_invalid_format"));
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawBytes = new Uint8Array(arrayBuffer);
      const bytesForProcessing = rawBytes.slice();
      const bytesForBookmarks = rawBytes.slice();

      const srcPdf = await PDFDocument.load(bytesForProcessing, { ignoreEncryption: true });
      const totalPages = srcPdf.getPageCount();

      const headingEntries = await extractTopLevelBookmarks(bytesForBookmarks);

      setPdfFile(file);
      setPdfBytes(bytesForProcessing);
      setPrefix(file.name.replace(/\.[^/.]+$/, ""));
      setBookmarks(headingEntries);
      setAnalysis({
        totalPages,
        bookmarkCount: headingEntries.length,
      });
    } catch (error) {
      console.error(error);
      showModal(error.message || t("splitpdf_error_read"));
    }
  };

  const buildSegments = (totalPages) => {
    if (splitMode === "single") {
      return Array.from({ length: totalPages }, (_, index) => ({
        type: "range",
        start: index + 1,
        end: index + 1,
        label: `p${index + 1}`,
      }));
    }

    if (splitMode === "oddEven") {
      const oddPages = [];
      const evenPages = [];

      for (let p = 1; p <= totalPages; p += 1) {
        if (p % 2 === 1) {
          oddPages.push(p);
        } else {
          evenPages.push(p);
        }
      }

      const segments = [];
      if (oddPages.length > 0) {
        segments.push({ type: "pages", pages: oddPages, label: "odd" });
      }
      if (evenPages.length > 0) {
        segments.push({ type: "pages", pages: evenPages, label: "even" });
      }
      return segments;
    }

    if (splitMode === "range") {
      return parseRanges(rangeInput, totalPages, t);
    }

    if (splitMode === "fixed") {
      const chunkSize = Number(fixedPages);
      if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
        throw new Error(t("splitpdf_error_fixed_invalid"));
      }

      const segments = [];
      for (let start = 1; start <= totalPages; start += chunkSize) {
        const end = Math.min(totalPages, start + chunkSize - 1);
        segments.push({
          type: "range",
          start,
          end,
          label: start === end ? `p${start}` : `p${start}-${end}`,
        });
      }
      return segments;
    }

    if (splitMode === "pageBreak") {
      // PDF is already paginated; this mode is equivalent to single-page splitting.
      return Array.from({ length: totalPages }, (_, index) => ({
        type: "range",
        start: index + 1,
        end: index + 1,
        label: `pb${index + 1}`,
      }));
    }

    if (splitMode === "heading1") {
      if (!bookmarks.length) {
        throw new Error(t("splitpdf_error_no_heading"));
      }

      const segments = [];
      for (let i = 0; i < bookmarks.length; i += 1) {
        const start = bookmarks[i].page;
        const end = i < bookmarks.length - 1 ? bookmarks[i + 1].page - 1 : totalPages;
        if (end >= start) {
          segments.push({
            type: "range",
            start,
            end,
            label: bookmarks[i].title || `h1-${i + 1}`,
          });
        }
      }

      if (!segments.length) {
        throw new Error(t("splitpdf_error_no_heading"));
      }

      return segments;
    }

    return [];
  };

  const handleSplit = async () => {
    if (!pdfBytes) {
      showModal(t("splitpdf_error_no_file"));
      return;
    }

    try {
      setIsProcessing(true);

      const srcPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const totalPages = srcPdf.getPageCount();
      const segments = buildSegments(totalPages);

      if (!segments.length) {
        throw new Error(t("splitpdf_error_split_failed"));
      }

      const generated = [];

      for (let i = 0; i < segments.length; i += 1) {
        const segment = segments[i];
        const pageNumbers = buildPagesForSegment(segment);
        const pageIndices = pageNumbers.map((p) => p - 1);

        const outPdf = await PDFDocument.create();
        const copiedPages = await outPdf.copyPages(srcPdf, pageIndices);
        copiedPages.forEach((page) => outPdf.addPage(page));

        const outBytes = await outPdf.save();

        generated.push({
          name: buildFileName({
            prefix,
            suffix,
            startIndex: Number(startIndex) || 1,
            padding: Number(padding) || 2,
            index: i,
          }),
          label: segment.label,
          pageCount: pageNumbers.length,
          data: outBytes,
        });
      }

      setOutputs(generated);
    } catch (error) {
      console.error(error);
      showModal(error.message || t("splitpdf_error_split_failed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOne = (item) => {
    const blob = new Blob([item.data], { type: "application/pdf" });
    saveAs(blob, item.name);
  };

  const handleDownloadAll = async () => {
    if (!outputs.length) {
      return;
    }

    const { default: PizZip } = await import("pizzip");
    const zip = new PizZip();

    outputs.forEach((item) => {
      zip.file(item.name, item.data);
    });

    const blob = zip.generate({ type: "blob", mimeType: "application/zip" });
    const archiveBase = sanitizeFileName(prefix || "") || sanitizeFileName(pdfFile?.name.replace(/\.[^/.]+$/, "") || "pdf");
    const archiveName = `${archiveBase}_split_${new Date().toISOString().slice(0, 10)}.zip`;
    saveAs(blob, archiveName);
  };

  const clearOutputs = () => {
    setOutputs([]);
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="flex flex-col lg:flex-row lg:space-x-8 mb-8">
        <div className="lg:w-1/2">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">{t("splitpdf_upload_title")}</h2>
            <FileUploadBox
              accept=".pdf"
              onChange={handleFileUpload}
              title={t("splitpdf_upload_hint")}
              maxSize={120}
              className="min-h-32"
            />

            {pdfFile && <p className="text-sm text-green-600 mt-2">{t("splitpdf_selected_file", { name: pdfFile.name })}</p>}

            <div className="mt-6 border-t pt-5">
              <h3 className="font-medium text-gray-800 mb-2">{t("splitpdf_stats_title")}</h3>
              {analysis ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {t("splitpdf_stats_pages", { count: analysis.totalPages })}</li>
                  <li>• {t("splitpdf_stats_bookmarks", { count: analysis.bookmarkCount })}</li>
                </ul>
              ) : (
                <p className="text-sm text-gray-500">{t("splitpdf_stats_not_ready")}</p>
              )}
              <p className="text-xs text-gray-500 leading-5 mt-3">{t("splitpdf_note")}</p>
            </div>
          </div>
        </div>

        <div className="lg:w-1/2 mt-6 lg:mt-0">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">{t("splitpdf_control_title")}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("splitpdf_mode_label")}</label>
                <select
                  value={splitMode}
                  onChange={(event) => setSplitMode(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {modeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {splitMode === "range" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("splitpdf_range_label")}</label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(event) => setRangeInput(event.target.value)}
                    placeholder={t("splitpdf_range_placeholder")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("splitpdf_range_hint")}</p>
                </div>
              )}

              {splitMode === "fixed" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("splitpdf_fixed_label")}</label>
                  <input
                    type="number"
                    min="1"
                    value={fixedPages}
                    onChange={(event) => setFixedPages(event.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("splitpdf_fixed_hint")}</p>
                </div>
              )}

              <div className="border-t pt-5">
                <h3 className="text-base font-semibold text-gray-800 mb-3">{t("splitpdf_name_rule_title")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t("splitpdf_name_prefix")}</label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(event) => setPrefix(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t("splitpdf_name_suffix")}</label>
                    <input
                      type="text"
                      value={suffix}
                      onChange={(event) => setSuffix(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t("splitpdf_name_start_index")}</label>
                    <input
                      type="number"
                      min="1"
                      value={startIndex}
                      onChange={(event) => setStartIndex(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t("splitpdf_name_padding")}</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={padding}
                      onChange={(event) => setPadding(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSplit}
                disabled={!pdfBytes || isProcessing}
                className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-colors text-lg ${
                  !pdfBytes || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isProcessing ? t("splitpdf_processing") : t("splitpdf_split_button")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {outputs.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">
              {t("splitpdf_outputs_title")} ({outputs.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                {t("splitpdf_download_all")}
              </button>
              <button onClick={clearOutputs} className="px-4 py-2 text-sm rounded text-red-600 hover:text-red-700">
                {t("splitpdf_clear_outputs")}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("splitpdf_output_name")}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("splitpdf_output_label")}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("splitpdf_output_pages")}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("splitpdf_output_size")}</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t("splitpdf_download")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {outputs.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-800 break-all">{item.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{item.label}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{item.pageCount}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatFileSize(item.data.byteLength)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDownloadOne(item)}
                        className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200"
                      >
                        {t("splitpdf_download")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-center">
          <p className="text-gray-700 mb-4 whitespace-pre-line">{modalMessage}</p>
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-6 py-2 rounded text-white font-medium bg-blue-500 hover:bg-blue-600"
          >
            {t("splitpdf_modal_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
