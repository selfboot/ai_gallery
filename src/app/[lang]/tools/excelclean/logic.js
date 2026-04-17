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

export function makeEmptyResults() {
  return {
    rows: [],
    changedCells: [],
    validationIssues: [],
    dateReports: [],
    maxColumn: 0,
    stats: null,
  };
}

export function fullWidthToHalfWidth(text) {
  return text.replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/\u3000/g, " ");
}

export function toTitleCase(text) {
  return text.toLowerCase().replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function removeInvisibleCharacters(text) {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, "");
}

export function cleanValue(value, rules, caseMode) {
  let nextValue = value;

  if (rules.removeInvisible) {
    nextValue = removeInvisibleCharacters(nextValue);
  }

  if (rules.removeLineBreaks) {
    nextValue = nextValue.replace(/[\r\n]+/g, " ");
  }

  if (rules.fullWidthToHalfWidth) {
    nextValue = fullWidthToHalfWidth(nextValue);
  }

  if (rules.trimSpaces) {
    nextValue = nextValue.trim();
  }

  if (rules.removeAllSpaces) {
    nextValue = nextValue.replace(/\s+/g, "");
  }

  if (caseMode === "upper") {
    nextValue = nextValue.toUpperCase();
  } else if (caseMode === "lower") {
    nextValue = nextValue.toLowerCase();
  } else if (caseMode === "title") {
    nextValue = toTitleCase(nextValue);
  }

  return nextValue;
}

export function validateValue(value, type) {
  const text = value.trim();

  if (!text) {
    return true;
  }

  if (type === "phone") {
    return /^1[3-9]\d{9}$/.test(text);
  }

  if (type === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  }

  if (type === "id") {
    return /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(text);
  }

  return true;
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function isValidDateParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function makeDate(year, month, day, hour = 0, minute = 0, second = 0) {
  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function isReasonableDate(date) {
  const year = date.getUTCFullYear();
  return year >= 1900 && year <= 2100;
}

function excelSerialToDate(serial) {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) {
    return null;
  }

  const wholeDays = Math.floor(serial);
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  const timeMilliseconds = Math.round((serial - wholeDays) * millisecondsInDay);
  const utcMilliseconds = (wholeDays - 25569) * millisecondsInDay + timeMilliseconds;
  const date = new Date(utcMilliseconds);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeYear(yearText) {
  const year = Number(yearText);
  if (yearText.length === 2) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }

  return year;
}

function parseTimeParts(hour = "0", minute = "0", second = "0") {
  return [Number(hour || 0), Number(minute || 0), Number(second || 0)];
}

export function parseDateValue(value, ambiguousMode) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { status: "converted", date: value, source: "date" };
  }

  const text = getCellText(value).trim();

  if (!text) {
    return { status: "empty" };
  }

  const numericValue = Number(text);
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serialDate = excelSerialToDate(numericValue);
    if (serialDate) {
      return { status: "converted", date: serialDate, source: "serial" };
    }

    if (numericValue > 0 && numericValue < 100000) {
      return { status: "out_of_range" };
    }
  }

  let match = text.match(/^(\d{4})(\d{2})(\d{2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const date = makeDate(Number(year), Number(month), Number(day), ...parseTimeParts(hour, minute, second));
    if (!date) {
      return { status: "invalid" };
    }

    return isReasonableDate(date) ? { status: "converted", date, source: "text" } : { status: "out_of_range" };
  }

  match = text.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[ T]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const date = makeDate(Number(year), Number(month), Number(day), ...parseTimeParts(hour, minute, second));
    if (!date) {
      return { status: "invalid" };
    }

    return isReasonableDate(date) ? { status: "converted", date, source: "text" } : { status: "out_of_range" };
  }

  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const [, first, secondPart, yearText, hour, minute, second] = match;
    const firstNumber = Number(first);
    const secondNumber = Number(secondPart);
    const year = normalizeYear(yearText);
    const timeParts = parseTimeParts(hour, minute, second);

    if (firstNumber <= 12 && secondNumber <= 12 && ambiguousMode === "report") {
      return { status: "ambiguous" };
    }

    const useDmy = firstNumber > 12 || ambiguousMode === "dmy";
    const month = useDmy ? secondNumber : firstNumber;
    const day = useDmy ? firstNumber : secondNumber;
    const date = makeDate(year, month, day, ...timeParts);
    if (!date) {
      return { status: "invalid" };
    }

    return isReasonableDate(date) ? { status: "converted", date, source: "text" } : { status: "out_of_range" };
  }

  return { status: "unrecognized" };
}

