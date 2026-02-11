"use client";

import { useMemo, useState } from "react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function sanitizeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim();
}

function getElementChildren(node) {
  return Array.from(node.childNodes || []).filter((child) => child.nodeType === 1);
}

function getDescendantsByLocalName(node, localName) {
  return Array.from(node.getElementsByTagName("*")).filter((element) => element.localName === localName);
}

function getAttr(node, name) {
  return node.getAttribute(`w:${name}`) || node.getAttribute(name) || "";
}

function parseDocXml(xmlText, t) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
    throw new Error(t("splitword_error_parse_xml"));
  }

  const body =
    xmlDoc.getElementsByTagName("w:body")[0] ||
    xmlDoc.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "body")[0];

  if (!body) {
    throw new Error(t("splitword_error_body"));
  }

  const blocks = [];
  let bodySectPr = "";
  const serializer = new XMLSerializer();

  getElementChildren(body).forEach((node) => {
    if (node.localName === "sectPr") {
      bodySectPr = serializer.serializeToString(node);
      return;
    }
    blocks.push(node);
  });

  const bodyOpenTagMatch = xmlText.match(/<w:body[^>]*>/);
  if (!bodyOpenTagMatch) {
    throw new Error(t("splitword_error_body"));
  }

  return {
    blocks,
    bodySectPr,
    bodyOpenTag: bodyOpenTagMatch[0],
  };
}

function countExplicitPageBreaks(blocks) {
  let count = 0;

  blocks.forEach((block) => {
    const pageBreaks = getDescendantsByLocalName(block, "br").filter((br) => getAttr(br, "type") === "page").length;
    const sectionBreaks = getDescendantsByLocalName(block, "sectPr").length;
    count += pageBreaks + sectionBreaks;
  });

  return count;
}

function countRenderedPageBreaks(blocks) {
  return blocks.reduce((sum, block) => sum + getDescendantsByLocalName(block, "lastRenderedPageBreak").length, 0);
}

function isHeading1Block(block) {
  if (!block || block.localName !== "p") {
    return false;
  }

  const styleElement = getDescendantsByLocalName(block, "pStyle")[0];
  if (!styleElement) {
    return false;
  }

  const styleValue = getAttr(styleElement, "val");
  const normalized = styleValue.toLowerCase().replace(/\s+/g, "");
  return normalized.includes("heading1") || normalized.includes("标题1") || normalized === "1" || normalized === "h1";
}

function isPageMarkerNode(node, includeRenderedBoundary = true) {
  if (!node || node.nodeType !== 1) {
    return false;
  }
  if (node.localName === "br" && getAttr(node, "type") === "page") {
    return true;
  }
  if (includeRenderedBoundary && node.localName === "lastRenderedPageBreak") {
    return true;
  }
  return false;
}

function appendExplicitPageBreak(fragment) {
  if (!fragment || fragment.nodeType !== 1) {
    return;
  }

  const doc = fragment.ownerDocument;
  const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

  if (fragment.localName === "r") {
    const br = doc.createElementNS(W_NS, "w:br");
    br.setAttribute("w:type", "page");
    fragment.appendChild(br);
    return;
  }

  if (fragment.localName === "p") {
    const run = doc.createElementNS(W_NS, "w:r");
    const br = doc.createElementNS(W_NS, "w:br");
    br.setAttribute("w:type", "page");
    run.appendChild(br);
    fragment.appendChild(run);
  }
}

