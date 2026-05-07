import Papa from "papaparse";
import { diffLines } from "diff";

export const CSV_DELIMITER_OPTIONS = {
  auto: "",
  comma: ",",
  tab: "\t",
  semicolon: ";",
  pipe: "|",
};

export function normalizeLineEndings(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function countLines(text) {
  if (!text) return 0;
  return normalizeLineEndings(text).split("\n").length;
}

export function summarizeDiff(segments) {
  return segments.reduce(
    (summary, segment) => {
      if (segment.type === "same") return { ...summary, same: summary.same + segment.count };
      if (segment.type === "add") return { ...summary, added: summary.added + segment.count };
      return { ...summary, removed: summary.removed + segment.count };
    },
    { same: 0, added: 0, removed: 0 }
  );
}

export function normalizeDiffParts(parts) {
  return parts
    .filter((part) => part.value !== "")
    .map((part) => ({
      type: part.added ? "add" : part.removed ? "remove" : "same",
      value: part.value,
      count: typeof part.count === "number" ? part.count : countLines(part.value),
    }));
}

function trimRows(rows, trimCells) {
  return rows.map((row) =>
    row.map((cell) => {
      if (!trimCells) return cell == null ? "" : String(cell);
      return cell == null ? "" : String(cell).trim();
    })
  );
}

function filterEmptyRows(rows, skipEmptyRows) {
  if (!skipEmptyRows) return rows;
  return rows.filter((row) => row.some((cell) => String(cell || "").trim() !== ""));
}

function getColumnCount(rows) {
  return rows.reduce((maxCount, row) => Math.max(maxCount, row.length), 0);
}

function getDelimiterLabel(delimiter) {
  if (delimiter === "\t") return "tab";
  if (delimiter === ";") return "semicolon";
  if (delimiter === "|") return "pipe";
  if (delimiter === ",") return "comma";
  return delimiter || "auto";
}

export function parseCsvInput(text, options = {}) {
  const normalizedInput = normalizeLineEndings(text);
  const trimmed = normalizedInput.trim();
  const delimiterKey = options.delimiter || "auto";
  const skipEmptyRows = options.skipEmptyRows !== false;
  const trimCells = options.trimCells !== false;
  const hasHeader = options.hasHeader !== false;

  if (!trimmed) {
    return {
      ok: false,
      empty: true,
      error: "",
      rawText: normalizedInput,
      normalizedText: "",
      rowCount: 0,
      dataRowCount: 0,
      columnCount: 0,
      headerRow: [],
      rows: [],
      delimiter: delimiterKey,
      delimiterLabel: getDelimiterLabel(CSV_DELIMITER_OPTIONS[delimiterKey] || delimiterKey),
    };
  }

  const parseResult = Papa.parse(normalizedInput, {
    delimiter: CSV_DELIMITER_OPTIONS[delimiterKey] ?? "",
    skipEmptyLines: false,
  });

  const fatalError = parseResult.errors.find((item) => item.code !== "UndetectableDelimiter");
  if (fatalError) {
    return {
      ok: false,
      empty: false,
      error: fatalError.message || "Invalid CSV",
      rawText: normalizedInput,
      normalizedText: "",
      rowCount: 0,
      dataRowCount: 0,
      columnCount: 0,
      headerRow: [],
      rows: [],
      delimiter: delimiterKey,
      delimiterLabel: getDelimiterLabel(CSV_DELIMITER_OPTIONS[delimiterKey] || delimiterKey),
    };
  }

  const rows = filterEmptyRows(trimRows(Array.isArray(parseResult.data) ? parseResult.data : [], trimCells), skipEmptyRows);
  const normalizedText = Papa.unparse(rows, {
    delimiter: parseResult.meta.delimiter || CSV_DELIMITER_OPTIONS[delimiterKey] || ",",
    newline: "\n",
  });
  const rowCount = rows.length;
  const headerRow = hasHeader && rowCount > 0 ? rows[0] : [];
  const dataRowCount = hasHeader ? Math.max(rowCount - 1, 0) : rowCount;
  const columnCount = getColumnCount(rows);
  const detectedDelimiter = parseResult.meta.delimiter || CSV_DELIMITER_OPTIONS[delimiterKey] || ",";

  return {
    ok: true,
    empty: false,
    error: "",
    rawText: normalizedInput,
    normalizedText,
    rowCount,
    dataRowCount,
    columnCount,
    headerRow,
    rows,
    delimiter: detectedDelimiter,
    delimiterLabel: getDelimiterLabel(detectedDelimiter),
  };
}

export function compareNormalizedCsv(leftState, rightState) {
  if (!leftState?.ok || !rightState?.ok) {
    return {
      segments: [],
      stats: {
        same: 0,
        added: 0,
        removed: 0,
        changed: false,
        leftLines: leftState?.rowCount || 0,
        rightLines: rightState?.rowCount || 0,
      },
    };
  }

  const parts = diffLines(leftState.normalizedText, rightState.normalizedText);
  const segments = normalizeDiffParts(parts);
  const stats = summarizeDiff(segments);

  return {
    segments,
    stats: {
      ...stats,
      changed: stats.added > 0 || stats.removed > 0,
      leftLines: leftState.rowCount,
      rightLines: rightState.rowCount,
    },
  };
}

export function createCsvDiffReport(leftState, rightState, result, options = {}) {
  const lines = [
    "CSV Diff Report",
    `Delimiter: ${options.delimiter || "auto"}`,
    `Header Row: ${options.hasHeader ? "on" : "off"}`,
    `Trim Cells: ${options.trimCells ? "on" : "off"}`,
    `Skip Empty Rows: ${options.skipEmptyRows ? "on" : "off"}`,
    `Same Lines: ${result.stats.same}`,
    `Added Lines: ${result.stats.added}`,
    `Removed Lines: ${result.stats.removed}`,
    "",
    "Diff:",
  ];

  result.segments.forEach((segment) => {
    const prefix = segment.type === "add" ? "+ " : segment.type === "remove" ? "- " : "  ";
    lines.push(`${prefix}${segment.value}`);
  });

  lines.push(
    "",
    "Normalized Left CSV:",
    leftState?.normalizedText || "",
    "",
    "Normalized Right CSV:",
    rightState?.normalizedText || ""
  );

  return lines.join("\n");
}
