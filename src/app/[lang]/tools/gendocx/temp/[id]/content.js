"use client";

import { useState, useRef, useEffect } from "react";
import * as ExcelJS from "exceljs";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";
import Link from "next/link";

export default function TemplateDocx({ lang, template }) {
  const { t } = useI18n();
  const [excelFile, setExcelFile] = useState(null);
  const [wordTemplate, setWordTemplate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipReady, setIsZipReady] = useState(false);
  const zipRef = useRef(null);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const totalPages = Math.ceil(excelData.length / pageSize);

  // 加载预定义模板
  useEffect(() => {
    async function loadTemplate() {
      try {
        const response = await fetch(template.path);
        const blob = await response.blob();
        const file = new File([blob], `${template.name}.docx`, {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        setWordTemplate(file);
      } catch (error) {
        console.error("模板加载失败:", error);
        showError(t("template_load_error"));
      }
    }
    loadTemplate();
  }, [template]);

  // 清理预览 URL
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return excelData.slice(start, end);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const showError = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const handleExcelUpload = async (file) => {
    setExcelFile(file);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error(t("gendocx_error_worksheet"));
      }

      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cell.value?.toString();
        if (header) {
          headers.push(header.trim());
        }
      });

      setExcelHeaders(headers);

      const data = [];
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = {};
        headers.forEach((header, index) => {
          const cell = row.getCell(index + 1);
          let value = cell.value;

          if (value instanceof Date) {
            value = value.toLocaleDateString("zh-CN");
          } else {
            value = value !== null && value !== undefined ? value.toString() : "";
          }

          rowData[header] = value;
        });
        data.push({
          ...rowData,
          fileName: "",
          status: t("gendocx_status_pending"),
        });
      }
      setExcelData(data);
    } catch (error) {
      console.error("Excel reading error:", error);
      showError(`${t("gendocx_error_excel")} ${error.message}`);
    }
  };

  const handleGenerate = async () => {
    if (!excelFile || !wordTemplate) {
      showError(t("gendocx_error_noFiles"));
      return;
    }

    try {
      setIsGenerating(true);
      zipRef.current = new PizZip();
      const newPreviewUrls = {};

      const templateContent = await wordTemplate.arrayBuffer();
      const templateName = template.name;

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await excelFile.arrayBuffer());
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error(t("gendocx_error_worksheet"));
      }

      const newResults = [];
      const headers = {};
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cell.value?.toString();
        if (header) {
          headers[colNumber] = header.trim();
        }
      });

      // Process each row
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        try {
          const rowData = {};
          Object.entries(headers).forEach(([colNumber, header]) => {
            const value = row.getCell(Number(colNumber)).value;
            rowData[header] = value !== null && value !== undefined ? value.toString() : "";
          });

          const doc = new Docxtemplater(new PizZip(templateContent), {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: "{{", end: "}}" },
            parser: (tag) => ({
              get: (scope) => {
                let value = scope[tag.trim()];
                if (value === undefined) {
                  console.warn(`Warning: Variable "${tag}" not found in data`);
                  return "";
                }
                return value;
              },
            }),
          });

          doc.render(rowData);

          const generatedDoc = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });

          // 尝试从第一列获取文件名，如果没有则使用默认格式
          let fileName;
          const firstColumnValue = row.getCell(1).value;
          if (firstColumnValue && firstColumnValue.toString().trim()) {
            // 清理文件名中的非法字符
            const cleanFileName = firstColumnValue.toString().trim()
              .replace(/[<>:"/\\|?*]/g, '_')  // 替换Windows非法字符
              .replace(/\s+/g, '_');         // 替换空格为下划线
            fileName = `${cleanFileName}.docx`;
          } else {
            // 如果第一列为空，使用原来的默认格式
            fileName = `${templateName}_${rowNumber - 1}.docx`;
          }
          zipRef.current.file(fileName, await generatedDoc.arrayBuffer());
          newPreviewUrls[fileName] = URL.createObjectURL(generatedDoc);

          newResults.push({
            key: `${rowNumber - 1}`,
            fileName,
            status: t("gendocx_status_generated"),
          });
        } catch (error) {
          console.error(`Row ${rowNumber} error:`, error);
          newResults.push({
            key: `error_${rowNumber}`,
            fileName: `${t("gendocx_row")} ${rowNumber}`,
            status: t("gendocx_status_failed"),
          });
        }
      }

      setPreviewUrls(newPreviewUrls);
      const updatedData = [...excelData];
      newResults.forEach((result, index) => {
        updatedData[index] = {
          ...updatedData[index],
          fileName: result.fileName,
          status: result.status,
        };
      });
      setExcelData(updatedData);
      setIsZipReady(true);
    } catch (error) {
      console.error("Generation error:", error);
      showError(t("gendocx_error_generate"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = () => {
    if (zipRef.current) {
      try {
        const content = zipRef.current.generate({ type: "blob" });
        saveAs(content, `${template.name}_all.zip`);
      } catch (error) {
        showError(t("gendocx_error_download"));
      }
    }
  };

  const handleDownloadSingle = (fileName) => {
    const url = previewUrls[fileName];
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-1/2">
          <div className="border rounded-lg overflow-hidden bg-gray-50 h-full min-h-[300px]">
          <div className="p-4 border-b bg-white flex justify-between items-center">
              <h3 className="font-medium text-gray-700">
                {t("gendocx_template_preview")}
              </h3>
              <button
                onClick={() => window.open(template.path, '_blank')}
                className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t("gendocx_download_word_template")}
              </button>
            </div>
            <div className="relative w-full h-[300px] md:h-[400px]">
              {template.previewImage ? (
                <div className="h-full flex items-center justify-center">
                  <img
                    src={template.previewImage}
                    alt={t(template.previewImageAlt)}
                    className="max-w-full max-h-full object-contain p-4"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">{t("gendocx_no_preview")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2">
          <div className="border rounded-lg overflow-hidden bg-gray-50 h-full min-h-[300px]">
          <div className="p-4 border-b bg-white flex justify-between items-center">
              <h3 className="font-medium text-gray-700">
                {t("gendocx_upload_excel")}
              </h3>
              <button
                onClick={() => window.open(template.excelTemplatePath, '_blank')}
                className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t("gendocx_download_excel_template")}
              </button>
            </div>
            <div className="p-4 h-[300px] md:h-[400px] flex flex-col">
              <FileUploadBox
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                title={t("gendocx_uploadExcel")}
                maxSize={50}
                className="flex-1 flex items-center justify-center"
                containerClassName="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mb-6">
        <Link 
          href="../" 
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-gray-700 bg-white border 
            border-gray-300 rounded-md hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 
            transition-all shadow-sm hover:shadow w-full sm:w-auto group"
        >
          <span className="group-hover:translate-x-0.5 transition-transform">{t('custom_template')}</span>
        </Link>
        <Link 
          href="./" 
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-gray-700 bg-white border 
            border-gray-300 rounded-md hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 
            transition-all shadow-sm hover:shadow w-full sm:w-auto group"
        >
          <span className="group-hover:translate-x-0.5 transition-transform">{t('more_templates')}</span>
        </Link>
        <button
          onClick={handleGenerate}
          disabled={!excelFile || isGenerating}
          className={`px-6 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 
            disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md 
            hover:translate-y-[-1px] active:translate-y-0 w-full sm:w-auto`}
        >
          {isGenerating ? t("gendocx_generating") : t("gendocx_generate")}
        </button>

        <button
          onClick={handleDownloadAll}
          disabled={!isZipReady}
          className="px-6 py-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 
            disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md 
            hover:translate-y-[-1px] active:translate-y-0 w-full sm:w-auto"
        >
          {t("gendocx_downloadAll")}
        </button>
      </div>

      {excelHeaders.length > 0 && (
        <div className="border rounded-lg overflow-hidden shadow relative">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {excelHeaders.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex flex-col">
                      <span>{t("gendocx_fileName")}</span>
                      <span className="text-xs text-gray-400 normal-case">{t("gendocx_fileName_hint")}</span>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("gendocx_status")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("gendocx_actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentPageData().map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {excelHeaders.map((header) => (
                      <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row[header]}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.fileName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${
                            row.status === t("gendocx_status_generated")
                              ? "bg-green-100 text-green-800"
                              : row.status === t("gendocx_status_failed")
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.status === t("gendocx_status_generated") && (
                        <button
                          onClick={() => handleDownloadSingle(row.fileName)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {t("gendocx_download")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {t("gendocx_prevPage")}
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {t("gendocx_nextPage")}
                </button>
              </div>

              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="pageSize" className="text-sm text-gray-700">
                      {t("gendocx_pageSize")}
                    </label>
                    <select
                      id="pageSize"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>

                  <p className="text-sm text-gray-700">
                    {t("gendocx_showing")} <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>{" "}
                    {t("gendocx_to")}
                    <span className="font-medium">{Math.min(currentPage * pageSize, excelData.length)}</span>{" "}
                    {t("gendocx_total")}
                    <span className="font-medium">{excelData.length}</span> {t("gendocx_items")}
                  </p>
                </div>

                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <span className="sr-only">{t("gendocx_prevPage")}</span>
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index + 1}
                        onClick={() => handlePageChange(index + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === index + 1
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <span className="sr-only">{t("gendocx_nextPage")}</span>
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p className="text-gray-700">{modalMessage}</p>
      </Modal>
    </div>
  );
}