function splitNodeByPageMarkers(node, includeRenderedBoundary = true) {
  if (!node) {
    return [];
  }

  if (node.nodeType !== 1) {
    return [node.cloneNode(true)];
  }

  if (isPageMarkerNode(node, includeRenderedBoundary)) {
    return [];
  }

  const children = Array.from(node.childNodes || []);
  if (children.length === 0) {
    return [node.cloneNode(true)];
  }

  const fragments = [node.cloneNode(false)];

  children.forEach((child) => {
    if (isPageMarkerNode(child, includeRenderedBoundary)) {
      appendExplicitPageBreak(fragments[fragments.length - 1]);
      fragments.push(node.cloneNode(false));
      return;
    }

    const childFragments = splitNodeByPageMarkers(child, includeRenderedBoundary);
    if (childFragments.length === 0) {
      return;
    }

    fragments[fragments.length - 1].appendChild(childFragments[0]);

    for (let i = 1; i < childFragments.length; i += 1) {
      const nextParent = node.cloneNode(false);
      nextParent.appendChild(childFragments[i]);
      fragments.push(nextParent);
    }
  });

  return fragments;
}

function splitBlockByPageMarkers(block, includeRenderedBoundary = true) {
  const fragments = splitNodeByPageMarkers(block, includeRenderedBoundary);

  if (block?.localName === "p" && fragments.length > 1) {
    const sourcePPr = getElementChildren(block).find((child) => child.localName === "pPr");
    if (sourcePPr) {
      fragments.forEach((fragment) => {
        const hasPPr = getElementChildren(fragment).some((child) => child.localName === "pPr");
        if (!hasPPr) {
          fragment.insertBefore(sourcePPr.cloneNode(true), fragment.firstChild);
        }
      });
    }
  }

  return fragments;
}

function splitBlocksByPageBoundaries(blocks, includeRenderedBoundary = true) {
  const pages = [[]];

  blocks.forEach((block) => {
    const fragments = splitBlockByPageMarkers(block, includeRenderedBoundary);
    if (fragments.length === 0) {
      return;
    }

    fragments.forEach((fragment, index) => {
      pages[pages.length - 1].push(fragment);
      if (index < fragments.length - 1) {
        pages.push([]);
      }
    });
  });

  return pages.filter((page) => page.length > 0);
}

function splitBlocksByHeading(blocks) {
  const sections = [];
  let current = [];

  blocks.forEach((block) => {
    if (isHeading1Block(block) && current.length > 0) {
      sections.push(current);
      current = [];
    }
    current.push(block);
  });

  if (current.length > 0) {
    sections.push(current);
  }

  return sections;
}

function createDocXml(originalXml, bodyOpenTag, bodySectPr, blocks) {
  const serializer = new XMLSerializer();
  const bodyXml = `${blocks.map((block) => serializer.serializeToString(block)).join("")}${bodySectPr || ""}`;
  return originalXml.replace(/<w:body[^>]*>[\s\S]*<\/w:body>/, `${bodyOpenTag}${bodyXml}</w:body>`);
}

function removeTrailingPageMarkers(blocks) {
  const cloned = blocks.map((block) => block.cloneNode(true));

  for (let i = cloned.length - 1; i >= 0; i -= 1) {
    const block = cloned[i];
    if (!block || block.localName !== "p") {
      break;
    }

    const pageBreakNodes = getDescendantsByLocalName(block, "br").filter((br) => getAttr(br, "type") === "page");
    const renderedBreakNodes = getDescendantsByLocalName(block, "lastRenderedPageBreak");

    [...pageBreakNodes, ...renderedBreakNodes].forEach((node) => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });

    const hasText = getDescendantsByLocalName(block, "t").some((node) => (node.textContent || "").trim().length > 0);
    const hasContentNode = getDescendantsByLocalName(block, "drawing").length > 0 || getDescendantsByLocalName(block, "object").length > 0;
    const stillHasBreak =
      getDescendantsByLocalName(block, "br").some((br) => getAttr(br, "type") === "page") ||
      getDescendantsByLocalName(block, "lastRenderedPageBreak").length > 0;

    if (!hasText && !hasContentNode && !stillHasBreak) {
      cloned.pop();
      continue;
    }
    break;
  }

  return cloned;
}

