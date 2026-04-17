"use client";

import { useState } from "react";
import * as ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import { columnLabel, detectColumns, getCellText, getRowValues, getWorksheet, makeEmptyResults, processExcelCleanRows } from "./logic";

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
        raw: true,
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

function toggleKey(keys, columnKey) {
  const key = Number(columnKey);
  return keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key].sort((a, b) => a - b);
}

export default function ExcelCleanContent() {
  const { t } = useI18n();
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [dateColumnKeys, setDateColumnKeys] = useState([]);
  const [validationColumnGroups, setValidationColumnGroups] = useState({
    phone: [],
    id: [],
    email: [],
  });
  const [skipHeaderRow, setSkipHeaderRow] = useState(true);
  const [rules, setRules] = useState({
    trimSpaces: true,
    removeAllSpaces: false,
    fullWidthToHalfWidth: true,
    removeLineBreaks: true,
    removeInvisible: true,
  });
  const [caseMode, setCaseMode] = useState("none");
  const [dateOptions, setDateOptions] = useState({
    enabled: false,
    outputFormat: "yyyy-mm-dd",
    ambiguousMode: "report",
  });
  const [results, setResults] = useState(makeEmptyResults());
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedFieldColumnKeys = Array.from(
    new Set([
      ...(dateOptions.enabled ? dateColumnKeys : []),
      ...validationColumnGroups.phone,
      ...validationColumnGroups.id,
      ...validationColumnGroups.email,
    ])
  );
  const canClean = Boolean(source.workbook && source.sheetName);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      showModal(t("excelclean_error_invalid_format"), "error");
      return;
    }

    setIsProcessing(true);
    try {
      const nextSource = await readExcelFile(file);
      setSource(nextSource);
      setDateColumnKeys([]);
      setValidationColumnGroups({ phone: [], id: [], email: [] });
      setResults(makeEmptyResults());
    } catch (error) {
      console.error("Excel read failed:", error);
      showModal(t("excelclean_error_read"), "error");
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
    });
    setDateColumnKeys([]);
    setValidationColumnGroups({ phone: [], id: [], email: [] });
    setResults(makeEmptyResults());
  };

  const toggleDateColumn = (columnKey) => {
    setDateColumnKeys((current) => {
      const nextKeys = toggleKey(current, columnKey);
      if (nextKeys.length > 0) {
        setDateOptions((currentOptions) => ({
          ...currentOptions,
          enabled: true,
        }));
      }
      return nextKeys;
    });
    setResults(makeEmptyResults());
  };

  const toggleValidationColumn = (type, columnKey) => {
    setValidationColumnGroups((current) => ({
      ...current,
      [type]: toggleKey(current[type], columnKey),
    }));
    setResults(makeEmptyResults());
  };

  const toggleRule = (ruleName) => {
    setRules({
      ...rules,
      [ruleName]: !rules[ruleName],
    });
    setResults(makeEmptyResults());
  };

  const updateDateOption = (key, value) => {
    setDateOptions({
      ...dateOptions,
      [key]: value,
    });
    setResults(makeEmptyResults());
  };

  const cleanRows = () => {
    if (!canClean) {
      showModal(t("excelclean_error_missing_selection"), "error");
      return;
    }

    const worksheet = getWorksheet(source.workbook, source.sheetName);

    if (!worksheet) {
      showModal(t("excelclean_error_missing_selection"), "error");
      return;
    }

    setIsProcessing(true);

    try {
      setResults(
        processExcelCleanRows({
          rows: worksheet.rows,
          dateColumnKeys,
          validationColumnGroups,
          skipHeaderRow,
          rules,
          caseMode,
          dateOptions,
        })
      );
    } catch (error) {
      console.error("Excel clean failed:", error);
      showModal(t("excelclean_error_clean"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = async () => {
    if (!results.stats) {
      showModal(t("excelclean_error_no_results"), "error");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const cleanedSheet = workbook.addWorksheet(t("excelclean_cleaned_sheet"));

    results.rows.forEach((row) => {
      cleanedSheet.addRow(getRowValues(row, results.maxColumn));
    });
    if (results.rows.length > 0) {
      cleanedSheet.getRow(1).font = { bold: skipHeaderRow };
    }
    cleanedSheet.columns.forEach((column) => {
      column.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `excel-clean-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.xlsx`;
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName);
  };

  const ExcelPreview = () => {
    const worksheet = getWorksheet(source.workbook, source.sheetName);

    if (!worksheet) {
      return <p className="text-sm text-gray-500 mt-4">{t("excelclean_preview_empty")}</p>;
    }

    const previewRows = worksheet.rows.slice(0, 11);
    const maxColumn = previewRows.reduce((max, row) => Math.max(max, row.length), 0);

    if (previewRows.length === 0 || maxColumn === 0) {
      return <p className="text-sm text-gray-500 mt-4">{t("excelclean_preview_empty")}</p>;
    }

    return (
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("excelclean_preview_title")}</h3>
        <div className="max-h-80 overflow-auto border border-gray-200 rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 border-b border-r text-left text-gray-500 w-14">#</th>
                {Array.from({ length: maxColumn }, (_, index) => (
                  <th
                    key={index}
                    className={`p-2 border-b border-r text-left whitespace-nowrap ${
                      selectedFieldColumnKeys.includes(index + 1) ? "bg-blue-50 text-blue-700" : "text-gray-600"
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
                        selectedFieldColumnKeys.includes(columnIndex + 1) ? "bg-blue-50" : ""
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
        <p className="text-xs text-gray-500 mt-2">{t("excelclean_preview_hint")}</p>
      </div>
    );
  };

  const ColumnPicker = ({ title, hint, selectedKeys, onToggle }) => (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">{t("excelclean_selected_count", { count: selectedKeys.length })}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-auto border border-gray-200 rounded p-3">
        {source.columns.length === 0 ? (
          <p className="text-sm text-gray-500">{t("excelclean_columns_empty")}</p>
        ) : (
          source.columns.map((column) => (
            <label key={column.key} className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={selectedKeys.includes(column.key)} onChange={() => onToggle(column.key)} className="mt-1" />
              <span>{column.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full mx-auto mt-4">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("excelclean_upload_title")}</h2>
        <FileUploadBox accept={EXCEL_ACCEPT} onChange={handleFileUpload} title={t("excelclean_upload_hint")} maxSize={40} className="min-h-32" />
        {source.fileName && <p className="text-sm text-green-700 mt-3 font-medium">{t("excelclean_selected_file", { name: source.fileName })}</p>}

        {source.workbook && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">{t("excelclean_sheet_label")}</span>
                <select value={source.sheetName} onChange={(event) => updateSheet(event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                  {source.sheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.name}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="lg:col-span-2 rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {t("excelclean_column_mode_hint")}
              </div>
            </div>
            <ExcelPreview />
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("excelclean_rules_title")}</h2>
        <p className="text-sm text-gray-600 mb-5">{t("excelclean_global_rules_hint")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={rules.trimSpaces} onChange={() => toggleRule("trimSpaces")} className="mt-1" />
            <span>{t("excelclean_trim_spaces")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={rules.removeAllSpaces} onChange={() => toggleRule("removeAllSpaces")} className="mt-1" />
            <span>{t("excelclean_remove_all_spaces")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={rules.fullWidthToHalfWidth} onChange={() => toggleRule("fullWidthToHalfWidth")} className="mt-1" />
            <span>{t("excelclean_fullwidth_to_halfwidth")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={rules.removeLineBreaks} onChange={() => toggleRule("removeLineBreaks")} className="mt-1" />
            <span>{t("excelclean_remove_line_breaks")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={rules.removeInvisible} onChange={() => toggleRule("removeInvisible")} className="mt-1" />
            <span>{t("excelclean_remove_invisible")}</span>
          </label>
          <label className="block text-sm text-gray-700">
            <span className="block font-medium mb-1">{t("excelclean_case_mode")}</span>
            <select value={caseMode} onChange={(event) => setCaseMode(event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="none">{t("excelclean_case_none")}</option>
              <option value="upper">{t("excelclean_case_upper")}</option>
              <option value="lower">{t("excelclean_case_lower")}</option>
              <option value="title">{t("excelclean_case_title")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("excelclean_validation_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={skipHeaderRow} onChange={(event) => setSkipHeaderRow(event.target.checked)} className="mt-1" />
            <span>{t("excelclean_skip_header")}</span>
          </label>
          <p className="text-sm text-gray-600">{t("excelclean_validation_columns_hint")}</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <ColumnPicker
            title={t("excelclean_phone_columns_title")}
            hint={t("excelclean_phone_columns_hint")}
            selectedKeys={validationColumnGroups.phone}
            onToggle={(columnKey) => toggleValidationColumn("phone", columnKey)}
          />
          <ColumnPicker
            title={t("excelclean_id_columns_title")}
            hint={t("excelclean_id_columns_hint")}
            selectedKeys={validationColumnGroups.id}
            onToggle={(columnKey) => toggleValidationColumn("id", columnKey)}
          />
          <ColumnPicker
            title={t("excelclean_email_columns_title")}
            hint={t("excelclean_email_columns_hint")}
            selectedKeys={validationColumnGroups.email}
            onToggle={(columnKey) => toggleValidationColumn("email", columnKey)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t("excelclean_date_title")}</h2>
        <ColumnPicker
          title={t("excelclean_date_columns_title")}
          hint={t("excelclean_date_columns_hint")}
          selectedKeys={dateColumnKeys}
          onToggle={toggleDateColumn}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={dateOptions.enabled}
              onChange={(event) => updateDateOption("enabled", event.target.checked)}
              className="mt-1"
            />
            <span>{t("excelclean_date_enable")}</span>
          </label>
          <label className="block text-sm text-gray-700">
            <span className="block font-medium mb-1">{t("excelclean_date_output_format")}</span>
            <select
              value={dateOptions.outputFormat}
              onChange={(event) => updateDateOption("outputFormat", event.target.value)}
              disabled={!dateOptions.enabled}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
            >
              <option value="yyyy-mm-dd">YYYY-MM-DD</option>
              <option value="yyyy/mm/dd">YYYY/MM/DD</option>
              <option value="yyyy-mm-dd hh:mm:ss">YYYY-MM-DD HH:mm:ss</option>
              <option value="zh">YYYY年M月D日</option>
              <option value="yyyy-mm">YYYY-MM</option>
              <option value="yyyy">YYYY</option>
            </select>
          </label>
          <label className="block text-sm text-gray-700">
            <span className="block font-medium mb-1">{t("excelclean_date_ambiguous_mode")}</span>
            <select
              value={dateOptions.ambiguousMode}
              onChange={(event) => updateDateOption("ambiguousMode", event.target.value)}
              disabled={!dateOptions.enabled}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
            >
              <option value="report">{t("excelclean_date_ambiguous_report")}</option>
              <option value="mdy">{t("excelclean_date_ambiguous_mdy")}</option>
              <option value="dmy">{t("excelclean_date_ambiguous_dmy")}</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-3">{t("excelclean_date_hint")}</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("excelclean_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("excelclean_privacy_note")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={cleanRows}
              disabled={!canClean || isProcessing}
              className={`px-5 py-3 rounded font-medium text-white ${!canClean || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isProcessing ? t("excelclean_processing") : t("excelclean_button")}
            </button>
            <button
              type="button"
              onClick={downloadResults}
              disabled={!results.stats}
              className={`px-5 py-3 rounded font-medium ${results.stats ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >
              {t("excelclean_download_button")}
            </button>
          </div>
        </div>
      </div>

      {results.stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("excelclean_total_rows")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.totalRows}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("excelclean_changed_cells")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.changedCells}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("excelclean_validation_issues")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.validationIssues}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("excelclean_date_converted")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.dateConverted}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">{t("excelclean_date_issues")}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{results.stats.dateIssues}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-3">{t("excelclean_changed_cells")}</h3>
              <div className="max-h-80 overflow-auto border border-gray-200 rounded">
                {results.changedCells.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">{t("excelclean_empty_result")}</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <tbody>
                      {results.changedCells.slice(0, 100).map((item, index) => (
                        <tr key={index} className="odd:bg-white even:bg-gray-50">
                          <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{item.rowNumber}</td>
                          <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{item.columnLabel}</td>
                          <td className="p-2 border-b border-r max-w-48 truncate" title={item.oldValue}>{item.oldValue}</td>
                          <td className="p-2 border-b border-r max-w-48 truncate" title={item.newValue}>{item.newValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {results.changedCells.length > 100 && <p className="text-xs text-gray-500 mt-2">{t("excelclean_result_preview_limit")}</p>}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-3">{t("excelclean_validation_issues")}</h3>
              <div className="max-h-80 overflow-auto border border-gray-200 rounded">
                {results.validationIssues.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">{t("excelclean_empty_result")}</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <tbody>
                      {results.validationIssues.slice(0, 100).map((item, index) => (
                        <tr key={index} className="odd:bg-white even:bg-gray-50">
                          <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{item.rowNumber}</td>
                          <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{item.columnLabel}</td>
                          <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{t(`excelclean_validation_${item.type}`)}</td>
                          <td className="p-2 border-b border-r max-w-60 truncate" title={item.value}>{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {results.validationIssues.length > 100 && <p className="text-xs text-gray-500 mt-2">{t("excelclean_result_preview_limit")}</p>}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-3">{t("excelclean_date_report")}</h3>
              <div className="max-h-80 overflow-auto border border-gray-200 rounded">
                {results.dateReports.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">{t("excelclean_empty_result")}</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <tbody>
                      {results.dateReports.slice(0, 100).map((item, index) => (
                        <tr key={index} className="odd:bg-white even:bg-gray-50">
                          <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{item.rowNumber}</td>
                          <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{item.columnLabel}</td>
                          <td className="p-2 border-b border-r text-gray-500 whitespace-nowrap">{t(`excelclean_date_status_${item.status}`)}</td>
                          <td className="p-2 border-b border-r max-w-52 truncate" title={item.originalValue}>{item.originalValue}</td>
                          <td className="p-2 border-b border-r max-w-52 truncate" title={item.resultValue}>{item.resultValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {results.dateReports.length > 100 && <p className="text-xs text-gray-500 mt-2">{t("excelclean_result_preview_limit")}</p>}
            </div>
          </div>
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("excelclean_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
