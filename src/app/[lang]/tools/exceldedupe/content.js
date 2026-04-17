"use client";

import { useState } from "react";
import * as ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";

const EXCEL_ACCEPT = ".xlsx,.xls";

const DEFAULT_SOURCE = {
  fileName: "",
  workbook: null,
  sheets: [],
  sheetName: "",
  columns: [],
  selectedColumnKeys: [],
};

function getCellText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function normalizeValue(value, trimSpaces) {
  const text = String(value ?? "");
  return trimSpaces ? text.trim() : text;
}

function columnLabel(columnNumber) {
  let current = columnNumber;
  let label = "";

  while (current > 0) {
    const mod = (current - 1) % 26;
    label = String.fromCharCode(65 + mod) + label;
    current = Math.floor((current - mod) / 26);
  }

  return label;
}

function detectColumns(worksheet) {
  const columns = [];
  const maxColumn = worksheet.rows.reduce((max, row) => Math.max(max, row.length), 0);

  for (let index = 1; index <= maxColumn; index += 1) {
    const header = getCellText(worksheet.rows[0]?.[index - 1]).trim();
    const hasValue = worksheet.rows.some((row) => normalizeValue(getCellText(row[index - 1]), true) !== "");

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

function getWorksheet(workbook, sheetName) {
  return workbook?.worksheets?.find((worksheet) => worksheet.name === sheetName) || null;
}

async function readExcelFile(file) {
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
  const workbook = { worksheets };
  const sheets = worksheets.map((worksheet, index) => ({
    id: index + 1,
    name: worksheet.name,
  }));
  const firstSheet = worksheets[0];
  const firstSheetColumns = firstSheet ? detectColumns(firstSheet) : [];

  return {
    fileName: file.name,
    workbook,
    sheets,
    sheetName: firstSheet?.name || "",
    columns: firstSheetColumns,
    selectedColumnKeys: firstSheetColumns[0]?.key ? [firstSheetColumns[0].key] : [],
  };
}

function makeEmptyResults() {
  return {
    uniqueRows: [],
    duplicateRows: [],
    duplicateGroups: [],
    headerRow: null,
    maxColumn: 0,
    stats: null,
  };
}

function makeDedupeKey(row, columnKeys, trimSpaces) {
  return columnKeys.map((key) => normalizeValue(getCellText(row[key - 1]), trimSpaces)).join("\u001f");
}

function makeDisplayKey(row, columnKeys) {
  return columnKeys.map((key) => normalizeValue(getCellText(row[key - 1]), true)).join(" | ");
}

function getRowValues(row, maxColumn) {
  return Array.from({ length: maxColumn }, (_, index) => getCellText(row[index]));
}

export default function ExcelDedupeContent() {
  const { t } = useI18n();
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [skipHeaderRow, setSkipHeaderRow] = useState(true);
  const [trimSpaces, setTrimSpaces] = useState(true);
  const [keepMode, setKeepMode] = useState("first");
  const [results, setResults] = useState(makeEmptyResults());
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedColumnKeys = source.selectedColumnKeys.map(Number).filter(Boolean);
  const canDedupe = Boolean(source.workbook && source.sheetName && selectedColumnKeys.length > 0);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      showModal(t("exceldedupe_error_invalid_format"), "error");
      return;
    }

    setIsProcessing(true);
    try {
      const nextSource = await readExcelFile(file);
      setSource(nextSource);
      setResults(makeEmptyResults());
    } catch (error) {
      console.error("Excel read failed:", error);
      showModal(t("exceldedupe_error_read"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSheet = (sheetName) => {
    const worksheet = getWorksheet(source.workbook, sheetName);
    const columns = worksheet ? detectColumns(worksheet) : [];
    setSource({
      ...source,
      sheetName,
      columns,
      selectedColumnKeys: columns[0]?.key ? [columns[0].key] : [],
    });
    setResults(makeEmptyResults());
  };

  const toggleColumn = (columnKey) => {
    const key = Number(columnKey);
    const nextKeys = selectedColumnKeys.includes(key)
      ? selectedColumnKeys.filter((item) => item !== key)
      : [...selectedColumnKeys, key].sort((a, b) => a - b);

    setSource({
      ...source,
      selectedColumnKeys: nextKeys,
    });
    setResults(makeEmptyResults());
  };

  const dedupeRows = () => {
    if (!canDedupe) {
      showModal(t("exceldedupe_error_missing_selection"), "error");
      return;
    }

    const worksheet = getWorksheet(source.workbook, source.sheetName);

    if (!worksheet) {
      showModal(t("exceldedupe_error_missing_selection"), "error");
      return;
    }

    setIsProcessing(true);

    try {
      const maxColumn = worksheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
      const headerRow = skipHeaderRow ? worksheet.rows[0] || [] : null;
      const dataRows = worksheet.rows
        .map((row, index) => ({ row, rowNumber: index + 1 }))
        .filter(({ rowNumber }) => !(skipHeaderRow && rowNumber === 1));

      const groups = new Map();
      dataRows.forEach((item) => {
        const key = makeDedupeKey(item.row, selectedColumnKeys, trimSpaces);

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(item);
      });

      const uniqueRows = [];
      const duplicateRows = [];
      const duplicateGroups = [];

      groups.forEach((items) => {
        const keptItem = keepMode === "last" ? items[items.length - 1] : items[0];
        uniqueRows.push(keptItem);

        if (items.length > 1) {
          const duplicates = items.filter((item) => item !== keptItem);
          duplicateRows.push(...duplicates);
          duplicateGroups.push({
            key: makeDisplayKey(keptItem.row, selectedColumnKeys),
            count: items.length,
            keptRowNumber: keptItem.rowNumber,
            duplicateRowNumbers: duplicates.map((item) => item.rowNumber).join(", "),
          });
        }
      });

      setResults({
        uniqueRows: uniqueRows.sort((a, b) => a.rowNumber - b.rowNumber),
        duplicateRows: duplicateRows.sort((a, b) => a.rowNumber - b.rowNumber),
        duplicateGroups: duplicateGroups.sort((a, b) => b.count - a.count),
        headerRow,
        maxColumn,
        stats: {
          totalRows: dataRows.length,
          uniqueRows: uniqueRows.length,
          duplicateRows: duplicateRows.length,
          duplicateGroups: duplicateGroups.length,
        },
      });
    } catch (error) {
      console.error("Excel dedupe failed:", error);
      showModal(t("exceldedupe_error_dedupe"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const addRowsToSheet = (sheet, rows, maxColumn, includeHeader = true) => {
    if (includeHeader && results.headerRow) {
      sheet.addRow(getRowValues(results.headerRow, maxColumn));
    }

    rows.forEach((item) => {
      sheet.addRow(getRowValues(item.row, maxColumn));
    });

    sheet.getRow(1).font = { bold: includeHeader && Boolean(results.headerRow) };
    sheet.columns.forEach((column) => {
      column.width = 18;
    });
  };

  const downloadResults = async () => {
    if (!results.stats) {
      showModal(t("exceldedupe_error_no_results"), "error");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const uniqueSheet = workbook.addWorksheet(t("exceldedupe_unique_rows"));
    const duplicateSheet = workbook.addWorksheet(t("exceldedupe_duplicate_rows"));
    const summarySheet = workbook.addWorksheet(t("exceldedupe_duplicate_summary"));

    addRowsToSheet(uniqueSheet, results.uniqueRows, results.maxColumn);
    addRowsToSheet(duplicateSheet, results.duplicateRows, results.maxColumn);

    summarySheet.addRow([
      t("exceldedupe_duplicate_key"),
      t("exceldedupe_duplicate_count"),
      t("exceldedupe_kept_row"),
      t("exceldedupe_duplicate_row_numbers"),
    ]);
    results.duplicateGroups.forEach((group) => {
      summarySheet.addRow([group.key, group.count, group.keptRowNumber, group.duplicateRowNumbers]);
    });
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.columns.forEach((column) => {
      column.width = 28;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `excel-dedupe-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.xlsx`;
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName);
  };

  const ExcelPreview = () => {
    const worksheet = getWorksheet(source.workbook, source.sheetName);

    if (!worksheet) {
      return <p className="text-sm text-gray-500 mt-4">{t("exceldedupe_preview_empty")}</p>;
    }

    const previewRows = worksheet.rows.slice(0, 11);
    const maxColumn = previewRows.reduce((max, row) => Math.max(max, row.length), 0);

    if (previewRows.length === 0 || maxColumn === 0) {
      return <p className="text-sm text-gray-500 mt-4">{t("exceldedupe_preview_empty")}</p>;
    }

    return (
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("exceldedupe_preview_title")}</h3>
        <div className="max-h-80 overflow-auto border border-gray-200 rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 border-b border-r text-left text-gray-500 w-14">#</th>
                {Array.from({ length: maxColumn }, (_, index) => (
                  <th
                    key={index}
                    className={`p-2 border-b border-r text-left whitespace-nowrap ${
                      selectedColumnKeys.includes(index + 1) ? "bg-blue-50 text-blue-700" : "text-gray-600"
                    }`}
                  >
                    {columnLabel(index + 1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-gray-50 font-medium" : "odd:bg-white even:bg-gray-50"}>
                  <td className="p-2 border-b border-r text-gray-500">{rowIndex + 1}</td>
                  {Array.from({ length: maxColumn }, (_, columnIndex) => (
                    <td
                      key={columnIndex}
                      className={`p-2 border-b border-r max-w-48 truncate ${
                        selectedColumnKeys.includes(columnIndex + 1) ? "bg-blue-50" : ""
                      }`}
                      title={getCellText(row[columnIndex])}
                    >
                      {getCellText(row[columnIndex])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">{t("exceldedupe_preview_hint")}</p>
      </div>
    );
  };

  const ResultTable = ({ title, rows }) => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-3">
        {title} <span className="text-gray-500 text-sm">({rows.length})</span>
      </h3>
      <div className="max-h-80 overflow-auto border border-gray-200 rounded">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">{t("exceldedupe_empty_result")}</p>
        ) : (
          <table className="min-w-full text-sm">
            <tbody>
              {rows.slice(0, 100).map((item) => (
                <tr key={item.rowNumber} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{item.rowNumber}</td>
                  {getRowValues(item.row, results.maxColumn).map((value, index) => (
                    <td key={index} className="p-2 border-b border-r max-w-52 truncate" title={value}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {rows.length > 100 && <p className="text-xs text-gray-500 mt-2">{t("exceldedupe_result_preview_limit")}</p>}
    </div>
  );

  return (
    <div className="w-full mx-auto mt-4">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("exceldedupe_upload_title")}</h2>
        <FileUploadBox accept={EXCEL_ACCEPT} onChange={handleFileUpload} title={t("exceldedupe_upload_hint")} maxSize={40} className="min-h-32" />
        {source.fileName && <p className="text-sm text-green-700 mt-3 font-medium">{t("exceldedupe_selected_file", { name: source.fileName })}</p>}

        {source.workbook && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">{t("exceldedupe_sheet_label")}</span>
                <select
                  value={source.sheetName}
                  onChange={(event) => updateSheet(event.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {source.sheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.name}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="lg:col-span-2">
                <span className="block text-sm font-medium text-gray-700 mb-2">{t("exceldedupe_columns_label")}</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-auto border border-gray-200 rounded p-3">
                  {source.columns.map((column) => (
                    <label key={column.key} className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedColumnKeys.includes(column.key)}
                        onChange={() => toggleColumn(column.key)}
                        className="mt-1"
                      />
                      <span>{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <ExcelPreview />
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("exceldedupe_settings_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={skipHeaderRow} onChange={(event) => setSkipHeaderRow(event.target.checked)} className="mt-1" />
            <span>{t("exceldedupe_skip_header")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={trimSpaces} onChange={(event) => setTrimSpaces(event.target.checked)} className="mt-1" />
            <span>{t("exceldedupe_trim_spaces")}</span>
          </label>
          <label className="block text-sm text-gray-700">
            <span className="block font-medium mb-1">{t("exceldedupe_keep_mode")}</span>
            <select value={keepMode} onChange={(event) => setKeepMode(event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="first">{t("exceldedupe_keep_first")}</option>
              <option value="last">{t("exceldedupe_keep_last")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("exceldedupe_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("exceldedupe_privacy_note")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={dedupeRows}
              disabled={!canDedupe || isProcessing}
              className={`px-5 py-3 rounded font-medium text-white ${!canDedupe || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isProcessing ? t("exceldedupe_processing") : t("exceldedupe_button")}
            </button>
            <button
              type="button"
              onClick={downloadResults}
              disabled={!results.stats}
              className={`px-5 py-3 rounded font-medium ${results.stats ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >
              {t("exceldedupe_download_button")}
            </button>
          </div>
        </div>
      </div>

      {results.stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("exceldedupe_total_rows")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.totalRows}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("exceldedupe_unique_rows")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.uniqueRows}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("exceldedupe_duplicate_rows")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.duplicateRows}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("exceldedupe_duplicate_groups")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.duplicateGroups}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ResultTable title={t("exceldedupe_unique_rows")} rows={results.uniqueRows} />
            <ResultTable title={t("exceldedupe_duplicate_rows")} rows={results.duplicateRows} />
          </div>
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("exceldedupe_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