function parseRanges(rangeInput, totalPages, t) {
  const tokens = rangeInput
    .split(/[;,，；]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error(t("splitword_error_range_empty"));
  }

  return tokens.map((token) => {
    const singleMatch = token.match(/^\d+$/);
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);

    let start = 0;
    let end = 0;

    if (singleMatch) {
      start = Number(token);
      end = start;
    } else if (rangeMatch) {
      start = Number(rangeMatch[1]);
      end = Number(rangeMatch[2]);
    } else {
      throw new Error(t("splitword_error_range_invalid", { token }));
    }

    if (start < 1 || end < start || end > totalPages) {
      throw new Error(t("splitword_error_range_exceed", { token, total: totalPages }));
    }

    return {
      start,
      end,
      label: start === end ? `p${start}` : `p${start}-${end}`,
    };
  });
}

function flattenPages(pages, start, end) {
  return pages.slice(start - 1, end).flat();
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function buildFileName({ prefix, suffix, startIndex, padding, index }) {
  const safePrefix = sanitizeFileName(prefix || "");
  const safeSuffix = sanitizeFileName(suffix || "");
  const nameBase = safePrefix || "document";
  const serial = String(startIndex + index).padStart(Math.max(1, padding), "0");
  return `${nameBase}${safeSuffix}_${serial}.docx`;
}

export default function WordSplitContent() {
  const { t } = useI18n();
  const [wordFile, setWordFile] = useState(null);
  const [splitMode, setSplitMode] = useState("single");
  const [rangeInput, setRangeInput] = useState("1-2");
  const [fixedPages, setFixedPages] = useState(2);

  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("_split");
  const [startIndex, setStartIndex] = useState(1);
  const [padding, setPadding] = useState(2);

  const [analysis, setAnalysis] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const modeOptions = useMemo(
    () => [
      { value: "single", label: t("splitword_mode_single") },
      { value: "oddEven", label: t("splitword_mode_oddeven") },
      { value: "range", label: t("splitword_mode_range") },
      { value: "fixed", label: t("splitword_mode_fixed") },
      { value: "pageBreak", label: t("splitword_mode_pagebreak") },
      { value: "heading1", label: t("splitword_mode_heading1") },
    ],
    [t]
  );

  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    setOutputs([]);

    if (!file || !file.name.toLowerCase().endsWith(".docx")) {
      showModal(t("splitword_error_invalid_format"));
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const xmlEntry = zip.file("word/document.xml");

      if (!xmlEntry) {
        throw new Error(t("splitword_error_document_xml"));
      }

      const xmlText = xmlEntry.asText();
      const { blocks } = parseDocXml(xmlText, t);

      const renderedPages = splitBlocksByPageBoundaries(blocks, true);
      const explicitPages = splitBlocksByPageBoundaries(blocks, false);
      const explicitBreakCount = countExplicitPageBreaks(blocks);
      const renderedBreakCount = countRenderedPageBreaks(blocks);
      const headingCount = blocks.filter((block) => isHeading1Block(block)).length;

      setWordFile(file);
      setPrefix(file.name.replace(/\.[^/.]+$/, ""));
      setAnalysis({
        renderedPageCount: renderedPages.length,
        explicitPageCount: explicitPages.length,
        explicitBreakCount,
        renderedBreakCount,
        headingCount,
      });
    } catch (error) {
      console.error(error);
      showModal(error.message || t("splitword_error_read"));
    }
  };

  const buildSegments = (blocks) => {
    const renderedPages = splitBlocksByPageBoundaries(blocks, true);

    if (splitMode === "single") {
      return renderedPages.map((pageBlocks, index) => ({
        blocks: pageBlocks,
        label: `p${index + 1}`,
      }));
    }

    if (splitMode === "oddEven") {
      const oddBlocks = renderedPages.filter((_, index) => index % 2 === 0).flat();
      const evenBlocks = renderedPages.filter((_, index) => index % 2 === 1).flat();
      const segments = [];

      if (oddBlocks.length > 0) {
        segments.push({ blocks: oddBlocks, label: "odd" });
      }
      if (evenBlocks.length > 0) {
        segments.push({ blocks: evenBlocks, label: "even" });
      }

      return segments;
    }

    if (splitMode === "range") {
      const ranges = parseRanges(rangeInput, renderedPages.length, t);
      return ranges.map((range) => ({
        blocks: flattenPages(renderedPages, range.start, range.end),
        label: range.label,
      }));
    }

    if (splitMode === "fixed") {
      const size = Number(fixedPages);
      if (!Number.isInteger(size) || size <= 0) {
        throw new Error(t("splitword_error_fixed_invalid"));
      }

      const segments = [];
      for (let i = 0; i < renderedPages.length; i += size) {
        const pageGroup = renderedPages.slice(i, i + size);
        const start = i + 1;
        const end = i + pageGroup.length;
        segments.push({
          blocks: pageGroup.flat(),
          label: start === end ? `p${start}` : `p${start}-${end}`,
        });
      }
      return segments;
    }

    if (splitMode === "pageBreak") {
      const explicitPages = splitBlocksByPageBoundaries(blocks, false);
      if (explicitPages.length <= 1) {
        throw new Error(t("splitword_error_no_page_break"));
      }
      return explicitPages.map((pageBlocks, index) => ({
        blocks: pageBlocks,
        label: `pb${index + 1}`,
      }));
    }

    if (splitMode === "heading1") {
      const sections = splitBlocksByHeading(blocks);
      const headingCount = blocks.filter((block) => isHeading1Block(block)).length;

      if (headingCount === 0 || sections.length <= 1) {
        throw new Error(t("splitword_error_no_heading"));
      }

      return sections.map((sectionBlocks, index) => ({
        blocks: sectionBlocks,
        label: `h1-${index + 1}`,
      }));
    }

    return [];
  };

  const handleSplit = async () => {
    if (!wordFile) {
      showModal(t("splitword_error_no_file"));
      return;
    }

    try {
      setIsProcessing(true);

      const arrayBuffer = await wordFile.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const xmlEntry = zip.file("word/document.xml");

      if (!xmlEntry) {
        throw new Error(t("splitword_error_document_xml"));
      }

      const xmlText = xmlEntry.asText();
      const { blocks, bodyOpenTag, bodySectPr } = parseDocXml(xmlText, t);
      const segments = buildSegments(blocks);

      if (!segments.length) {
        throw new Error(t("splitword_error_split_failed"));
      }

      const generated = segments.map((segment, index) => {
        const outputZip = new PizZip(arrayBuffer);
        const cleanedBlocks = removeTrailingPageMarkers(segment.blocks);
        const nextXml = createDocXml(xmlText, bodyOpenTag, bodySectPr, cleanedBlocks);

        outputZip.file("word/document.xml", nextXml);

        const data = outputZip.generate({
          type: "uint8array",
          mimeType: DOCX_MIME,
        });

        return {
          name: buildFileName({
            prefix,
            suffix,
            startIndex: Number(startIndex) || 1,
            padding: Number(padding) || 2,
            index,
          }),
          label: segment.label,
          data,
        };
      });

      setOutputs(generated);
    } catch (error) {
      console.error(error);
      showModal(error.message || t("splitword_error_split_failed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOne = (item) => {
    const blob = new Blob([item.data], { type: DOCX_MIME });
    saveAs(blob, item.name);
  };

  const handleDownloadAll = () => {
    if (outputs.length === 0) {
      return;
    }

    const zip = new PizZip();
    outputs.forEach((item) => {
      zip.file(item.name, item.data);
    });

    const zipBlob = zip.generate({ type: "blob", mimeType: "application/zip" });
    const archiveBase = sanitizeFileName(prefix || "") || sanitizeFileName(wordFile?.name.replace(/\.[^/.]+$/, "") || "word");
    const archiveName = `${archiveBase}_split_${new Date().toISOString().slice(0, 10)}.zip`;
    saveAs(zipBlob, archiveName);
  };

  const clearOutputs = () => {
    setOutputs([]);
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="flex flex-col lg:flex-row lg:space-x-8 mb-8">
        <div className="lg:w-1/2">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">{t("splitword_upload_title")}</h2>
            <FileUploadBox
              accept=".docx"
              onChange={handleFileUpload}
              title={t("splitword_upload_hint")}
              maxSize={80}
              className="min-h-32"
            />

            {wordFile && <p className="text-sm text-green-600 mt-2">{t("splitword_selected_file", { name: wordFile.name })}</p>}

            <div className="mt-6 border-t pt-5">
              <h3 className="font-medium text-gray-800 mb-2">{t("splitword_stats_title")}</h3>
              {analysis ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {t("splitword_stats_pages_rendered", { count: analysis.renderedPageCount })}</li>
                  <li>• {t("splitword_stats_pages_break", { count: analysis.explicitPageCount })}</li>
                  <li>• {t("splitword_stats_break_count", { count: analysis.explicitBreakCount + analysis.renderedBreakCount })}</li>
                  <li>• {t("splitword_stats_heading_count", { count: analysis.headingCount })}</li>
                </ul>
              ) : (
                <p className="text-sm text-gray-500">{t("splitword_stats_not_ready")}</p>
              )}
              <p className="text-xs text-gray-500 leading-5 mt-3">{t("splitword_note_detect")}</p>
            </div>
          </div>
        </div>

        <div className="lg:w-1/2 mt-6 lg:mt-0">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">{t("splitword_control_title")}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("splitword_mode_label")}</label>
                <select
                  value={splitMode}
                  onChange={(event) => setSplitMode(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {modeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {splitMode === "range" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("splitword_range_label")}</label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(event) => setRangeInput(event.target.value)}
                    placeholder={t("splitword_range_placeholder")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("splitword_range_hint")}</p>
                </div>
              )}

              {splitMode === "fixed" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("splitword_fixed_label")}</label>
                  <input
                    type="number"
                    min="1"
                    value={fixedPages}
                    onChange={(event) => setFixedPages(event.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("splitword_fixed_hint")}</p>
                </div>
              )}

              <div className="border-t pt-5">
                <h3 className="text-base font-semibold text-gray-800 mb-3">{t("splitword_name_rule_title")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t("splitword_name_prefix")}</label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(event) => setPrefix(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t("splitword_name_suffix")}</label>
                    <input
                      type="text"
                      value={suffix}
                      onChange={(event) => setSuffix(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t("splitword_name_start_index")}</label>
                    <input
                      type="number"
                      min="1"
                      value={startIndex}
                      onChange={(event) => setStartIndex(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t("splitword_name_padding")}</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={padding}
                      onChange={(event) => setPadding(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSplit}
                disabled={!wordFile || isProcessing}
                className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-colors text-lg ${
                  !wordFile || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isProcessing ? t("splitword_processing") : t("splitword_split_button")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {outputs.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">
              {t("splitword_outputs_title")} ({outputs.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                {t("splitword_download_all")}
              </button>
              <button onClick={clearOutputs} className="px-4 py-2 text-sm rounded text-red-600 hover:text-red-700">
                {t("splitword_clear_outputs")}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("splitword_name_base")}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("splitword_output_label")}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("splitword_output_size")}</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t("splitword_download")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {outputs.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-800 break-all">{item.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{item.label}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatFileSize(item.data.byteLength)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDownloadOne(item)}
                        className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200"
                      >
                        {t("splitword_download")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-center">
          <p className="text-gray-700 mb-4 whitespace-pre-line">{modalMessage}</p>
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-6 py-2 rounded text-white font-medium bg-blue-500 hover:bg-blue-600"
          >
            {t("splitword_modal_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
