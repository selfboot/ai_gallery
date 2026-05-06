"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { PDFDocument } from "pdf-lib";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  QR_CODE_BATCH_ACCEPT,
  DEFAULT_SETTINGS,
  OUTPUT_FORMATS,
  PDF_PAGE_PRESETS,
  buildRecords,
  clampNumber,
  detectColumns,
  formatFileSize,
  getCellText,
  getPdfPresetById,
  getSampleRows,
  sanitizeFileName,
  splitLines,
  suggestColumnKeys,
  truncateText,
} from "./logic";

const DEFAULT_SOURCE = {
  fileName: "",
  type: "",
  workbook: null,
  sheets: [],
  sheetName: "",
  rows: [],
  columns: [],
};

function getFileType(fileName) {
  const lowerName = String(fileName || "").toLowerCase();
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) return "excel";
  if (lowerName.endsWith(".csv")) return "csv";
  return "";
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getBaseFileName(fileName) {
  return sanitizeFileName(String(fileName || "batch-qr").replace(/\.[^.]+$/, ""), "batch-qr");
}

function makeArchiveName(fileName, format) {
  const base = getBaseFileName(fileName);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === OUTPUT_FORMATS.PDF) {
    return `${base}_qr_cards_${stamp}.pdf`;
  }
  return `${base}_qr_cards_${stamp}.zip`;
}

async function readExcelFile(file, hasHeaderRow) {
  const buffer = await file.arrayBuffer();
  const parsedWorkbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    dense: true,
  });
  const worksheets = parsedWorkbook.SheetNames.map((sheetName) => {
    const sheet = parsedWorkbook.Sheets[sheetName];
    return {
      name: sheetName,
      rows: XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
      }),
    };
  });
  const firstSheet = worksheets[0];

  return {
    fileName: file.name,
    type: "excel",
    workbook: { worksheets },
    sheets: worksheets.map((worksheet, index) => ({ id: index + 1, name: worksheet.name })),
    sheetName: firstSheet?.name || "",
    rows: firstSheet?.rows || [],
    columns: detectColumns(firstSheet?.rows || [], hasHeaderRow),
  };
}

function readCsvFile(file, hasHeaderRow) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      worker: true,
      skipEmptyLines: false,
      complete: (result) => {
        const rows = result.data || [];
        resolve({
          fileName: file.name,
          type: "csv",
          workbook: null,
          sheets: [],
          sheetName: "",
          rows,
          columns: detectColumns(rows, hasHeaderRow),
        });
      },
      error: reject,
    });
  });
}

function applySourceSettings(source, hasHeaderRow, partialSettings = {}) {
  const columns = detectColumns(source.rows || [], hasHeaderRow);
  const guessed = suggestColumnKeys(columns, source.rows || [], hasHeaderRow);

  return {
    source: {
      ...source,
      columns,
    },
    settings: {
      ...partialSettings,
      hasHeaderRow,
      contentColumnKey: partialSettings.contentColumnKey || guessed.contentColumnKey,
      titleColumnKey: partialSettings.titleColumnKey || guessed.titleColumnKey,
    },
  };
}

