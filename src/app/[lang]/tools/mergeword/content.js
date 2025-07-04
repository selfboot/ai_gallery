"use client";

import { useState } from "react";
import FileUploadBox from "@/app/components/FileUploadBox";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

export default function WordMergerContent() {
  const { t } = useI18n();
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info"); // 'info', 'error', 'success'
  const [statusMessage, setStatusMessage] = useState(""); // 新增：用于显示上传状态消息

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleFileUpload = (uploadedFiles) => {
    // 清除之前的状态消息
    setStatusMessage("");

    // 处理单个文件或文件数组
    const filesToProcess = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

    const validFiles = [];
    const errors = [];

    filesToProcess.forEach((file) => {
      // 检查是否为Word文件
      if (!file.name.endsWith(".docx")) {
        errors.push(`${file.name}: ${t("mergeword_invalid_format")}`);
        return;
      }

      // 检查是否已经上传过相同文件
      if (files.some((f) => f.name === file.name)) {
        errors.push(`${file.name}: ${t("mergeword_file_exists")}`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      showModal(errors.join("\n"), "error");
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);

      if (validFiles.length === 1) {
        setStatusMessage(`✓ ${t("mergeword_file_added")}${validFiles[0].name}`);
      } else {
        setStatusMessage(`✓ ${t("mergeword_files_added", { count: validFiles.length })}`);
      }

      // 3秒后清除状态消息
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setStatusMessage(""); // 清除状态消息
  };

  const moveFile = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= files.length) return;

    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setFiles(newFiles);
  };

  const extractDocumentContent = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const zip = new PizZip(event.target.result);
          const doc = new Docxtemplater().loadZip(zip);

          // 获取文档的XML内容
          const content = zip.files["word/document.xml"];
          if (content) {
            resolve(content.asText());
          } else {
            reject(new Error(t("mergeword_read_content_error")));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error(t("mergeword_read_file_error")));
      reader.readAsBinaryString(file);
    });
  };

  const mergeDocuments = async () => {
    if (files.length < 2) {
      showModal(t("mergeword_min_files_error"), "error");
      return;
    }

    setIsProcessing(true);

    try {
      // 读取第一个文件作为模板
      const templateFile = files[0];
      const templateContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const zip = new PizZip(event.target.result);
            resolve(zip);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error(t("mergeword_template_error")));
        reader.readAsBinaryString(templateFile);
      });

      // 提取所有文档的内容
      const allContents = [];
      for (let i = 0; i < files.length; i++) {
        const content = await extractDocumentContent(files[i]);
        allContents.push(content);
      }

      // 合并文档内容
      const mergedContent = mergeDocumentXML(allContents);

      // 更新ZIP文件中的document.xml
      templateContent.file("word/document.xml", mergedContent);

      // 生成新的DOCX文件
      const mergedDocx = templateContent.generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // 下载合并后的文件
      const fileName = `${t("mergeword_merged_filename")}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.docx`;
      saveAs(mergedDocx, fileName);

      showModal(t("mergeword_merge_success"), "success");
    } catch (error) {
      console.error("合并失败:", error);
      showModal(`${t("mergeword_merge_error")} ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const mergeDocumentXML = (xmlContents) => {
    // 这是一个简化的XML合并方法
    // 提取每个文档的body内容并合并
    const bodyRegex = /<w:body[^>]*>(.*?)<\/w:body>/s;
    const mergedBodies = [];

    xmlContents.forEach((xml, index) => {
      const match = xml.match(bodyRegex);
      if (match) {
        let bodyContent = match[1];

        // 移除最后的sectPr标签（页面设置），除了最后一个文档
        if (index < xmlContents.length - 1) {
          bodyContent = bodyContent.replace(/<w:sectPr[^>]*>.*?<\/w:sectPr>/s, "");
        }

        // 如果不是第一个文档，添加分页符
        if (index > 0) {
          bodyContent = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' + bodyContent;
        }

        mergedBodies.push(bodyContent);
      }
    });

    // 使用第一个文档的XML结构作为基础
    const baseXml = xmlContents[0];
    const mergedBodyContent = mergedBodies.join("");

    return baseXml.replace(bodyRegex, `<w:body>${mergedBodyContent}</w:body>`);
  };

  const clearAllFiles = () => {
    setFiles([]);
    setStatusMessage(""); // 清除状态消息
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 文件上传区域 */}
      <div className="bg-white">
        <FileUploadBox
          accept=".docx"
          multiple={true}
          onChange={handleFileUpload}
          title={t("mergeword_upload_hint")}
          maxSize={50}
          className="min-h-32"
        />
        {statusMessage && <p className="text-sm text-green-600 mt-2 font-medium">{statusMessage}</p>}
      </div>

      {/* 已上传文件列表 */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {t("mergeword_uploaded_files")} ({files.length})
            </h2>
            <button onClick={clearAllFiles} className="text-red-500 hover:text-red-700 text-sm">
              {t("mergeword_clear_all")}
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* 移动按钮 */}
                  <button
                    onClick={() => moveFile(index, index - 1)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title={t("mergeword_move_up")}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveFile(index, index + 1)}
                    disabled={index === files.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title={t("mergeword_move_down")}
                  >
                    ↓
                  </button>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title={t("mergeword_delete")}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500 mt-3">{t("mergeword_order_hint")}</p>
        </div>
      )}

      {/* 合并按钮 */}
      {files.length >= 2 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <button
            onClick={mergeDocuments}
            disabled={isProcessing}
            className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors
              ${isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {isProcessing ? t("mergeword_merging") : t("mergeword_merge_button", { count: files.length })}
          </button>

          <div className="mt-4 p-4 bg-blue-50 rounded border-l-4 border-blue-400">
            <h3 className="font-medium text-blue-800 mb-2">{t("mergeword_merge_info_title")}</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t("mergeword_merge_info_1")}</li>
              <li>• {t("mergeword_merge_info_2")}</li>
              <li>• {t("mergeword_merge_info_3")}</li>
              <li>• {t("mergeword_merge_info_4")}</li>
            </ul>
          </div>
        </div>
      )}

      {/* 模态框 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-center">
          <div
            className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4
            ${modalType === "error" ? "bg-red-100" : modalType === "success" ? "bg-green-100" : "bg-blue-100"}`}
          >
            <span
              className={`text-2xl
              ${modalType === "error" ? "text-red-600" : modalType === "success" ? "text-green-600" : "text-blue-600"}`}
            >
              {modalType === "error" ? "✕" : modalType === "success" ? "✓" : "ℹ"}
            </span>
          </div>
          <p className="text-gray-700 mb-4">{modalMessage}</p>
          <button
            onClick={() => setIsModalOpen(false)}
            className={`px-6 py-2 rounded text-white font-medium
              ${
                modalType === "error"
                  ? "bg-red-500 hover:bg-red-600"
                  : modalType === "success"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
          >
            {t("mergeword_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
