export function getCellText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
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

export function detectColumns(worksheet) {
  const columns = [];
  const maxColumn = worksheet.rows.reduce((max, row) => Math.max(max, row.length), 0);

  for (let index = 1; index <= maxColumn; index += 1) {
    const header = getCellText(worksheet.rows[0]?.[index - 1]).trim();
    const hasValue = worksheet.rows.some((row) => getCellText(row[index - 1]).trim() !== "");

    if (hasValue) {
      const label = columnLabel(index);
      columns.push({
        key: index,
        label: header ? `${label} - ${header}` : label,
      });
    }
  }

  return columns;
}

export function getWorksheet(workbook, sheetName) {
  return workbook?.worksheets?.find((worksheet) => worksheet.name === sheetName) || null;
}

export function toggleKey(keys, columnKey) {
  const key = Number(columnKey);
  return keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key].sort((a, b) => a - b);
}

export function getRowValues(row, maxColumn) {
  return Array.from({ length: maxColumn }, (_, index) => getCellText(row[index]));
}

export function makeEmptyResults() {
  return {
    rows: [],
    maxColumn: 0,
    changedRows: 0,
    newColumnCount: 0,
    stats: null,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function makeDelimiterRegex(delimiterOptions) {
  const parts = [];

  if (delimiterOptions.comma) {
    parts.push(",");
    parts.push("，");
  }
  if (delimiterOptions.space) {
    parts.push("\\s+");
  }
  if (delimiterOptions.newline) {
    parts.push("[\\r\\n]+");
  }
  if (delimiterOptions.tab) {
    parts.push("\\t+");
  }
  if (delimiterOptions.semicolon) {
    parts.push(";");
    parts.push("；");
  }
  if (delimiterOptions.custom) {
    parts.push(escapeRegExp(delimiterOptions.custom));
  }

  return new RegExp(parts.length > 0 ? parts.join("|") : ",");
}

export function splitText(value, delimiterOptions, trimParts, removeEmptyParts) {
  const parts = getCellText(value).split(makeDelimiterRegex(delimiterOptions));
  const cleanedParts = trimParts ? parts.map((part) => part.trim()) : parts;
  return removeEmptyParts ? cleanedParts.filter((part) => part !== "") : cleanedParts;
}

export function splitContactText(value) {
  const text = getCellText(value).replace(/\s+/g, " ").trim();
  const phoneMatch = text.match(/(?:\+?86[- ]?)?(1[3-9]\d{9})/);

  if (!phoneMatch) {
    const [name = "", ...rest] = text.split(/[,，\s]+/).filter(Boolean);
    return [name, "", rest.join(" ")];
  }

  const phone = phoneMatch[1];
  const beforePhone = text.slice(0, phoneMatch.index).replace(/[,，;；]+/g, " ").trim();
  const afterPhone = text.slice(phoneMatch.index + phoneMatch[0].length).replace(/[,，;；]+/g, " ").trim();

  return [beforePhone, phone, afterPhone];
}

function appendHeaders(row, headers) {
  return [...row, ...headers];
}

function makeDefaultHeader(existingHeader, fallback) {
  const text = getCellText(existingHeader).trim();
  return text || fallback;
}

export function processRows({ worksheet, mode, skipHeaderRow, mergeOptions, splitOptions, contactOptions }) {
  const sourceRows = worksheet.rows;
  const maxColumn = sourceRows.reduce((max, row) => Math.max(max, row.length), 0);
  const rows = sourceRows.map((row) => getRowValues(row, maxColumn));
  let changedRows = 0;
  let newColumnCount = 0;

  if (mode === "merge") {
    const selectedKeys = mergeOptions.columnKeys;
    const outputHeader = mergeOptions.outputHeader.trim() || "Merged";
    newColumnCount = 1;

    rows.forEach((row, index) => {
      if (skipHeaderRow && index === 0) {
        rows[index] = appendHeaders(row, [outputHeader]);
        return;
      }

      const values = selectedKeys.map((key) => getCellText(row[key - 1]));
      const normalizedValues = mergeOptions.trimValues ? values.map((value) => value.trim()) : values;
      const finalValues = mergeOptions.skipEmptyValues ? normalizedValues.filter((value) => value !== "") : normalizedValues;
      rows[index] = appendHeaders(row, [finalValues.join(mergeOptions.delimiter)]);
      changedRows += 1;
    });
  }

  if (mode === "split") {
    const sourceKey = splitOptions.sourceColumnKey;
    const previewParts = rows
      .filter((_, index) => !(skipHeaderRow && index === 0))
      .map((row) => splitText(row[sourceKey - 1], splitOptions.delimiters, splitOptions.trimParts, splitOptions.removeEmptyParts));
    const maxParts = Math.min(
      Math.max(...previewParts.map((parts) => parts.length), splitOptions.outputCount || 1),
      splitOptions.outputCount || 10
    );
    const outputCount = Math.max(1, maxParts);
    const outputPrefix = splitOptions.outputPrefix.trim() || makeDefaultHeader(rows[0]?.[sourceKey - 1], "Split");
    const headers = Array.from({ length: outputCount }, (_, index) => `${outputPrefix}${index + 1}`);
    newColumnCount = outputCount;

    rows.forEach((row, index) => {
      if (skipHeaderRow && index === 0) {
        rows[index] = appendHeaders(row, headers);
        return;
      }

      const parts = splitText(row[sourceKey - 1], splitOptions.delimiters, splitOptions.trimParts, splitOptions.removeEmptyParts);
      rows[index] = appendHeaders(row, Array.from({ length: outputCount }, (_, partIndex) => parts[partIndex] || ""));
      changedRows += 1;
    });
  }

  if (mode === "contact") {
    const sourceKey = contactOptions.sourceColumnKey;
    const headers = [
      contactOptions.nameHeader.trim() || "Name",
      contactOptions.phoneHeader.trim() || "Phone",
      contactOptions.addressHeader.trim() || "Address",
    ];
    newColumnCount = 3;

    rows.forEach((row, index) => {
      if (skipHeaderRow && index === 0) {
        rows[index] = appendHeaders(row, headers);
        return;
      }

      rows[index] = appendHeaders(row, splitContactText(row[sourceKey - 1]));
      changedRows += 1;
    });
  }

  return {
    rows,
    maxColumn: maxColumn + newColumnCount,
    changedRows,
    newColumnCount,
    stats: {
      totalRows: skipHeaderRow ? Math.max(rows.length - 1, 0) : rows.length,
      changedRows,
      newColumnCount,
    },
  };
}
