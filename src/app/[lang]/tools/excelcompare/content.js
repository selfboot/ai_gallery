"use client";

import { useMemo, useState } from "react";
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
  columnKey: "",
};

const DEFAULT_SELECTION = {
  sheetName: "",
  columns: [],
  columnKey: "",
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

function isMatch(a, b, containsMatch) {
  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  return containsMatch && (a.includes(b) || b.includes(a));
}

function getUniqueRows(worksheet, columnKey, trimSpaces, skipHeaderRow) {
  const rows = [];
  const seen = new Set();

  worksheet.rows.forEach((row, index) => {
    if (skipHeaderRow && index === 0) {
      return;
    }

    const rawValue = getCellText(row[columnKey - 1]);
    const normalized = normalizeValue(rawValue, trimSpaces);

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    rows.push({
      rowNumber: index + 1,
      value: normalizeValue(rawValue, true),
      normalized,
    });
  });

  return rows;
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
    columnKey: firstSheetColumns[0]?.key || "",
  };
}

function makeEmptyResults() {
  return {
    common: [],
    onlyA: [],
    onlyB: [],
    stats: null,
  };
}

function getDefaultSelection(source, preferredColumnIndex = 0) {
  if (!source.workbook) {
    return DEFAULT_SELECTION;
  }

  const sheetName = source.sheets[0]?.name || "";
  const worksheet = getWorksheet(source.workbook, sheetName);
  const columns = worksheet ? detectColumns(worksheet) : [];

  return {
    sheetName,
    columns,
    columnKey: columns[preferredColumnIndex]?.key || columns[0]?.key || "",
  };
}

