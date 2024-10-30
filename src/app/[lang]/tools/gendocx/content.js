'use client';

import { useState, useRef } from 'react';
import * as ExcelJS from 'exceljs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import FileUploadBox from '@/app/components/FileUploadBox';

export default function GenDocx() {
  const [excelFile, setExcelFile] = useState(null);
  const [wordTemplate, setWordTemplate] = useState(null);
  const [results, setResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipReady, setIsZipReady] = useState(false);
  const zipRef = useRef(null);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);

  const handleExcelUpload = async (file) => {
    setExcelFile(file);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error('无法读取工作表');
      }

      // 获取表头
      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cell.value?.toString();
        if (header) {
          headers.push(header.trim());
        }
      });
      setExcelHeaders(headers);

      // 获取数据
      const data = [];
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = {};
        headers.forEach((header, index) => {
          const value = row.getCell(index + 1).value;
          rowData[header] = value !== null && value !== undefined ? value.toString() : '';
        });
        data.push({
          ...rowData,
          fileName: '',
          status: '待生成'
        });
      }
      setExcelData(data);
    } catch (error) {
      console.error('Excel reading error:', error);
      alert('读取Excel文件失败');
    }
  };

  const handleWordTemplateUpload = (file) => {
    setWordTemplate(file);
  };

  const handleGenerate = async () => {
    if (!excelFile || !wordTemplate) {
      alert('请先上传Excel文件和Word模板');
      return;
    }

    try {
      setIsGenerating(true);
      setResults([]);
      zipRef.current = new PizZip();

      // 读取 Word 模板
      const templateContent = await wordTemplate.arrayBuffer();
      const templateName = wordTemplate.name.replace(/\.[^/.]+$/, "");

      // 读取 Excel 文件
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await excelFile.arrayBuffer());
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error('无法读取工作表');
      }

      const newResults = [];

      // 获取表头
      const headers = {};
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cell.value?.toString();
        if (header) {
          headers[colNumber] = header.trim();
        }
      });

      // 处理每一行数据
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        try {
          const rowData = {};
          
          // 使用之前保存的表头
          Object.entries(headers).forEach(([colNumber, header]) => {
            const value = row.getCell(Number(colNumber)).value;
            rowData[header] = value !== null && value !== undefined ? value.toString() : '';
          });

          console.log(`Processing row ${rowNumber}:`, rowData);

          // 为每一行创建新的 Docxtemplater 实例
          const doc = new Docxtemplater(new PizZip(templateContent), {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
              start: '{{',
              end: '}}'
            },
            parser: (tag) => ({
              get: (scope) => {
                let value = scope[tag.trim()];
                if (value === undefined) {
                  console.warn(`Warning: Variable "${tag}" not found in data`);
                  return '';
                }
                return value;
              }
            })
          });

          doc.render(rowData);

          const generatedDoc = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });

          const fileName = `${templateName}_${rowNumber-1}.docx`;
          zipRef.current.file(fileName, await generatedDoc.arrayBuffer());

          newResults.push({
            key: `${rowNumber-1}`,
            fileName,
            status: '已生成'
          });

        } catch (error) {
          console.error(`Row ${rowNumber} error:`, error);
          newResults.push({
            key: `error_${rowNumber}`,
            fileName: `第 ${rowNumber} 行`,
            status: '失败'
          });
        }
      }

      // 更新数据状态
      const updatedData = [...excelData];
      newResults.forEach((result, index) => {
        updatedData[index] = {
          ...updatedData[index],
          fileName: result.fileName,
          status: result.status
        };
      });
      setExcelData(updatedData);
      
      setIsZipReady(true);
    } catch (error) {
      console.error('Generation error:', error);
      alert(`生成文档时出错: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = () => {
    if (zipRef.current) {
      try {
        const content = zipRef.current.generate({ type: 'blob' });
        saveAs(content, 'generated_docs.zip');
      } catch (error) {
        alert('下载失败，请重试');
      }
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
        <div className="w-full">
          <FileUploadBox
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            title="上传Excel文件"
            maxSize={50}
            className="h-full"
          />
        </div>
        <div className="w-full">
          <FileUploadBox
            accept=".docx"
            onChange={handleWordTemplateUpload}
            title="上传Word模板"
            maxSize={50}
            className="h-full"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mb-6">
        <button
          onClick={handleGenerate}
          disabled={!excelFile || !wordTemplate || isGenerating}
          className={`px-6 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 
            disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors w-full sm:w-auto`}
        >
          {isGenerating ? '生成中...' : '生成文档'}
        </button>
        <button
          onClick={handleDownloadAll}
          disabled={!isZipReady}
          className="px-6 py-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 
            disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
        >
          下载全部
        </button>
      </div>

      {excelHeaders.length > 0 && (
        <div className="border rounded-lg overflow-hidden shadow relative">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {excelHeaders.map((header, index) => (
                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-[100px] bg-gray-50 shadow-l">
                    文件名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 shadow-l">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {excelData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {excelHeaders.map((header, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row[header]}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm sticky right-[100px] bg-white shadow-l">
                      {row.fileName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm sticky right-0 bg-white shadow-l">
                      <span className={`px-2 py-1 text-sm rounded ${
                        row.status === '已生成' ? 'bg-green-100 text-green-800' : 
                        row.status === '失败' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