async function svgToPngBlob(svgString, width, height) {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (nextBlob) resolve(nextBlob);
          else reject(new Error("png-export-failed"));
        },
        "image/png",
        0.96
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderCardSvg(record, settings) {
  const cardWidth = clampNumber(settings.cardWidth, DEFAULT_SETTINGS.cardWidth, 720, 2000);
  const cardHeight = clampNumber(settings.cardHeight, DEFAULT_SETTINGS.cardHeight, 860, 2600);
  const padding = clampNumber(settings.padding, DEFAULT_SETTINGS.padding, 32, 160);
  const qrSize = clampNumber(settings.qrSize, DEFAULT_SETTINGS.qrSize, 320, 1200);
  const titleFontSize = clampNumber(settings.titleFontSize, DEFAULT_SETTINGS.titleFontSize, 24, 120);
  const subtitleFontSize = clampNumber(settings.subtitleFontSize, DEFAULT_SETTINGS.subtitleFontSize, 14, 56);
  const titleLineClamp = clampNumber(settings.titleLineClamp, DEFAULT_SETTINGS.titleLineClamp, 1, 3);

  const qrSvg = await QRCode.toString(record.content, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    width: qrSize,
    color: {
      dark: settings.textColor,
      light: "#0000",
    },
  });
  const innerSvg = qrSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)?.[1] || "";
  const qrViewBox = qrSvg.match(/viewBox="([^"]+)"/i)?.[1] || `0 0 ${qrSize} ${qrSize}`;
  const qrX = Math.round((cardWidth - qrSize) / 2);
  const qrY = padding + 160;
  const qrOuterSize = qrSize + 56;
  const qrOuterX = Math.round((cardWidth - qrOuterSize) / 2);
  const qrOuterY = qrY - 28;
  const badgeText = record.showIndex ? `#${record.rowNumber}` : "";
  const titleLines = record.showTitle ? splitLines(record.title, 24, titleLineClamp) : [];
  const titleStartY = qrY + qrSize + 96;
  const contentLine = truncateText(record.content, 54);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">
  <rect width="${cardWidth}" height="${cardHeight}" rx="38" fill="${escapeXml(settings.backgroundColor)}"/>
  <rect x="18" y="18" width="${cardWidth - 36}" height="${cardHeight - 36}" rx="30" fill="none" stroke="#dbe4f0" stroke-width="3"/>
  <rect x="${padding}" y="${padding}" width="${cardWidth - padding * 2}" height="86" rx="22" fill="#eff6ff"/>
  <circle cx="${padding + 42}" cy="${padding + 43}" r="10" fill="${escapeXml(settings.accentColor)}"/>
  <text x="${padding + 72}" y="${padding + 52}" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="${escapeXml(settings.textColor)}">Batch QR Card</text>
  ${badgeText ? `<rect x="${cardWidth - padding - 156}" y="${padding + 16}" width="156" height="54" rx="18" fill="${escapeXml(settings.accentColor)}"/><text x="${cardWidth - padding - 78}" y="${padding + 51}" text-anchor="middle" font-size="28" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#ffffff">${escapeXml(badgeText)}</text>` : ""}
  <rect x="${qrOuterX}" y="${qrOuterY}" width="${qrOuterSize}" height="${qrOuterSize}" rx="34" fill="#ffffff" stroke="#d1d9e6" stroke-width="3"/>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${escapeXml(qrViewBox)}">${innerSvg}</svg>
  ${titleLines
    .map(
      (line, index) =>
        `<text x="${cardWidth / 2}" y="${titleStartY + index * (titleFontSize + 14)}" text-anchor="middle" font-size="${titleFontSize}" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="${escapeXml(settings.textColor)}">${escapeXml(line)}</text>`
    )
    .join("")}
  <text x="${cardWidth / 2}" y="${cardHeight - padding - 54}" text-anchor="middle" font-size="${subtitleFontSize}" font-family="Arial, Helvetica, sans-serif" fill="#4b5563">${escapeXml(contentLine)}</text>
  <text x="${cardWidth / 2}" y="${cardHeight - padding - 14}" text-anchor="middle" font-size="${subtitleFontSize}" font-family="Arial, Helvetica, sans-serif" fill="#94a3b8">Generated locally in your browser</text>