export function formatDateValue(date, format) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  if (format === "yyyy/mm/dd") {
    return `${year}/${padNumber(month)}/${padNumber(day)}`;
  }

  if (format === "yyyy-mm-dd hh:mm:ss") {
    return `${year}-${padNumber(month)}-${padNumber(day)} ${padNumber(hour)}:${padNumber(minute)}:${padNumber(second)}`;
  }

  if (format === "zh") {
    return `${year}年${month}月${day}日`;
  }

  if (format === "yyyy-mm") {
    return `${year}-${padNumber(month)}`;
  }

  if (format === "yyyy") {
    return String(year);
  }

  return `${year}-${padNumber(month)}-${padNumber(day)}`;
}

export function getRowValues(row, maxColumn) {
  return Array.from({ length: maxColumn }, (_, index) => getCellText(row[index]));
}

export function processExcelCleanRows({
  rows: inputRows,
  selectedColumnKeys,
  globalColumnKeys,
  dateColumnKeys,
  validationColumnGroups,
  skipHeaderRow,
  rules,
  caseMode,
  validationType,
  dateOptions,
}) {
  const maxColumn = inputRows.reduce((max, row) => Math.max(max, row.length), 0);
  const rows = inputRows.map((row) => [...row]);
  const changedCells = [];
  const validationIssues = [];
  const dateReports = [];
  const allColumnKeys = Array.from({ length: maxColumn }, (_, index) => index + 1);
  const cleanColumnKeys = globalColumnKeys || selectedColumnKeys || allColumnKeys;
  const normalizedDateColumnKeys = dateColumnKeys || (dateOptions.enabled ? selectedColumnKeys || [] : []);
  const normalizedValidationColumnGroups =
    validationColumnGroups ||
    (validationType && validationType !== "none"
      ? {
          [validationType]: selectedColumnKeys || [],
        }
      : {});
  const touchedColumnKeys = Array.from(
    new Set([
      ...cleanColumnKeys,
      ...normalizedDateColumnKeys,
      ...Object.values(normalizedValidationColumnGroups).flat(),
    ])
  );

  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 1;

    if (skipHeaderRow && rowNumber === 1) {
      return;
    }

    cleanColumnKeys.forEach((columnKey) => {
      const columnIndex = columnKey - 1;
      const oldValue = getCellText(row[columnIndex]);
      const newValue = cleanValue(oldValue, rules, caseMode);

      if (oldValue !== newValue) {
        row[columnIndex] = newValue;
        changedCells.push({
          rowNumber,
          columnLabel: columnLabel(columnKey),
          oldValue,
          newValue,
        });
      }
    });

    if (dateOptions.enabled) {
      normalizedDateColumnKeys.forEach((columnKey) => {
        const columnIndex = columnKey - 1;
        const oldValue = getCellText(row[columnIndex]);
        const dateResult = parseDateValue(oldValue, dateOptions.ambiguousMode);

        if (dateResult.status === "converted") {
          const formattedDate = formatDateValue(dateResult.date, dateOptions.outputFormat);
          dateReports.push({
            rowNumber,
            columnLabel: columnLabel(columnKey),
            originalValue: oldValue,
            resultValue: formattedDate,
            status: dateResult.source === "serial" ? "serial" : "converted",
          });

          if (oldValue !== formattedDate) {
            row[columnIndex] = formattedDate;
            changedCells.push({
              rowNumber,
              columnLabel: columnLabel(columnKey),
              oldValue,
              newValue: formattedDate,
            });
          }
        } else if (dateResult.status !== "empty") {
          dateReports.push({
            rowNumber,
            columnLabel: columnLabel(columnKey),
            originalValue: oldValue,
            resultValue: "",
            status: dateResult.status,
          });
        }
      });
    }

    Object.entries(normalizedValidationColumnGroups).forEach(([type, columnKeys]) => {
      if (type === "none") {
        return;
      }

      columnKeys.forEach((columnKey) => {
        const columnIndex = columnKey - 1;
        const value = getCellText(row[columnIndex]);

        if (!validateValue(value, type)) {
          validationIssues.push({
            rowNumber,
            columnLabel: columnLabel(columnKey),
            value,
            type,
          });
        }
      });
    });
  });

  return {
    rows,
    changedCells,
    validationIssues,
    dateReports,
    maxColumn,
    stats: {
      totalRows: skipHeaderRow ? Math.max(rows.length - 1, 0) : rows.length,
      changedCells: changedCells.length,
      validationIssues: validationIssues.length,
      dateConverted: dateReports.filter((item) => item.resultValue).length,
      dateIssues: dateReports.filter((item) => !item.resultValue).length,
      touchedColumns: touchedColumnKeys.length,
    },
  };
}