export default function ExcelCompareContent() {
  const { t } = useI18n();
  const [sourceA, setSourceA] = useState(DEFAULT_SOURCE);
  const [sourceB, setSourceB] = useState(DEFAULT_SOURCE);
  const [reuseBSelection, setReuseBSelection] = useState(DEFAULT_SELECTION);
  const [trimSpaces, setTrimSpaces] = useState(true);
  const [containsMatch, setContainsMatch] = useState(true);
  const [skipHeaderRow, setSkipHeaderRow] = useState(true);
  const [results, setResults] = useState(makeEmptyResults());
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isUsingSourceAForB = !sourceB.workbook;
  const activeSourceB = isUsingSourceAForB
    ? { ...sourceA, sheetName: reuseBSelection.sheetName, columns: reuseBSelection.columns, columnKey: reuseBSelection.columnKey }
    : sourceB;
  const canCompare = Boolean(
    sourceA.workbook &&
      sourceA.sheetName &&
      sourceA.columnKey &&
      activeSourceB.workbook &&
      activeSourceB.sheetName &&
      activeSourceB.columnKey
  );

  const previewRows = useMemo(() => {
    if (!results.stats) {
      return [];
    }

    return [
      { key: "common", label: t("excelcompare_common"), count: results.common.length },
      { key: "onlyA", label: t("excelcompare_only_a"), count: results.onlyA.length },
      { key: "onlyB", label: t("excelcompare_only_b"), count: results.onlyB.length },
    ];
  }, [results, t]);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const updateSourceSheet = (source, setter, sheetName) => {
    const worksheet = getWorksheet(source.workbook, sheetName);
    const columns = worksheet ? detectColumns(worksheet) : [];
    setter({
      ...source,
      sheetName,
      columns,
      columnKey: columns[0]?.key || "",
    });
    setResults(makeEmptyResults());
  };

  const updateReuseBSelectionSheet = (sheetName) => {
    const worksheet = getWorksheet(sourceA.workbook, sheetName);
    const columns = worksheet ? detectColumns(worksheet) : [];
    setReuseBSelection({
      sheetName,
      columns,
      columnKey: columns[1]?.key || columns[0]?.key || "",
    });
    setResults(makeEmptyResults());
  };

  const handleFileUpload = async (file, setter, afterRead) => {
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      showModal(t("excelcompare_error_invalid_format"), "error");
      return;
    }

    setIsProcessing(true);
    try {
      const nextSource = await readExcelFile(file);
      setter(nextSource);
      afterRead?.(nextSource);

      setResults(makeEmptyResults());
    } catch (error) {
      console.error("Excel read failed:", error);
      showModal(t("excelcompare_error_read"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSourceB = () => {
    setSourceB(DEFAULT_SOURCE);
    setResults(makeEmptyResults());
  };

  const compareColumns = () => {
    if (!canCompare) {
      showModal(t("excelcompare_error_missing_selection"), "error");
      return;
    }

    const worksheetA = getWorksheet(sourceA.workbook, sourceA.sheetName);
      const worksheetB = getWorksheet(activeSourceB.workbook, activeSourceB.sheetName);

    if (!worksheetA || !worksheetB) {
      showModal(t("excelcompare_error_missing_selection"), "error");
      return;
    }

    setIsProcessing(true);

    try {
      const rowsA = getUniqueRows(worksheetA, Number(sourceA.columnKey), trimSpaces, skipHeaderRow);
      const rowsB = getUniqueRows(worksheetB, Number(activeSourceB.columnKey), trimSpaces, skipHeaderRow);
      const common = [];
      const onlyA = [];
      const matchedB = new Set();

      rowsA.forEach((rowA) => {
        const matchedRow = rowsB.find((rowB) => isMatch(rowA.normalized, rowB.normalized, containsMatch));

        if (matchedRow) {
          matchedB.add(matchedRow.normalized);
          common.push({
            aValue: rowA.value,
            bValue: matchedRow.value,
            aRow: rowA.rowNumber,
            bRow: matchedRow.rowNumber,
          });
        } else {
          onlyA.push(rowA);
        }
      });

      const onlyB = rowsB.filter((rowB) => {
        if (matchedB.has(rowB.normalized)) {
          return false;
        }

        return !rowsA.some((rowA) => isMatch(rowA.normalized, rowB.normalized, containsMatch));
      });

      setResults({
        common,
        onlyA,
        onlyB,
        stats: {
          aCount: rowsA.length,
          bCount: rowsB.length,
        },
      });
    } catch (error) {
      console.error("Excel compare failed:", error);
      showModal(t("excelcompare_error_compare"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = async () => {
    if (!results.stats) {
      showModal(t("excelcompare_error_no_results"), "error");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const commonSheet = workbook.addWorksheet(t("excelcompare_common"));
    const onlyASheet = workbook.addWorksheet(t("excelcompare_only_a"));
    const onlyBSheet = workbook.addWorksheet(t("excelcompare_only_b"));

    commonSheet.addRow([t("excelcompare_a_value"), t("excelcompare_b_value"), t("excelcompare_a_row"), t("excelcompare_b_row")]);
    results.common.forEach((row) => commonSheet.addRow([row.aValue, row.bValue, row.aRow, row.bRow]));

    onlyASheet.addRow([t("excelcompare_a_value"), t("excelcompare_a_row")]);
    results.onlyA.forEach((row) => onlyASheet.addRow([row.value, row.rowNumber]));

    onlyBSheet.addRow([t("excelcompare_b_value"), t("excelcompare_b_row")]);
    results.onlyB.forEach((row) => onlyBSheet.addRow([row.value, row.rowNumber]));

    [commonSheet, onlyASheet, onlyBSheet].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((column) => {
        column.width = 24;
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `excel-compare-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.xlsx`;
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName);
  };

  const ExcelPreview = ({ source, selectedColumnKey }) => {
    const worksheet = getWorksheet(source.workbook, source.sheetName);

    if (!worksheet) {
      return <p className="text-sm text-gray-500 mt-4">{t("excelcompare_preview_empty")}</p>;
    }

    const previewRows = worksheet.rows.slice(0, 11);
    const maxColumn = previewRows.reduce((max, row) => Math.max(max, row.length), 0);

    if (previewRows.length === 0 || maxColumn === 0) {
      return <p className="text-sm text-gray-500 mt-4">{t("excelcompare_preview_empty")}</p>;
    }

    return (
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("excelcompare_preview_title")}</h3>
        <div className="max-h-72 overflow-auto border border-gray-200 rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 border-b border-r text-left text-gray-500 w-14">#</th>
                {Array.from({ length: maxColumn }, (_, index) => (
                  <th
                    key={index}
                    className={`p-2 border-b border-r text-left whitespace-nowrap ${
                      Number(selectedColumnKey) === index + 1 ? "bg-blue-50 text-blue-700" : "text-gray-600"
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
                        Number(selectedColumnKey) === columnIndex + 1 ? "bg-blue-50" : ""
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
        <p className="text-xs text-gray-500 mt-2">{t("excelcompare_preview_hint")}</p>
      </div>
    );
  };

  const SourceSelector = ({ title, source, onFile, onSheet, onColumn, columnLabelText, notice, onClear, uploadTitle }) => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {onClear && source.fileName && (
          <button type="button" onClick={onClear} className="text-sm text-blue-600 hover:text-blue-800">
            {t("excelcompare_use_a_file")}
          </button>
        )}
      </div>
      <FileUploadBox accept={EXCEL_ACCEPT} onChange={onFile} title={uploadTitle || t("excelcompare_upload_hint")} maxSize={40} className="min-h-32" />
      {notice && <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded p-3 mt-3">{notice}</p>}
      {source.fileName && <p className="text-sm text-green-700 mt-3 font-medium">{t("excelcompare_selected_file", { name: source.fileName })}</p>}

      {source.workbook && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("excelcompare_sheet_label")}</span>
              <select
                value={source.sheetName}
                onChange={(event) => onSheet(event.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {source.sheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.name}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{columnLabelText}</span>
              <select
                value={source.columnKey}
                onChange={(event) => {
                  onColumn(event.target.value);
                  setResults(makeEmptyResults());
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {source.columns.map((column) => (
                  <option key={column.key} value={column.key}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ExcelPreview source={source} selectedColumnKey={source.columnKey} />
        </>
      )}
    </div>
  );

  const ResultList = ({ title, rows, type }) => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-3">
        {title} <span className="text-gray-500 text-sm">({rows.length})</span>
      </h3>
      <div className="max-h-80 overflow-auto border border-gray-200 rounded">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">{t("excelcompare_empty_result")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 border-b">{type === "common" ? t("excelcompare_a_value") : t("excelcompare_value")}</th>
                {type === "common" && <th className="text-left p-2 border-b">{t("excelcompare_b_value")}</th>}
                <th className="text-left p-2 border-b">{t("excelcompare_row")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((row, index) => (
                <tr key={`${type}-${index}`} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border-b break-all">{type === "common" ? row.aValue : row.value}</td>
                  {type === "common" && <td className="p-2 border-b break-all">{row.bValue}</td>}
                  <td className="p-2 border-b text-gray-600">{type === "common" ? `${row.aRow} / ${row.bRow}` : row.rowNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {rows.length > 200 && <p className="text-xs text-gray-500 mt-2">{t("excelcompare_preview_limit")}</p>}
    </div>
  );

  return (
    <div className="w-full mx-auto mt-4">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("excelcompare_page_title")}</h1>
        <p className="text-gray-600">{t("excelcompare_page_description")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SourceSelector
          title={t("excelcompare_source_a_title")}
          source={sourceA}
          onFile={(file) =>
            handleFileUpload(file, setSourceA, (nextSource) => {
              setReuseBSelection(getDefaultSelection(nextSource, 1));
            })
          }
          onSheet={(sheetName) => {
            updateSourceSheet(sourceA, setSourceA, sheetName);
          }}
          onColumn={(columnKey) => setSourceA({ ...sourceA, columnKey })}
          columnLabelText={t("excelcompare_column_a_label")}
          uploadTitle={t("excelcompare_upload_a_hint")}
        />

        <SourceSelector
          title={t("excelcompare_source_b_title")}
          source={activeSourceB}
          onFile={(file) => handleFileUpload(file, setSourceB)}
          onSheet={(sheetName) => {
            if (sourceB.workbook) {
              updateSourceSheet(sourceB, setSourceB, sheetName);
            } else {
              updateReuseBSelectionSheet(sheetName);
            }
          }}
          onColumn={(columnKey) => {
            if (sourceB.workbook) {
              setSourceB({ ...sourceB, columnKey });
            } else {
              setReuseBSelection({ ...reuseBSelection, columnKey });
            }
          }}
          columnLabelText={t("excelcompare_column_b_label")}
          notice={isUsingSourceAForB && sourceA.workbook ? t("excelcompare_b_reuse_notice") : ""}
          onClear={sourceB.workbook ? clearSourceB : null}
          uploadTitle={t("excelcompare_upload_b_hint")}
        />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("excelcompare_settings_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={skipHeaderRow} onChange={(event) => setSkipHeaderRow(event.target.checked)} className="mt-1" />
            <span>{t("excelcompare_skip_header")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={trimSpaces} onChange={(event) => setTrimSpaces(event.target.checked)} className="mt-1" />
            <span>{t("excelcompare_trim_spaces")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={containsMatch} onChange={(event) => setContainsMatch(event.target.checked)} className="mt-1" />
            <span>{t("excelcompare_contains_match")}</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("excelcompare_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("excelcompare_privacy_note")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={compareColumns}
              disabled={!canCompare || isProcessing}
              className={`px-5 py-3 rounded font-medium text-white ${!canCompare || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isProcessing ? t("excelcompare_processing") : t("excelcompare_compare_button")}
            </button>
            <button
              type="button"
              onClick={downloadResults}
              disabled={!results.stats}
              className={`px-5 py-3 rounded font-medium ${results.stats ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >
              {t("excelcompare_download_button")}
            </button>
          </div>
        </div>
      </div>

      {results.stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {previewRows.map((item) => (
              <div key={item.key} className="bg-white rounded-lg shadow p-5">
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <ResultList title={t("excelcompare_common")} rows={results.common} type="common" />
            <ResultList title={t("excelcompare_only_a")} rows={results.onlyA} type="onlyA" />
            <ResultList title={t("excelcompare_only_b")} rows={results.onlyB} type="onlyB" />
          </div>
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("excelcompare_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
