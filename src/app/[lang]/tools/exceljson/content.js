"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import { columnLabel, detectColumns, getCellText, jsonToSheetRows, makeJsonLinesText, makeJsonText, makePreviewText, parseJsonOrJsonLines, rowsToJsonValue } from "./logic";

const ACCEPT = ".xlsx,.xls,.csv,.json,.jsonl";
const PREVIEW_ROW_LIMIT = 11;

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
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    return "excel";
  }
  if (lowerName.endsWith(".csv")) {
    return "csv";
  }
  if (lowerName.endsWith(".json") || lowerName.endsWith(".jsonl")) {
    return "json";
  }
  return "";
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
  const firstSheet = worksheets[0];

  return {
    fileName: file.name,
    type: "excel",
    workbook: { worksheets },
    sheets: worksheets.map((worksheet, index) => ({ id: index + 1, name: worksheet.name })),
    sheetName: firstSheet?.name || "",
    rows: firstSheet?.rows || [],
    columns: detectColumns(firstSheet?.rows || []),
  };
}

function readCsvFile(file) {
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
          columns: detectColumns(rows),
        });
      },
      error: reject,
    });
  });
}

async function readJsonFile(file) {
  return {
    ...DEFAULT_SOURCE,
    fileName: file.name,
    type: "json",
    rows: [],
    jsonText: await file.text(),
  };
}

