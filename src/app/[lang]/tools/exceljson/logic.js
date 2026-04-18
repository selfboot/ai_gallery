export function getCellText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

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

export function detectColumns(rows) {
  const maxColumn = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const firstRow = rows[0] || [];

  return Array.from({ length: maxColumn }, (_, index) => {
    const label = columnLabel(index + 1);
    const header = getCellText(firstRow[index]).trim();
    return {
      key: index + 1,
      label: header ? `${label} - ${header}` : label,
    };
  });
}

function makeUniqueHeader(baseHeader, usedHeaders) {
  const fallback = "field";
  const cleanHeader = String(baseHeader || "").trim() || fallback;
  let header = cleanHeader;
  let count = 2;

  while (usedHeaders.has(header)) {
    header = `${cleanHeader}_${count}`;
    count += 1;
  }

  usedHeaders.add(header);
  return header;
}

export function makeHeaders(firstRow, maxColumn, firstRowAsHeaders) {
  const usedHeaders = new Set();

  return Array.from({ length: maxColumn }, (_, index) => {
    const fallback = `field_${index + 1}`;
    const rawHeader = firstRowAsHeaders ? getCellText(firstRow[index]) : fallback;
    return makeUniqueHeader(rawHeader || fallback, usedHeaders);
  });
}

export async function rowsToJsonValue(rows, firstRowAsHeaders, onProgress) {
  const maxColumn = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const dataStartIndex = firstRowAsHeaders ? 1 : 0;
  const headers = makeHeaders(rows[0] || [], maxColumn, firstRowAsHeaders);
  const records = [];

  for (let rowIndex = dataStartIndex; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];

    if (firstRowAsHeaders) {
      const record = {};
      headers.forEach((header, columnIndex) => {
        record[header] = getCellText(row[columnIndex]);
      });
      records.push(record);
    } else {
      records.push(Array.from({ length: maxColumn }, (_, columnIndex) => getCellText(row[columnIndex])));
    }

    if (rowIndex % 2000 === 0) {
      onProgress?.(Math.round(((rowIndex + 1) / Math.max(rows.length, 1)) * 100));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.(100);
  return records;
}

function stringifySheetValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

export function jsonToSheetRows(jsonValue) {
  const rows = Array.isArray(jsonValue) ? jsonValue : [jsonValue];

  if (rows.length === 0) {
    return {
      rows: [],
      rowCount: 0,
      columnCount: 0,
    };
  }

  const hasObjectRows = rows.some((row) => row && !Array.isArray(row) && typeof row === "object");

  if (!hasObjectRows) {
    const sheetRows = rows.map((row) => {
      if (Array.isArray(row)) {
        return row.map(stringifySheetValue);
      }
      return [stringifySheetValue(row)];
    });
    const columnCount = sheetRows.reduce((max, row) => Math.max(max, row.length), 0);

    return {
      rows: sheetRows,
      rowCount: sheetRows.length,
      columnCount,
    };
  }

  const headers = [];
  const headerSet = new Set();
  rows.forEach((row) => {
    if (row && !Array.isArray(row) && typeof row === "object") {
      Object.keys(row).forEach((key) => {
        if (!headerSet.has(key)) {
          headerSet.add(key);
          headers.push(key);
        }
      });
    }
  });

  const sheetRows = [
    headers,
    ...rows.map((row) => {
      if (row && !Array.isArray(row) && typeof row === "object") {
        return headers.map((header) => stringifySheetValue(row[header]));
      }

      return [stringifySheetValue(row)];
    }),
  ];

  return {
    rows: sheetRows,
    rowCount: Math.max(sheetRows.length - 1, 0),
    columnCount: headers.length,
  };
}

export function parseJsonOrJsonLines(text) {
  const source = String(text || "").trim();
  if (!source) {
    throw new Error("Empty JSON");
  }

  try {
    return JSON.parse(source);
  } catch (jsonError) {
    const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      throw jsonError;
    }

    try {
      return lines.map((line) => JSON.parse(line));
    } catch {
      throw jsonError;
    }
  }
}

export function makeJsonText(value, pretty) {
  return JSON.stringify(value, null, pretty ? 2 : 0);
}

export function makeJsonLinesText(records) {
  const rows = Array.isArray(records) ? records : [records];
  return rows.map((row) => JSON.stringify(row)).join("\n");
}

export function makePreviewText(text, limit = 120000) {
  if (text.length <= limit) {
    return {
      text,
      truncated: false,
    };
  }

  return {
    text: text.slice(0, limit),
    truncated: true,
  };
}
