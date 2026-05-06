export const QR_CODE_BATCH_ACCEPT = ".xlsx,.xls,.csv";

export const OUTPUT_FORMATS = {
  PNG: "png",
  SVG: "svg",
  PDF: "pdf",
};

export const PDF_PAGE_PRESETS = [
  { id: "a4", labelKey: "qrcodebatch_pdf_page_a4", width: 595.28, height: 841.89 },
  { id: "letter", labelKey: "qrcodebatch_pdf_page_letter", width: 612, height: 792 },
];

export const DEFAULT_SETTINGS = {
  hasHeaderRow: true,
  contentColumnKey: "",
  titleColumnKey: "",
  includeTitle: true,
  includeIndex: true,
  startNumber: 1,
  qrSize: 720,
  cardWidth: 1080,
  cardHeight: 1320,
  padding: 72,
  titleFontSize: 54,
  subtitleFontSize: 28,
  titleLineClamp: 2,
  backgroundColor: "#ffffff",
  textColor: "#111827",
  accentColor: "#2563eb",
  outputFormat: OUTPUT_FORMATS.PNG,
  pdfPagePreset: "a4",
  pdfColumns: 2,
  pdfMargin: 28,
  pdfGap: 18,
};

export function getCellText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function columnLabel(columnNumber) {
  let current = columnNumber;
  let label = "";

  while (current > 0) {
    const mod = (current - 1) % 26;
    label = String.fromCharCode(65 + mod) + label;
    current = Math.floor((current - mod) / 26);
  }

  return label;
}

export function detectColumns(rows, hasHeaderRow = true) {
  const maxColumn = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const firstRow = rows[0] || [];

  return Array.from({ length: maxColumn }, (_, index) => {
    const key = String(index + 1);
    const label = columnLabel(index + 1);
    const header = hasHeaderRow ? getCellText(firstRow[index]).trim() : "";
    return {
      key,
      index,
      label: header ? `${label} - ${header}` : label,
      header,
    };
  });
}

export function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function sanitizeFileName(value, fallback = "qr-code") {
  return String(value || fallback)
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

export function truncateText(value, maxLength = 90) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export function getPdfPresetById(id) {
  return PDF_PAGE_PRESETS.find((item) => item.id === id) || PDF_PAGE_PRESETS[0];
}

export function splitLines(text, maxCharsPerLine, lineClamp) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine || !current) {
      current = next;
      return;
    }
    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  if (lines.length <= lineClamp) return lines;

  const clamped = lines.slice(0, lineClamp);
  clamped[lineClamp - 1] = truncateText(clamped[lineClamp - 1], maxCharsPerLine);
  return clamped;
}

export function getSampleRows(rows, limit = 6) {
  return rows.slice(0, Math.max(0, limit));
}

export function isLikelyUrl(value) {
  const text = String(value || "").trim();
  return /^https?:\/\/\S+/i.test(text) || /^mailto:\S+/i.test(text) || /^tel:\S+/i.test(text);
}

export function suggestColumnKeys(columns, rows, hasHeaderRow = true) {
  const dataRows = hasHeaderRow ? rows.slice(1) : rows;
  const sampleRows = dataRows.slice(0, 20);
  const scored = columns.map((column) => {
    let urlScore = /url|link|website|site|href/i.test(column.header) ? 12 : 0;
    let titleScore = /name|title|label|shop|store|brand/i.test(column.header) ? 12 : 0;

    sampleRows.forEach((row) => {
      const value = getCellText(row[column.index]).trim();
      if (!value) return;
      if (isLikelyUrl(value)) urlScore += 3;
      if (!isLikelyUrl(value) && value.length <= 90) titleScore += 1;
    });

    return {
      key: column.key,
      urlScore,
      titleScore,
    };
  });

  const contentColumnKey = scored.slice().sort((a, b) => b.urlScore - a.urlScore)[0]?.key || columns[0]?.key || "";
  const titleCandidates = scored
    .filter((item) => item.key !== contentColumnKey)
    .sort((a, b) => b.titleScore - a.titleScore);

  return {
    contentColumnKey,
    titleColumnKey: titleCandidates[0]?.key || "",
  };
}

export function buildRecords(rows, columns, settings) {
  const { hasHeaderRow, contentColumnKey, titleColumnKey, includeTitle, includeIndex, startNumber } = settings;
  const dataRows = hasHeaderRow ? rows.slice(1) : rows;
  const contentColumn = columns.find((item) => item.key === contentColumnKey);
  const titleColumn = columns.find((item) => item.key === titleColumnKey);

  if (!contentColumn) {
    throw new Error("missing-content-column");
  }

  const records = [];

  dataRows.forEach((row, rowIndex) => {
    const rawContent = getCellText(row[contentColumn.index]).trim();
    if (!rawContent) return;

    const rowNumber = clampNumber(startNumber, 1, -999999, 999999) + rowIndex;
    const rawTitle = titleColumn ? getCellText(row[titleColumn.index]).trim() : "";
    const title = rawTitle || `QR ${rowNumber}`;

    records.push({
      rowIndex,
      rowNumber,
      content: rawContent,
      title,
      showTitle: includeTitle,
      showIndex: includeIndex,
      fileBaseName: sanitizeFileName(`${String(rowNumber).padStart(3, "0")}_${rawTitle || "qr-code"}`),
    });
  });

  return records;
}