export default function ExcelJsonContent() {
  const { t } = useI18n();
  const [mode, setMode] = useState("excelToJson");
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [jsonInput, setJsonInput] = useState("");
  const [firstRowAsHeaders, setFirstRowAsHeaders] = useState(true);
  const [jsonOutputFormat, setJsonOutputFormat] = useState("array");
  const [prettyJson, setPrettyJson] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const resultTextRef = useRef("");
  const resultBlobRef = useRef(null);

  const canConvert =
    (mode === "excelToJson" && source.type === "excel" && source.rows.length > 0) ||
    (mode === "csvToJson" && source.type === "csv" && source.rows.length > 0) ||
    (mode === "jsonToExcel" && (jsonInput.trim() || source.jsonText));

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const resetResult = () => {
    setResult(null);
    resultTextRef.current = "";
    resultBlobRef.current = null;
    setProgress(0);
  };

  const updateMode = (nextMode) => {
    setMode(nextMode);
    setSource(DEFAULT_SOURCE);
    setJsonInput("");
    resetResult();
  };

  const handleFileUpload = async (file) => {
    const fileType = getFileType(file.name);
    if (!fileType) {
      showModal(t("exceljson_error_invalid_format"), "error");
      return;
    }
    if ((mode === "excelToJson" && fileType !== "excel") || (mode === "csvToJson" && fileType !== "csv") || (mode === "jsonToExcel" && fileType !== "json")) {
      showModal(t("exceljson_error_mode_file"), "error");
      return;
    }

    setIsProcessing(true);
    resetResult();
    try {
      if (fileType === "excel") {
        setSource(await readExcelFile(file));
      } else if (fileType === "csv") {
        setSource(await readCsvFile(file));
      } else {
        const nextSource = await readJsonFile(file);
        setSource(nextSource);
        setJsonInput(nextSource.jsonText);
      }
    } catch (error) {
      console.error("File read failed:", error);
      showModal(t("exceljson_error_read"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSheet = (sheetName) => {
    const worksheet = source.workbook?.worksheets?.find((item) => item.name === sheetName);
    const rows = worksheet?.rows || [];
    setSource((current) => ({
      ...current,
      sheetName,
      rows,
      columns: detectColumns(rows),
    }));
    resetResult();
  };

  const convertToJson = async () => {
    const jsonValue = await rowsToJsonValue(source.rows, firstRowAsHeaders, setProgress);
    const isJsonLines = jsonOutputFormat === "jsonl";
    const text = isJsonLines ? makeJsonLinesText(jsonValue) : makeJsonText(jsonValue, prettyJson);
    const preview = makePreviewText(text);
    resultTextRef.current = text;
    resultBlobRef.current = new Blob([text], { type: isJsonLines ? "application/x-ndjson;charset=utf-8" : "application/json;charset=utf-8" });
    setResult({
      type: isJsonLines ? "jsonl" : "json",
      previewText: preview.text,
      previewTruncated: preview.truncated,
      rowCount: jsonValue.length,
      columnCount: source.columns.length,
      fileName: `${source.fileName.replace(/\.[^.]+$/, "") || "data"}.${isJsonLines ? "jsonl" : "json"}`,
    });
  };

  const convertJsonToExcel = async () => {
    const text = jsonInput.trim() || source.jsonText || "";
    const jsonValue = parseJsonOrJsonLines(text);
    const sheetData = jsonToSheetRows(jsonValue);
    if (sheetData.rows.length === 0) {
      throw new Error("Empty JSON");
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Result");
    const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
    const preview = makePreviewText(makeJsonText(jsonValue, prettyJson), 80000);

    resultTextRef.current = preview.truncated ? makeJsonText(jsonValue, false) : preview.text;
    resultBlobRef.current = new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    setResult({
      type: "excel",
      previewText: preview.text,
      previewTruncated: preview.truncated,
      rowCount: sheetData.rowCount,
      columnCount: sheetData.columnCount,
      fileName: `${source.fileName ? source.fileName.replace(/\.[^.]+$/, "") : "json-result"}.xlsx`,
    });
  };

  const handleConvert = async () => {
    if (!canConvert) {
      showModal(t("exceljson_error_missing_input"), "error");
      return;
    }

    setIsProcessing(true);
    resetResult();
    try {
      if (mode === "jsonToExcel") {
        await convertJsonToExcel();
      } else {
        await convertToJson();
      }
    } catch (error) {
      console.error("Convert failed:", error);
      showModal(mode === "jsonToExcel" ? t("exceljson_error_json_parse") : t("exceljson_error_convert"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyResult = async () => {
    if (!resultTextRef.current) {
      showModal(t("exceljson_error_no_result"), "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(resultTextRef.current);
      showModal(t("exceljson_copy_success"), "success");
    } catch (error) {
      console.error("Copy failed:", error);
      showModal(t("exceljson_copy_error"), "error");
    }
  };

  const downloadResult = () => {
    if (!resultBlobRef.current || !result) {
      showModal(t("exceljson_error_no_result"), "error");
      return;
    }

    saveAs(resultBlobRef.current, result.fileName);
  };

  const SourcePreview = () => {
    if (!source.rows.length) {
      return null;
    }

    const previewRows = source.rows.slice(0, PREVIEW_ROW_LIMIT);
    const maxColumn = previewRows.reduce((max, row) => Math.max(max, row.length), 0);

    return (
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("exceljson_preview_title")}</h3>
        <div className="max-h-80 overflow-auto border border-gray-200 rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 border-b border-r text-left text-gray-500 w-14">#</th>
                {Array.from({ length: maxColumn }, (_, index) => (
                  <th key={index} className="p-2 border-b border-r text-left whitespace-nowrap text-gray-600">
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
                    <td key={columnIndex} className="p-2 border-b border-r max-w-52 truncate" title={getCellText(row[columnIndex])}>
                      {getCellText(row[columnIndex])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">{t("exceljson_preview_hint")}</p>
      </div>
    );
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("exceljson_mode_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["excelToJson", "csvToJson", "jsonToExcel"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => updateMode(item)}
              className={`border rounded px-4 py-3 text-left ${
                mode === item ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <span className="block font-semibold">{t(`exceljson_mode_${item}`)}</span>
              <span className="block text-xs text-gray-500 mt-1">{t(`exceljson_mode_${item}_hint`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("exceljson_upload_title")}</h2>
        <FileUploadBox accept={ACCEPT} onChange={handleFileUpload} title={t(`exceljson_upload_${mode}`)} maxSize={80} className="min-h-32" />
        {source.fileName && <p className="text-sm text-green-700 mt-3 font-medium">{t("exceljson_selected_file", { name: source.fileName })}</p>}

        {mode === "jsonToExcel" && (
          <label className="block mt-5 text-sm text-gray-700">
            <span className="block font-medium mb-2">{t("exceljson_json_input_label")}</span>
            <textarea
              value={jsonInput}
              onChange={(event) => {
                setJsonInput(event.target.value);
                resetResult();
              }}
              placeholder={t("exceljson_json_input_placeholder")}
              className="w-full min-h-48 border border-gray-300 rounded px-3 py-2 font-mono text-xs"
            />
          </label>
        )}

        {mode === "excelToJson" && source.type === "excel" && (
          <label className="block mt-5 max-w-md">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t("exceljson_sheet_label")}</span>
            <select value={source.sheetName} onChange={(event) => updateSheet(event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
              {source.sheets.map((sheet) => (
                <option key={sheet.id} value={sheet.name}>
                  {sheet.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <SourcePreview />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("exceljson_settings_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mode !== "jsonToExcel" && (
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={firstRowAsHeaders}
                onChange={(event) => {
                  setFirstRowAsHeaders(event.target.checked);
                  resetResult();
                }}
                className="mt-1"
              />
              <span>{t("exceljson_first_row_headers")}</span>
            </label>
          )}
          {mode !== "jsonToExcel" && (
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("exceljson_output_format")}</span>
              <select
                value={jsonOutputFormat}
                onChange={(event) => {
                  setJsonOutputFormat(event.target.value);
                  resetResult();
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="array">{t("exceljson_output_array")}</option>
                <option value="jsonl">{t("exceljson_output_jsonl")}</option>
              </select>
            </label>
          )}
          <label className={`flex items-start gap-2 text-sm text-gray-700 ${mode !== "jsonToExcel" && jsonOutputFormat === "jsonl" ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={prettyJson}
              disabled={mode !== "jsonToExcel" && jsonOutputFormat === "jsonl"}
              onChange={(event) => {
                setPrettyJson(event.target.checked);
                resetResult();
              }}
              className="mt-1"
            />
            <span>{mode !== "jsonToExcel" && jsonOutputFormat === "jsonl" ? t("exceljson_pretty_json_disabled") : t("exceljson_pretty_json")}</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-3">{t("exceljson_performance_hint")}</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("exceljson_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("exceljson_privacy_note")}</p>
            {isProcessing && progress > 0 && <p className="text-sm text-blue-700 mt-2">{t("exceljson_progress", { progress })}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleConvert}
              disabled={!canConvert || isProcessing}
              className={`px-5 py-3 rounded font-medium text-white ${!canConvert || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isProcessing ? t("exceljson_processing") : t("exceljson_convert_button")}
            </button>
            <button
              type="button"
              onClick={copyResult}
              disabled={!result}
              className={`px-5 py-3 rounded font-medium ${result ? "bg-gray-800 text-white hover:bg-gray-900" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >
              {t("exceljson_copy_button")}
            </button>
            <button
              type="button"
              onClick={downloadResult}
              disabled={!result}
              className={`px-5 py-3 rounded font-medium ${result ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >
              {t("exceljson_download_button")}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("exceljson_result_rows")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{result.rowCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("exceljson_result_columns")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{result.columnCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("exceljson_result_type")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{result.type === "excel" ? "XLSX" : result.type === "jsonl" ? "JSONL" : "JSON"}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">{t("exceljson_result_preview")}</h3>
            <textarea readOnly value={result.previewText} className="w-full min-h-96 border border-gray-300 rounded px-3 py-2 font-mono text-xs bg-gray-50" />
            {result.previewTruncated && <p className="text-xs text-gray-500 mt-2">{t("exceljson_result_preview_limit")}</p>}
          </div>
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("exceljson_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
