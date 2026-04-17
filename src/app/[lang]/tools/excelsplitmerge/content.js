"use client";

import { useState } from "react";
import * as ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import { columnLabel, detectColumns, getCellText, getRowValues, getWorksheet, makeEmptyResults, processRows, toggleKey } from "./logic";

const EXCEL_ACCEPT = ".xlsx,.xls";
const DEFAULT_SOURCE = {
  fileName: "",
  workbook: null,
  sheets: [],
  sheetName: "",
  columns: [],
};

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
  };
}

export default function ExcelSplitMergeContent() {
  const { t } = useI18n();
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [mode, setMode] = useState("merge");
  const [skipHeaderRow, setSkipHeaderRow] = useState(true);
  const [mergeOptions, setMergeOptions] = useState({
    columnKeys: [],
    delimiter: " ",
    outputHeader: "",
    skipEmptyValues: true,
    trimValues: true,
  });
  const [splitOptions, setSplitOptions] = useState({
    sourceColumnKey: "",
    delimiters: {
      comma: true,
      space: false,
      newline: true,
      tab: true,
      semicolon: true,
      custom: "",
    },
    outputPrefix: "",
    outputCount: 5,
    trimParts: true,
    removeEmptyParts: true,
  });
  const [contactOptions, setContactOptions] = useState({
    sourceColumnKey: "",
    nameHeader: "",
    phoneHeader: "",
    addressHeader: "",
  });
  const [results, setResults] = useState(makeEmptyResults());
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedColumnKeys =
    mode === "merge"
      ? mergeOptions.columnKeys
      : [mode === "split" ? splitOptions.sourceColumnKey : contactOptions.sourceColumnKey].map(Number).filter(Boolean);
  const canProcess =
    Boolean(source.workbook && source.sheetName) &&
    ((mode === "merge" && mergeOptions.columnKeys.length > 0) ||
      (mode === "split" && splitOptions.sourceColumnKey) ||
      (mode === "contact" && contactOptions.sourceColumnKey));

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      showModal(t("excelsplitmerge_error_invalid_format"), "error");
      return;
    }

    setIsProcessing(true);
    try {
      const nextSource = await readExcelFile(file);
      const firstColumnKey = nextSource.columns[0]?.key || "";
      setSource(nextSource);
      setMergeOptions((current) => ({ ...current, columnKeys: firstColumnKey ? [firstColumnKey] : [] }));
      setSplitOptions((current) => ({ ...current, sourceColumnKey: firstColumnKey }));
      setContactOptions((current) => ({ ...current, sourceColumnKey: firstColumnKey }));
      setResults(makeEmptyResults());
    } catch (error) {
      console.error("Excel read failed:", error);
      showModal(t("excelsplitmerge_error_read"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSheet = (sheetName) => {
    const worksheet = getWorksheet(source.workbook, sheetName);
    const columns = worksheet ? detectColumns(worksheet) : [];
    const firstColumnKey = columns[0]?.key || "";
    setSource({
      ...source,
      sheetName,
      columns,
    });
    setMergeOptions((current) => ({ ...current, columnKeys: firstColumnKey ? [firstColumnKey] : [] }));
    setSplitOptions((current) => ({ ...current, sourceColumnKey: firstColumnKey }));
    setContactOptions((current) => ({ ...current, sourceColumnKey: firstColumnKey }));
    setResults(makeEmptyResults());
  };

  const updateMode = (nextMode) => {
    setMode(nextMode);
    setResults(makeEmptyResults());
  };

  const toggleMergeColumn = (columnKey) => {
    setMergeOptions((current) => ({
      ...current,
      columnKeys: toggleKey(current.columnKeys, columnKey),
    }));
    setResults(makeEmptyResults());
  };

  const updateMergeOption = (key, value) => {
    setMergeOptions((current) => ({ ...current, [key]: value }));
    setResults(makeEmptyResults());
  };

  const updateSplitOption = (key, value) => {
    setSplitOptions((current) => ({ ...current, [key]: value }));
    setResults(makeEmptyResults());
  };

  const updateDelimiterOption = (key, value) => {
    setSplitOptions((current) => ({
      ...current,
      delimiters: {
        ...current.delimiters,
        [key]: value,
      },
    }));
    setResults(makeEmptyResults());
  };

  const updateContactOption = (key, value) => {
    setContactOptions((current) => ({ ...current, [key]: value }));
    setResults(makeEmptyResults());
  };

  const processExcel = () => {
    if (!canProcess) {
      showModal(t("excelsplitmerge_error_missing_selection"), "error");
      return;
    }

    const worksheet = getWorksheet(source.workbook, source.sheetName);
    if (!worksheet) {
      showModal(t("excelsplitmerge_error_missing_selection"), "error");
      return;
    }

    setIsProcessing(true);
    try {
      setResults(
        processRows({
          worksheet,
          mode,
          skipHeaderRow,
          mergeOptions,
          splitOptions,
          contactOptions,
        })
      );
    } catch (error) {
      console.error("Excel split merge failed:", error);
      showModal(t("excelsplitmerge_error_process"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = async () => {
    if (!results.stats) {
      showModal(t("excelsplitmerge_error_no_results"), "error");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(t("excelsplitmerge_result_sheet"));

    results.rows.forEach((row) => {
      sheet.addRow(getRowValues(row, results.maxColumn));
    });
    if (results.rows.length > 0) {
      sheet.getRow(1).font = { bold: skipHeaderRow };
    }
    sheet.columns.forEach((column) => {
      column.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `excel-split-merge-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.xlsx`;
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName);
  };

  const ExcelPreview = () => {
    const worksheet = getWorksheet(source.workbook, source.sheetName);

    if (!worksheet) {
      return <p className="text-sm text-gray-500 mt-4">{t("excelsplitmerge_preview_empty")}</p>;
    }

    const previewRows = worksheet.rows.slice(0, 11);
    const maxColumn = previewRows.reduce((max, row) => Math.max(max, row.length), 0);

    if (previewRows.length === 0 || maxColumn === 0) {
      return <p className="text-sm text-gray-500 mt-4">{t("excelsplitmerge_preview_empty")}</p>;
    }

    return (
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("excelsplitmerge_preview_title")}</h3>
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
                      className={`p-2 border-b border-r max-w-52 truncate ${
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
        <p className="text-xs text-gray-500 mt-2">{t("excelsplitmerge_preview_hint")}</p>
      </div>
    );
  };

  const ColumnSelect = ({ value, onChange }) => (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full border border-gray-300 rounded px-3 py-2">
      {source.columns.map((column) => (
        <option key={column.key} value={column.key}>
          {column.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="w-full mx-auto mt-4">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("excelsplitmerge_upload_title")}</h2>
        <FileUploadBox accept={EXCEL_ACCEPT} onChange={handleFileUpload} title={t("excelsplitmerge_upload_hint")} maxSize={40} className="min-h-32" />
        {source.fileName && <p className="text-sm text-green-700 mt-3 font-medium">{t("excelsplitmerge_selected_file", { name: source.fileName })}</p>}

        {source.workbook && (
          <>
            <label className="block mt-5 max-w-md">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("excelsplitmerge_sheet_label")}</span>
              <select value={source.sheetName} onChange={(event) => updateSheet(event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                {source.sheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.name}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </label>
            <ExcelPreview />
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("excelsplitmerge_mode_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["merge", "split", "contact"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => updateMode(item)}
              className={`border rounded px-4 py-3 text-left ${
                mode === item ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <span className="block font-semibold">{t(`excelsplitmerge_mode_${item}`)}</span>
              <span className="block text-xs text-gray-500 mt-1">{t(`excelsplitmerge_mode_${item}_hint`)}</span>
            </button>
          ))}
        </div>
      </div>

      {source.workbook && mode === "merge" && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("excelsplitmerge_merge_title")}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">{t("excelsplitmerge_merge_columns")}</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-auto border border-gray-200 rounded p-3">
                {source.columns.map((column) => (
                  <label key={column.key} className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={mergeOptions.columnKeys.includes(column.key)} onChange={() => toggleMergeColumn(column.key)} className="mt-1" />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <label className="block text-sm text-gray-700">
                <span className="block font-medium mb-1">{t("excelsplitmerge_delimiter")}</span>
                <input value={mergeOptions.delimiter} onChange={(event) => updateMergeOption("delimiter", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </label>
              <label className="block text-sm text-gray-700">
                <span className="block font-medium mb-1">{t("excelsplitmerge_output_header")}</span>
                <input value={mergeOptions.outputHeader} onChange={(event) => updateMergeOption("outputHeader", event.target.value)} placeholder={t("excelsplitmerge_output_header_placeholder")} className="w-full border border-gray-300 rounded px-3 py-2" />
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={mergeOptions.skipEmptyValues} onChange={(event) => updateMergeOption("skipEmptyValues", event.target.checked)} className="mt-1" />
                <span>{t("excelsplitmerge_skip_empty")}</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={mergeOptions.trimValues} onChange={(event) => updateMergeOption("trimValues", event.target.checked)} className="mt-1" />
                <span>{t("excelsplitmerge_trim_values")}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {source.workbook && mode === "split" && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("excelsplitmerge_split_title")}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("excelsplitmerge_source_column")}</span>
              <ColumnSelect value={splitOptions.sourceColumnKey} onChange={(value) => updateSplitOption("sourceColumnKey", value)} />
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("excelsplitmerge_output_prefix")}</span>
              <input value={splitOptions.outputPrefix} onChange={(event) => updateSplitOption("outputPrefix", event.target.value)} placeholder={t("excelsplitmerge_output_prefix_placeholder")} className="w-full border border-gray-300 rounded px-3 py-2" />
            </label>
          </div>
          <div className="mt-5">
            <span className="block text-sm font-medium text-gray-700 mb-2">{t("excelsplitmerge_split_delimiters")}</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {["comma", "space", "newline", "tab", "semicolon"].map((item) => (
                <label key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={splitOptions.delimiters[item]} onChange={(event) => updateDelimiterOption(item, event.target.checked)} className="mt-1" />
                  <span>{t(`excelsplitmerge_delimiter_${item}`)}</span>
                </label>
              ))}
              <label className="block text-sm text-gray-700">
                <span className="block font-medium mb-1">{t("excelsplitmerge_delimiter_custom")}</span>
                <input value={splitOptions.delimiters.custom} onChange={(event) => updateDelimiterOption("custom", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("excelsplitmerge_output_count")}</span>
              <input type="number" min="1" max="20" value={splitOptions.outputCount} onChange={(event) => updateSplitOption("outputCount", Number(event.target.value))} className="w-full border border-gray-300 rounded px-3 py-2" />
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={splitOptions.trimParts} onChange={(event) => updateSplitOption("trimParts", event.target.checked)} className="mt-1" />
              <span>{t("excelsplitmerge_trim_parts")}</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={splitOptions.removeEmptyParts} onChange={(event) => updateSplitOption("removeEmptyParts", event.target.checked)} className="mt-1" />
              <span>{t("excelsplitmerge_remove_empty_parts")}</span>
            </label>
          </div>
        </div>
      )}

      {source.workbook && mode === "contact" && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("excelsplitmerge_contact_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("excelsplitmerge_source_column")}</span>
              <ColumnSelect value={contactOptions.sourceColumnKey} onChange={(value) => updateContactOption("sourceColumnKey", value)} />
            </label>
            <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{t("excelsplitmerge_contact_hint")}</div>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("excelsplitmerge_name_header")}</span>
              <input value={contactOptions.nameHeader} onChange={(event) => updateContactOption("nameHeader", event.target.value)} placeholder={t("excelsplitmerge_name_header_placeholder")} className="w-full border border-gray-300 rounded px-3 py-2" />
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("excelsplitmerge_phone_header")}</span>
              <input value={contactOptions.phoneHeader} onChange={(event) => updateContactOption("phoneHeader", event.target.value)} placeholder={t("excelsplitmerge_phone_header_placeholder")} className="w-full border border-gray-300 rounded px-3 py-2" />
            </label>
            <label className="block text-sm text-gray-700 md:col-span-2">
              <span className="block font-medium mb-1">{t("excelsplitmerge_address_header")}</span>
              <input value={contactOptions.addressHeader} onChange={(event) => updateContactOption("addressHeader", event.target.value)} placeholder={t("excelsplitmerge_address_header_placeholder")} className="w-full border border-gray-300 rounded px-3 py-2" />
            </label>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("excelsplitmerge_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("excelsplitmerge_privacy_note")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={processExcel}
              disabled={!canProcess || isProcessing}
              className={`px-5 py-3 rounded font-medium text-white ${!canProcess || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isProcessing ? t("excelsplitmerge_processing") : t("excelsplitmerge_button")}
            </button>
            <button
              type="button"
              onClick={downloadResults}
              disabled={!results.stats}
              className={`px-5 py-3 rounded font-medium ${results.stats ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >
              {t("excelsplitmerge_download_button")}
            </button>
          </div>
        </div>
      </div>

      {results.stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("excelsplitmerge_total_rows")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.totalRows}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("excelsplitmerge_changed_rows")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.changedRows}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("excelsplitmerge_new_columns")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.newColumnCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">{t("excelsplitmerge_result_preview")}</h3>
            <div className="max-h-96 overflow-auto border border-gray-200 rounded">
              <table className="min-w-full text-xs">
                <tbody>
                  {results.rows.slice(0, 50).map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? "bg-gray-50 font-medium" : "odd:bg-white even:bg-gray-50"}>
                      {Array.from({ length: results.maxColumn }, (_, columnIndex) => (
                        <td key={columnIndex} className="p-2 border-b border-r max-w-52 truncate" title={getCellText(row[columnIndex])}>
                          {getCellText(row[columnIndex])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.rows.length > 50 && <p className="text-xs text-gray-500 mt-2">{t("excelsplitmerge_result_preview_limit")}</p>}
          </div>
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("excelsplitmerge_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
