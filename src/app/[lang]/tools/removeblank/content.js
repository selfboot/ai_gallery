"use client";

import { useState } from "react";
import FileUploadBox from "@/app/components/FileUploadBox";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

const SUMMARY_TEMPLATES = {
  en: {
    removeblank_summary_total_pages: "Original total pages: {{count}}",
    removeblank_summary_removed_pages: "Blank pages removed: {{count}}",
    removeblank_summary_remaining_pages: "Pages after cleaning: {{count}}",
    removeblank_summary_pages_unknown:
      "Removed {{removed}} blank pages. Total pages unavailable in document metadata.",
    removeblank_summary_filename: "Saved as: {{filename}}",
  },
  zh: {
    removeblank_summary_total_pages: "文档原始页数：{{count}}",
    removeblank_summary_removed_pages: "移除空白页：{{count}}",
    removeblank_summary_remaining_pages: "清理后剩余页数：{{count}}",
    removeblank_summary_pages_unknown: "已移除 {{removed}} 个空白页，文档未提供有效页数信息。",
    removeblank_summary_filename: "保存为：{{filename}}",
  },
};

const formatTemplate = (template, params = {}) =>
  (template || "").replace(/{{(\w+)}}/g, (_, key) => (params[key] ?? "").toString());

export default function RemoveBlankPagesContent({ lang = "en" }) {
  const { t, dictionary } = useI18n();
  const [file, setFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [resultSummary, setResultSummary] = useState(null);

  const normalizedLang = lang === "zh" ? "zh" : "en";

  const translateSummary = (key, params = {}) => {
    const templateFromDict = dictionary?.[key];
    const fallbackTemplate =
      SUMMARY_TEMPLATES[normalizedLang][key] ?? SUMMARY_TEMPLATES.en[key] ?? key;
    const template = templateFromDict || fallbackTemplate;
    return formatTemplate(template, params);
  };

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const getDocumentPageCount = (zip) => {
    try {
      const appXmlFile = zip.file("docProps/app.xml");
      if (!appXmlFile) return null;

      const parser = new DOMParser();
      const xmlString = appXmlFile.asText();
      const xmlDoc = parser.parseFromString(xmlString, "application/xml");
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        console.warn("Failed to parse docProps/app.xml");
        return null;
      }

      const pagesNodes = xmlDoc.getElementsByTagName("Pages");
      if (pagesNodes.length === 0) return null;

      const pagesValue = parseInt(pagesNodes[0].textContent || "", 10);
      return Number.isNaN(pagesValue) ? null : pagesValue;
    } catch (error) {
      console.warn("Error extracting page count:", error);
      return null;
    }
  };

  const handleFileUpload = (uploadedFile) => {
    setStatusMessage("");
    setResultSummary(null);

    if (!uploadedFile) {
      return;
    }

    if (!uploadedFile.name.toLowerCase().endsWith(".docx")) {
      showModal(t("removeblank_invalid_format"), "error");
      return;
    }

    setFile(uploadedFile);
    setStatusMessage(`✓ ${t("removeblank_file_ready")} ${uploadedFile.name}`);
  };

  const clearFile = () => {
    setFile(null);
    setStatusMessage("");
    setResultSummary(null);
  };

  const readFileAsBinaryString = (inputFile) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error(t("removeblank_read_file_error")));
      reader.readAsBinaryString(inputFile);
    });
  };

  const removeBlankContent = (xmlString) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    const parseError = xmlDoc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
      throw new Error(t("removeblank_parse_error"));
    }

    const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const drawingNs = "http://schemas.openxmlformats.org/drawingml/2006/main";
    const mathNs = "http://www.w3.org/1998/Math/MathML";

    const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS(wNs, "p"));
    const chunks = [];

    const analyzeParagraph = (paragraph) => {
      const sectionBreaks = paragraph.getElementsByTagNameNS(wNs, "sectPr");
      const hasSectionBreak = sectionBreaks.length > 0;
      let sectionBreakType = null;
      if (hasSectionBreak) {
        const typeNode = sectionBreaks[0].getElementsByTagNameNS(wNs, "type")[0];
        sectionBreakType =
          (typeNode &&
            (typeNode.getAttributeNS(wNs, "val") ||
              typeNode.getAttribute("w:val") ||
              typeNode.getAttribute("val"))) ||
          "nextPage";
        sectionBreakType = sectionBreakType ? sectionBreakType.toLowerCase() : null;
      }
      const causesSectionPageBreak =
        sectionBreakType &&
        ["nextpage", "oddpage", "evenpage", "continuous"].includes(sectionBreakType)
          ? sectionBreakType !== "continuous"
          : hasSectionBreak;
      const hasBookmark =
        paragraph.getElementsByTagNameNS(wNs, "bookmarkStart").length > 0 ||
        paragraph.getElementsByTagNameNS(wNs, "bookmarkEnd").length > 0;
      const hasField = paragraph.getElementsByTagNameNS(wNs, "fldChar").length > 0;
      const hasComment =
        paragraph.getElementsByTagNameNS(wNs, "commentRangeStart").length > 0 ||
        paragraph.getElementsByTagNameNS(wNs, "commentRangeEnd").length > 0;
      const hasSdt = paragraph.getElementsByTagNameNS(wNs, "sdt").length > 0;
      const hasMath = paragraph.getElementsByTagNameNS(mathNs, "math").length > 0;

      const runs = Array.from(paragraph.getElementsByTagNameNS(wNs, "r"));

      const hasDrawing = runs.some(
        (run) =>
          run.getElementsByTagNameNS(drawingNs, "drawing").length > 0 ||
          run.getElementsByTagNameNS(wNs, "object").length > 0 ||
          run.getElementsByTagNameNS(wNs, "pict").length > 0
      );

      const hasHyperlink = paragraph.getElementsByTagNameNS(wNs, "hyperlink").length > 0;

      const hasNonWhitespaceText = runs.some((run) =>
        Array.from(run.getElementsByTagNameNS(wNs, "t")).some((textNode) => {
          const content = textNode.textContent || "";
          return content.replace(/[\s\u00a0\u200b\ufeff]+/g, "") !== "";
        })
      );

      const hasStructuralContent = hasBookmark || hasField || hasComment || hasSdt || hasMath;

      const runHasOnlyWhitespace = (run) => {
        const ignoreNodes = new Set(["w:rPr", "w:proofErr"]);
        const allowedNodes = new Set(["w:t", "w:tab", "w:cr", "w:lastRenderedPageBreak", "w:br"]);
        const elementChildren = Array.from(run.childNodes).filter(
          (node) => node.nodeType === 1 && !ignoreNodes.has(node.nodeName)
        );

        const hasUnsupportedChild = elementChildren.some((node) => !allowedNodes.has(node.nodeName));

        if (hasUnsupportedChild) {
          return false;
        }

        const textNodes = Array.from(run.getElementsByTagNameNS(wNs, "t"));
        return textNodes.every((textNode) => {
          const content = textNode.textContent || "";
          return content.replace(/[\s\u00a0\u200b\ufeff]+/g, "") === "";
        });
      };

      const isWhitespaceOnly = runs.length === 0 || runs.every((run) => runHasOnlyWhitespace(run));

      const hasLastRenderedBreak = runs.some(
        (run) => run.getElementsByTagNameNS(wNs, "lastRenderedPageBreak").length > 0
      );

      const hasPageBreak = runs.some((run) =>
        Array.from(run.getElementsByTagNameNS(wNs, "br")).some((br) => {
          const type = br.getAttribute("w:type") || br.getAttribute("type") || "";
          return type === "page" || type === "section" || type === "column";
        })
      );

      const hasPageBreakBeforeElements = paragraph.getElementsByTagNameNS(wNs, "pageBreakBefore");
      const hasPageBreakBefore = Array.from(hasPageBreakBeforeElements).some((el) => {
        const val = el.getAttributeNS(wNs, "val") || el.getAttribute("w:val") || el.getAttribute("val");
        if (!val) return true;
        const normalized = val.toLowerCase();
        return normalized !== "off" && normalized !== "false" && normalized !== "0";
      });

      const hasExplicitPageBreakAfter =
        hasPageBreak || hasLastRenderedBreak || (causesSectionPageBreak && hasSectionBreak);

      const hasContent =
        hasStructuralContent || hasDrawing || hasHyperlink || hasNonWhitespaceText || !isWhitespaceOnly;

      return {
        node: paragraph,
        hasContent,
        hasExplicitPageBreakAfter,
        hasPageBreakBefore,
        causesSectionPageBreak,
        isWhitespaceOnly,
      };
    };

    let currentChunk = { paragraphs: [], hasContent: false };

    const pushChunk = () => {
      if (currentChunk.paragraphs.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = { paragraphs: [], hasContent: false };
    };

    paragraphs.forEach((paragraph) => {
      const analysis = analyzeParagraph(paragraph);

      if (analysis.hasPageBreakBefore) {
        pushChunk();
      }

      currentChunk.paragraphs.push(analysis);
      if (analysis.hasContent) {
        currentChunk.hasContent = true;
      }

      if (analysis.hasExplicitPageBreakAfter) {
        pushChunk();
      }
    });

    pushChunk();

    let removedBlankPages = 0;

    for (let i = chunks.length - 1; i >= 0; i -= 1) {
      const chunk = chunks[i];
      if (chunk.paragraphs.length === 0) {
        continue;
      }

      if (chunk.hasContent) {
        continue;
      }

      chunk.paragraphs.forEach(({ node }) => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });

      removedBlankPages += 1;
    }

    const serializer = new XMLSerializer();
    const cleanedXml = serializer.serializeToString(xmlDoc);

    return {
      cleanedXml,
      blankPagesRemoved: removedBlankPages,
    };
  };

  const generateDownloadName = (originalName) => {
    const baseName = originalName.replace(/\.docx$/i, "");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `${baseName}-cleaned-${timestamp}.docx`;
  };

  const handleCleanDocument = async () => {
    if (!file) {
      showModal(t("removeblank_no_file"), "error");
      return;
    }

    setIsProcessing(true);
    setStatusMessage(t("removeblank_processing"));
    setResultSummary(null);

    try {
      const binaryContent = await readFileAsBinaryString(file);
      const zip = new PizZip(binaryContent);
      const documentFile = zip.file("word/document.xml");

      if (!documentFile) {
        throw new Error(t("removeblank_missing_document"));
      }

      const originalTotalPages = getDocumentPageCount(zip);

      const { cleanedXml, blankPagesRemoved } = removeBlankContent(documentFile.asText());

      if (blankPagesRemoved === 0) {
        showModal(t("removeblank_no_blank_pages"), "info");
        setStatusMessage("");
        setResultSummary(null);
        return;
      }

      zip.file("word/document.xml", cleanedXml);

      const cleanedBlob = zip.generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const downloadName = generateDownloadName(file.name);
      saveAs(cleanedBlob, downloadName);

      const remainingPages =
        originalTotalPages != null
          ? Math.max(originalTotalPages - blankPagesRemoved, 0)
          : null;

      setResultSummary({
        downloadName,
        blankPagesRemoved,
        totalPages: originalTotalPages,
        remainingPages,
      });

      showModal(
        t("removeblank_success", {
          count: blankPagesRemoved,
        }),
        "success"
      );

      setStatusMessage(t("removeblank_download_ready", { filename: downloadName }));
    } catch (error) {
      console.error("removeblank failed:", error);
      showModal(`${t("removeblank_error")} ${error.message}`, "error");
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="flex flex-col lg:flex-row lg:space-x-8 mb-8">
        <div className="lg:w-1/2">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">{t("removeblank_upload_title")}</h2>
              <FileUploadBox
                accept=".docx"
                multiple={false}
                onChange={handleFileUpload}
                title={t("removeblank_upload_hint")}
                maxSize={50}
                className="min-h-32"
              />
              {statusMessage && (
                <p className="text-sm text-green-600 mt-3 font-medium break-words">{statusMessage}</p>
              )}
            </div>

            {file && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("removeblank_file_size")}
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-sm text-red-500 hover:text-red-700 transition"
                  >
                    {t("removeblank_clear_file")}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleCleanDocument}
                disabled={isProcessing || !file}
                className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-colors text-lg ${
                  isProcessing || !file ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isProcessing ? t("removeblank_processing") : t("removeblank_clean_button")}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-1/2 mt-6 lg:mt-0">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-700">{t("removeblank_feature_title")}</h2>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>{t("removeblank_feature_1")}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>{t("removeblank_feature_2")}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>{t("removeblank_feature_3")}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>{t("removeblank_feature_4")}</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">{t("removeblank_steps_title")}</h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>{t("removeblank_step_1")}</li>
                <li>{t("removeblank_step_2")}</li>
                <li>{t("removeblank_step_3")}</li>
                <li>{t("removeblank_step_4")}</li>
              </ol>
            </div>

            {resultSummary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-2">
                  {t("removeblank_summary_title")}
                </h3>
                <ul className="text-xs text-blue-600 space-y-1">
                  {resultSummary.totalPages != null ? (
                    <>
                      <li>
                        {translateSummary("removeblank_summary_total_pages", {
                          count: resultSummary.totalPages,
                        })}
                      </li>
                      <li>
                        {translateSummary("removeblank_summary_removed_pages", {
                          count: resultSummary.blankPagesRemoved,
                        })}
                      </li>
                      <li>
                        {translateSummary("removeblank_summary_remaining_pages", {
                          count: resultSummary.remainingPages,
                        })}
                      </li>
                    </>
                  ) : (
                    <li>
                      {translateSummary("removeblank_summary_pages_unknown", {
                        removed: resultSummary.blankPagesRemoved,
                      })}
                    </li>
                  )}
                  <li>
                    {translateSummary("removeblank_summary_filename", {
                      filename: resultSummary.downloadName,
                    })}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-center">
          <div
            className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              modalType === "error"
                ? "bg-red-100"
                : modalType === "success"
                  ? "bg-green-100"
                  : "bg-blue-100"
            }`}
          >
            <span
              className={`text-2xl ${
                modalType === "error"
                  ? "text-red-600"
                  : modalType === "success"
                    ? "text-green-600"
                    : "text-blue-600"
              }`}
            >
              {modalType === "error" ? "✕" : modalType === "success" ? "✓" : "ℹ"}
            </span>
          </div>
          <p className="text-gray-700 mb-4 whitespace-pre-line">{modalMessage}</p>
          <button
            onClick={() => setIsModalOpen(false)}
            className={`px-6 py-2 rounded text-white font-medium ${
              modalType === "error"
                ? "bg-red-500 hover:bg-red-600"
                : modalType === "success"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {t("removeblank_modal_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}