</svg>`;
}

async function buildExportBundle(records, sourceFileName, settings, format, onProgress) {
  const archiveName = makeArchiveName(sourceFileName, format);

  if (format === OUTPUT_FORMATS.PDF) {
    const pdf = await PDFDocument.create();
    const pagePreset = getPdfPresetById(settings.pdfPagePreset);
    const margin = clampNumber(settings.pdfMargin, DEFAULT_SETTINGS.pdfMargin, 16, 80);
    const gap = clampNumber(settings.pdfGap, DEFAULT_SETTINGS.pdfGap, 8, 40);
    const columns = clampNumber(settings.pdfColumns, DEFAULT_SETTINGS.pdfColumns, 1, 4);
    let cellWidth = (pagePreset.width - margin * 2 - gap * (columns - 1)) / columns;
    const cardRatio = clampNumber(settings.cardHeight, DEFAULT_SETTINGS.cardHeight, 860, 2600) / clampNumber(settings.cardWidth, DEFAULT_SETTINGS.cardWidth, 720, 2000);
    let cellHeight = cellWidth * cardRatio;
    let rowsPerPage = Math.floor((pagePreset.height - margin * 2 + gap) / (cellHeight + gap));

    if (rowsPerPage < 1) {
      rowsPerPage = 1;
      cellHeight = pagePreset.height - margin * 2;
      cellWidth = cellHeight / cardRatio;
    }

    let page = null;
    let itemOnPage = 0;

    for (let index = 0; index < records.length; index += 1) {
      if (!page || itemOnPage >= rowsPerPage * columns) {
        page = pdf.addPage([pagePreset.width, pagePreset.height]);
        itemOnPage = 0;
      }

      const record = records[index];
      onProgress?.(Math.round(((index + 1) / Math.max(records.length, 1)) * 100), index + 1, records.length);
      const svg = await renderCardSvg(record, settings);
      const pngBlob = await svgToPngBlob(svg, clampNumber(settings.cardWidth, DEFAULT_SETTINGS.cardWidth, 720, 2000), clampNumber(settings.cardHeight, DEFAULT_SETTINGS.cardHeight, 860, 2600));
      const pngBytes = await pngBlob.arrayBuffer();
      const embedded = await pdf.embedPng(pngBytes);

      const col = itemOnPage % columns;
      const row = Math.floor(itemOnPage / columns);
      const x = margin + col * (cellWidth + gap);
      const y = pagePreset.height - margin - cellHeight - row * (cellHeight + gap);
      page.drawImage(embedded, {
        x,
        y,
        width: cellWidth,
        height: cellHeight,
      });

      itemOnPage += 1;
      if (index % 6 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const bytes = await pdf.save();
    return {
      type: "blob",
      fileName: archiveName,
      blob: new Blob([bytes], { type: "application/pdf" }),
    };
  }

  const zip = new PizZip();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    onProgress?.(Math.round(((index + 1) / Math.max(records.length, 1)) * 100), index + 1, records.length);
    const svg = await renderCardSvg(record, settings);
    if (format === OUTPUT_FORMATS.SVG) {
      zip.file(`${record.fileBaseName}.svg`, svg);
    } else {
      const pngBlob = await svgToPngBlob(svg, clampNumber(settings.cardWidth, DEFAULT_SETTINGS.cardWidth, 720, 2000), clampNumber(settings.cardHeight, DEFAULT_SETTINGS.cardHeight, 860, 2600));
      zip.file(`${record.fileBaseName}.png`, await pngBlob.arrayBuffer());
    }

    if (index % 8 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    type: "blob",
    fileName: archiveName,
    blob: zip.generate({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
  };
}

export default function QrCodeBatchContent() {
  const { t } = useI18n();
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const recordPreview = useMemo(() => {
    try {
      return buildRecords(source.rows, source.columns, settings);
    } catch {
      return [];
    }
  }, [settings, source.columns, source.rows]);

  const sampleRows = useMemo(() => getSampleRows(source.rows, settings.hasHeaderRow ? 7 : 6), [settings.hasHeaderRow, source.rows]);

  useEffect(() => {
    let active = true;

    async function updatePreview() {
      if (!recordPreview.length) {
        setPreviewUrl("");
        return;
      }

      try {
        const svg = await renderCardSvg(recordPreview[0], settings);
        if (!active) return;
        const nextUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        setPreviewUrl(nextUrl);
      } catch {
        if (active) setPreviewUrl("");
      }
    }

    updatePreview();
    return () => {
      active = false;
    };
  }, [recordPreview, settings]);

  const handleFileUpload = async (file) => {
    if (!file) return;

    const fileType = getFileType(file.name);
    if (!fileType) {
      showModal(t("qrcodebatch_invalid_format"));
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage(t("qrcodebatch_reading"));

    try {
      const parsed = fileType === "excel" ? await readExcelFile(file, settings.hasHeaderRow) : await readCsvFile(file, settings.hasHeaderRow);
      const next = applySourceSettings(parsed, settings.hasHeaderRow, settings);
      setSource(next.source);
      setSettings((current) => ({
        ...current,
        ...next.settings,
      }));
      setStatusMessage(t("qrcodebatch_file_loaded", { name: file.name, count: Math.max((parsed.rows || []).length - (settings.hasHeaderRow ? 1 : 0), 0) }));
    } catch (error) {
      console.error("QR batch read failed:", error);
      showModal(t("qrcodebatch_read_error"));
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const updateSheet = (sheetName) => {
    const worksheet = source.workbook?.worksheets?.find((item) => item.name === sheetName);
    const rows = worksheet?.rows || [];
    const columns = detectColumns(rows, settings.hasHeaderRow);
    const guessed = suggestColumnKeys(columns, rows, settings.hasHeaderRow);

    setSource((current) => ({
      ...current,
      sheetName,
      rows,
      columns,
    }));
    setSettings((current) => ({
      ...current,
      contentColumnKey: guessed.contentColumnKey,
      titleColumnKey: guessed.titleColumnKey,
    }));
    setStatusMessage("");
  };

  const updateHeaderMode = (hasHeaderRow) => {
    const next = applySourceSettings(source, hasHeaderRow, settings);
    setSource(next.source);
    setSettings((current) => ({
      ...current,
      ...next.settings,
    }));
  };

  const handleExport = async (format) => {
    if (!source.rows.length) {
      showModal(t("qrcodebatch_missing_file"));
      return;
    }
    if (!settings.contentColumnKey) {
      showModal(t("qrcodebatch_missing_content_column"));
      return;
    }

    let records;
    try {
      records = buildRecords(source.rows, source.columns, settings);
    } catch (error) {
      console.error("QR batch records failed:", error);
      showModal(t("qrcodebatch_missing_content_column"));
      return;
    }

    if (!records.length) {
      showModal(t("qrcodebatch_no_valid_rows"));
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage(t(format === OUTPUT_FORMATS.PDF ? "qrcodebatch_exporting_pdf" : "qrcodebatch_exporting_zip"));

    try {
      const bundle = await buildExportBundle(records, source.fileName, settings, format, (percent, current, total) => {
        setProgress(percent);
        setStatusMessage(t("qrcodebatch_progress", { current, total, percent }));
      });
      saveAs(bundle.blob, bundle.fileName);
      setStatusMessage(t("qrcodebatch_done", { count: records.length, format: format.toUpperCase() }));
    } catch (error) {
      console.error("QR batch export failed:", error);
      showModal(t("qrcodebatch_export_error"));
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const sourceSummary = useMemo(() => {
    const dataRows = settings.hasHeaderRow ? Math.max(source.rows.length - 1, 0) : source.rows.length;
    return {
      rowCount: dataRows,
      columnCount: source.columns.length,
    };
  }, [settings.hasHeaderRow, source.columns.length, source.rows.length]);

  return (
    <>
      <div className="w-full mx-auto mt-4 mb-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <section className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t("qrcodebatch_upload_title")}</h2>
              <p className="mt-2 text-sm text-gray-600">{t("qrcodebatch_upload_hint")}</p>
              <p className="mt-2 text-sm text-gray-500">{t("qrcodebatch_upload_note")}</p>
            </div>
            <FileUploadBox accept={QR_CODE_BATCH_ACCEPT} onChange={handleFileUpload} title={t("qrcodebatch_upload_box")} maxSize={30} />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span>{t("qrcodebatch_source_rows", { count: sourceSummary.rowCount })}</span>
                <span>{t("qrcodebatch_source_columns", { count: sourceSummary.columnCount })}</span>
                <span>{source.fileName || t("qrcodebatch_no_file")}</span>
              </div>
              {statusMessage ? <p className="mt-3">{statusMessage}</p> : null}
              {isProcessing ? (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{progress}%</div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_content_column")}</span>
                <select
                  value={settings.contentColumnKey}
                  onChange={(event) => setSettings((current) => ({ ...current, contentColumnKey: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">{t("qrcodebatch_column_placeholder")}</option>
                  {source.columns.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_title_column")}</span>
                <select
                  value={settings.titleColumnKey}
                  onChange={(event) => setSettings((current) => ({ ...current, titleColumnKey: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">{t("qrcodebatch_title_column_optional")}</option>
                  {source.columns.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>

              {source.sheets.length > 0 ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_sheet_name")}</span>
                  <select value={source.sheetName} onChange={(event) => updateSheet(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {source.sheets.map((sheet) => (
                      <option key={sheet.id} value={sheet.name}>
                        {sheet.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div />
              )}

              <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.hasHeaderRow}
                  onChange={(event) => updateHeaderMode(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>{t("qrcodebatch_has_header")}</span>
              </label>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {source.columns.length > 0 ? (
                      source.columns.map((column) => (
                        <th key={column.key} className="px-3 py-2 text-left font-medium text-slate-700">
                          {column.label}
                        </th>
                      ))
                    ) : (
                      <th className="px-3 py-6 text-left font-medium text-slate-500">{t("qrcodebatch_table_empty")}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {source.columns.length > 0
                    ? sampleRows.map((row, rowIndex) => (
                        <tr key={`${rowIndex}-${row.join("-")}`}>
                          {source.columns.map((column) => (
                            <td key={column.key} className="max-w-[200px] truncate px-3 py-2 text-slate-600">
                              {getCellText(row[column.index])}
                            </td>
                          ))}
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-lg p-6 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t("qrcodebatch_settings_title")}</h2>
              <p className="mt-2 text-sm text-gray-600">{t("qrcodebatch_settings_hint")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_card_width")}</span>
                <input type="number" value={settings.cardWidth} min="720" max="2000" onChange={(event) => setSettings((current) => ({ ...current, cardWidth: Number(event.target.value) || current.cardWidth }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_card_height")}</span>
                <input type="number" value={settings.cardHeight} min="860" max="2600" onChange={(event) => setSettings((current) => ({ ...current, cardHeight: Number(event.target.value) || current.cardHeight }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_qr_size")}</span>
                <input type="number" value={settings.qrSize} min="320" max="1200" onChange={(event) => setSettings((current) => ({ ...current, qrSize: Number(event.target.value) || current.qrSize }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_start_number")}</span>
                <input type="number" value={settings.startNumber} onChange={(event) => setSettings((current) => ({ ...current, startNumber: Number(event.target.value) || 1 }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_title_font")}</span>
                <input type="number" value={settings.titleFontSize} min="24" max="120" onChange={(event) => setSettings((current) => ({ ...current, titleFontSize: Number(event.target.value) || current.titleFontSize }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_pdf_columns")}</span>
                <input type="number" value={settings.pdfColumns} min="1" max="4" onChange={(event) => setSettings((current) => ({ ...current, pdfColumns: Number(event.target.value) || current.pdfColumns }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={settings.includeTitle} onChange={(event) => setSettings((current) => ({ ...current, includeTitle: event.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                <span>{t("qrcodebatch_include_title")}</span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={settings.includeIndex} onChange={(event) => setSettings((current) => ({ ...current, includeIndex: event.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                <span>{t("qrcodebatch_include_index")}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_background")}</span>
                <input type="color" value={settings.backgroundColor} onChange={(event) => setSettings((current) => ({ ...current, backgroundColor: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-1 py-1" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_text_color")}</span>
                <input type="color" value={settings.textColor} onChange={(event) => setSettings((current) => ({ ...current, textColor: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-1 py-1" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_accent_color")}</span>
                <input type="color" value={settings.accentColor} onChange={(event) => setSettings((current) => ({ ...current, accentColor: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-1 py-1" />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">{t("qrcodebatch_pdf_page")}</span>
              <select value={settings.pdfPagePreset} onChange={(event) => setSettings((current) => ({ ...current, pdfPagePreset: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {PDF_PAGE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {t(preset.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t("qrcodebatch_preview_title")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("qrcodebatch_preview_hint")}</p>
                </div>
                <div className="text-xs text-slate-500">{t("qrcodebatch_preview_count", { count: recordPreview.length })}</div>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-3">
                {previewUrl ? (
                  <img src={previewUrl} alt={t("qrcodebatch_preview_title")} className="mx-auto max-h-[420px] w-full object-contain" />
                ) : (
                  <div className="flex h-[360px] items-center justify-center text-sm text-slate-400">{t("qrcodebatch_preview_empty")}</div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t("qrcodebatch_export_title")}</h2>
              <p className="mt-2 text-sm text-gray-600">{t("qrcodebatch_export_hint")}</p>
              <p className="mt-2 text-sm text-gray-500">
                {t("qrcodebatch_export_summary", {
                  count: recordPreview.length,
                  page: getPdfPresetById(settings.pdfPagePreset).id.toUpperCase(),
                })}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button onClick={() => handleExport(OUTPUT_FORMATS.PNG)} disabled={isProcessing} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {t("qrcodebatch_export_png")}
              </button>
              <button onClick={() => handleExport(OUTPUT_FORMATS.SVG)} disabled={isProcessing} className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {t("qrcodebatch_export_svg")}
              </button>
              <button onClick={() => handleExport(OUTPUT_FORMATS.PDF)} disabled={isProcessing} className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                {t("qrcodebatch_export_pdf")}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">{t("qrcodebatch_scene_title")}</div>
              <div className="mt-2 text-sm text-slate-600">{t("qrcodebatch_scene_urls")}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">{t("qrcodebatch_scene_template_title")}</div>
              <div className="mt-2 text-sm text-slate-600">{t("qrcodebatch_scene_template_hint")}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">{t("qrcodebatch_scene_local_title")}</div>
              <div className="mt-2 text-sm text-slate-600">{t("qrcodebatch_scene_local_hint")}</div>
            </div>
          </div>
        </section>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("qrcodebatch_confirm")}
          </button>
        </div>
      </Modal>
    </>
  );
}
