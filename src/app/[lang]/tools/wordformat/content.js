"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import {
  CheckCircle2,
  Download,
  FileText,
  Layers,
  ListChecks,
  Trash2,
  Wand2,
} from "lucide-react";
import PizZip from "pizzip";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

const STYLE_PARTS = [
  "word/styles.xml",
  "word/stylesWithEffects.xml",
  "word/fontTable.xml",
  "word/theme/theme1.xml",
  "word/settings.xml",
  "word/_rels/settings.xml.rels",
];

const SECTION_FORMAT_CHILDREN = new Set([
  "type",
  "pgSz",
  "pgMar",
  "paperSrc",
  "pgBorders",
  "lnNumType",
  "pgNumType",
  "cols",
  "formProt",
  "vAlign",
  "noEndnote",
  "titlePg",
  "textFlow",
  "bidi",
  "rtlGutter",
  "docGrid",
]);

const PARAGRAPH_KEEP_CHILDREN = new Set(["pStyle", "numPr", "sectPr", "keepNext", "keepLines", "pageBreakBefore"]);
const RUN_KEEP_CHILDREN = new Set(["rStyle", "b", "bCs", "i", "iCs", "u", "strike", "dstrike", "vertAlign", "highlight", "rtl"]);
const TEMPLATE_PARAGRAPH_RUN_KEEP_CHILDREN = new Set(["rStyle", "strike", "dstrike", "vertAlign", "highlight", "rtl"]);
const CONTENT_TYPES = {
  "/word/styles.xml": "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
  "/word/stylesWithEffects.xml": "application/vnd.ms-word.stylesWithEffects+xml",
  "/word/fontTable.xml": "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml",
  "/word/theme/theme1.xml": "application/vnd.openxmlformats-officedocument.theme+xml",
  "/word/settings.xml": "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml",
  "/word/numbering.xml": "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
};

const DOCUMENT_RELATIONSHIPS = {
  "word/styles.xml": {
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
    target: "styles.xml",
  },
  "word/stylesWithEffects.xml": {
    type: "http://schemas.microsoft.com/office/2007/relationships/stylesWithEffects",
    target: "stylesWithEffects.xml",
  },
  "word/fontTable.xml": {
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable",
    target: "fontTable.xml",
  },
  "word/theme/theme1.xml": {
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
    target: "theme/theme1.xml",
  },
  "word/settings.xml": {
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings",
    target: "settings.xml",
  },
  "word/numbering.xml": {
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering",
    target: "numbering.xml",
  },
};

const SAMPLE_TEMPLATE_FILE = {
  url: "/files/wordformat-company-template.docx",
  fileName: "企业项目报告模板.docx",
};

const SAMPLE_TARGET_FILE = {
  url: "/files/wordformat-real-project-report.docx",
  fileName: "Q3 智能客服项目复盘报告.docx",
};

function isDocxFile(file) {
  return file?.name?.toLowerCase().endsWith(".docx");
}

function formatBytes(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function sanitizeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "formatted";
}

async function loadSampleDocx(sampleFile, errorMessage) {
  const response = await fetch(sampleFile.url);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  const blob = await response.blob();
  return new File([blob], sampleFile.fileName, { type: DOCX_MIME });
}

function parseXml(xmlText, errorMessage) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
    throw new Error(errorMessage);
  }
  return xmlDoc;
}

function getAttr(node, name) {
  return node?.getAttribute(`w:${name}`) || node?.getAttributeNS(W_NS, name) || node?.getAttribute(name) || "";
}

function setWAttr(node, name, value) {
  node.setAttribute(`w:${name}`, value);
}

function childrenByLocalName(node, localName) {
  return Array.from(node?.childNodes || []).filter((child) => child.nodeType === 1 && child.localName === localName);
}

function firstChildByLocalName(node, localName) {
  return childrenByLocalName(node, localName)[0] || null;
}

function elementsByLocalName(node, localName) {
  return Array.from(node?.getElementsByTagName("*") || []).filter((element) => element.localName === localName);
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_\-:：.。]/g, "");
}

function chineseLevel(value) {
  const map = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
  };
  return map[value] || null;
}

function inferParagraphRole(style) {
  const normalized = normalizeName(`${style.styleId} ${style.name}`);
  const normalizedName = normalizeName(style.name);
  const outlineLevel = style.outlineLevel === "" ? NaN : Number(style.outlineLevel);
  if (Number.isInteger(outlineLevel) && outlineLevel >= 0 && outlineLevel <= 5) {
    return `heading${outlineLevel + 1}`;
  }

  const headingMatch = normalized.match(/(?:heading|标题|標題|h)([1-6一二三四五六])/);
  if (headingMatch) {
    const level = Number(headingMatch[1]) || chineseLevel(headingMatch[1]);
    if (level >= 1 && level <= 6) return `heading${level}`;
  }

  if (style.isDefault || /^(normal|正文|bodytext|body)$/.test(normalizedName || normalized)) return "normal";
  if (/^(title|标题|標題)$/.test(normalizedName)) return "title";
  if (/subtitle|副标题|副標題/.test(normalizedName || normalized)) return "subtitle";
  if (/listbullet|bulletlist|bulleted|项目符号|項目符號|无序列表|無序列表/.test(normalized)) return "listBullet";
  if (/listnumber|numberedlist|编号列表|編號列表|有序列表|编号|編號/.test(normalized)) return "listNumber";
  if (/callout|alert|warning|notice|attention|caution|提醒|注意|警告|风险|風險/.test(normalized)) {
    return "callout";
  }
  if (/infobox|information|info|提示|信息|说明|說明/.test(normalized)) return "info";
  if (/note|备注|備註|注释|註釋/.test(normalized)) return "note";
  if (/quote|引用/.test(normalized)) return "quote";
  return "";
}

function inferCharacterRole(style) {
  const normalized = normalizeName(`${style.styleId} ${style.name}`);
  if (/strong|强调|emphasis|加粗/.test(normalized)) return "strong";
  if (/subtle|minor|弱/.test(normalized)) return "subtle";
  if (/hyperlink|超链接|超連結/.test(normalized)) return "hyperlink";
  return "";
}

function choosePreferredTableStyleId(tableStyles) {
  if (!tableStyles.length) return "";
  const isNormalTable = (style) => /^(normaltable|普通表格|正文表格)$/.test(normalizeName(`${style.styleId} ${style.name}`));
  const ranked = tableStyles
    .filter((style) => style.styleId && !isNormalTable(style))
    .map((style) => {
      const normalized = normalizeName(`${style.styleId} ${style.name}`);
      let score = 0;
      if (/template/.test(normalized)) score += 5;
      if (/grid|网格|網格/.test(normalized)) score += 4;
      if (/light|shading|accent|强调|強調/.test(normalized)) score += 2;
      if (/table|表格/.test(normalized)) score += 1;
      return { ...style, score };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.styleId || tableStyles.find((style) => !isNormalTable(style))?.styleId || tableStyles[0].styleId || "";
}

function getDefaultFont(stylesDoc, themeFonts) {
  const docDefaults = elementsByLocalName(stylesDoc, "docDefaults")[0];
  const rPrDefault = docDefaults ? firstChildByLocalName(docDefaults, "rPrDefault") : null;
  const rPrInDefault = rPrDefault ? firstChildByLocalName(rPrDefault, "rPr") : null;
  const rFonts = rPrInDefault
    ? firstChildByLocalName(rPrInDefault, "rFonts")
    : elementsByLocalName(stylesDoc, "rFonts")[0];
  const sz = rPrInDefault
    ? firstChildByLocalName(rPrInDefault, "sz")
    : elementsByLocalName(stylesDoc, "sz")[0];
  const color = rPrInDefault
    ? firstChildByLocalName(rPrInDefault, "color")
    : elementsByLocalName(stylesDoc, "color")[0];

  const resolveTheme = (themeKey, latinKey, fallback) => {
    const direct = getAttr(rFonts, latinKey);
    if (direct) return direct;
    const themeRef = getAttr(rFonts, themeKey);
    if (!themeRef || !themeFonts) return "";
    if (themeRef.startsWith("major")) return themeFonts.majorLatin || fallback || "";
    if (themeRef.startsWith("minor")) return themeFonts.minorLatin || fallback || "";
    return "";
  };

  const resolveEastAsiaTheme = () => {
    const direct = getAttr(rFonts, "eastAsia");
    if (direct) return direct;
    const themeRef = getAttr(rFonts, "eastAsiaTheme");
    if (!themeRef || !themeFonts) return "";
    if (themeRef.startsWith("major")) return themeFonts.majorEastAsia || "";
    if (themeRef.startsWith("minor")) return themeFonts.minorEastAsia || "";
    return "";
  };

  return {
    latin: resolveTheme("asciiTheme", "ascii") || resolveTheme("hAnsiTheme", "hAnsi") || "",
    eastAsia: resolveEastAsiaTheme(),
    size: getAttr(sz, "val") ? `${Number(getAttr(sz, "val")) / 2} pt` : "",
    color: getAttr(color, "val") || "",
  };
}

function readThemeFonts(themeXml) {
  if (!themeXml) return null;
  let themeDoc;
  try {
    themeDoc = parseXml(themeXml, "wordformat_error_parse_xml");
  } catch {
    return null;
  }
  const fontScheme = elementsByLocalName(themeDoc, "fontScheme")[0];
  if (!fontScheme) return null;

  const readGroup = (groupName) => {
    const group = firstChildByLocalName(fontScheme, groupName);
    if (!group) return { latin: "", eastAsia: "" };
    const latin = firstChildByLocalName(group, "latin");
    const ea = firstChildByLocalName(group, "ea");
    let eastAsia = ea ? ea.getAttribute("typeface") || "" : "";
    if (!eastAsia) {
      const fonts = childrenByLocalName(group, "font");
      const hans = fonts.find((node) => node.getAttribute("script") === "Hans");
      eastAsia = hans ? hans.getAttribute("typeface") || "" : "";
    }
    return {
      latin: latin ? latin.getAttribute("typeface") || "" : "",
      eastAsia,
    };
  };

  const major = readGroup("majorFont");
  const minor = readGroup("minorFont");
  return {
    majorLatin: major.latin,
    majorEastAsia: major.eastAsia,
    minorLatin: minor.latin,
    minorEastAsia: minor.eastAsia,
  };
}

function extractStyleVisuals(styleNode) {
  const rPr = firstChildByLocalName(styleNode, "rPr");
  const pPr = firstChildByLocalName(styleNode, "pPr");
  const rFonts = firstChildByLocalName(rPr, "rFonts");
  const sz = firstChildByLocalName(rPr, "sz");
  const color = firstChildByLocalName(rPr, "color");
  const bold = firstChildByLocalName(rPr, "b");
  const italic = firstChildByLocalName(rPr, "i");
  const spacing = firstChildByLocalName(pPr, "spacing");
  const indent = firstChildByLocalName(pPr, "ind");
  const sizeRaw = getAttr(sz, "val");

  const twipsToPt = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "";
    return `${Math.round((parsed / 20) * 10) / 10}pt`;
  };
  const dxaToCm = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "";
    return `${Math.round((parsed / 1440) * 2.54 * 10) / 10}cm`;
  };
  const lineToText = () => {
    const line = getAttr(spacing, "line");
    if (!line) return "";
    const lineRule = getAttr(spacing, "lineRule");
    const parsed = Number(line);
    if (!Number.isFinite(parsed)) return "";
    if (!lineRule || lineRule === "auto") return `${Math.round((parsed / 240) * 10) / 10}x`;
    return twipsToPt(line);
  };

  return {
    color: getAttr(color, "val") || "",
    size: sizeRaw ? `${Number(sizeRaw) / 2}pt` : "",
    fontLatin: getAttr(rFonts, "ascii") || getAttr(rFonts, "hAnsi") || getAttr(rFonts, "asciiTheme") || "",
    fontEastAsia: getAttr(rFonts, "eastAsia") || getAttr(rFonts, "eastAsiaTheme") || "",
    bold: Boolean(bold),
    italic: Boolean(italic),
    spacingBefore: twipsToPt(getAttr(spacing, "before")),
    spacingAfter: twipsToPt(getAttr(spacing, "after")),
    lineSpacing: lineToText(),
    indentLeft: dxaToCm(getAttr(indent, "left")),
    indentRight: dxaToCm(getAttr(indent, "right")),
    hangingIndent: dxaToCm(getAttr(indent, "hanging")),
  };
}

function readStyleProfile(stylesXml, t, themeFonts) {
  const stylesDoc = parseXml(stylesXml, t("wordformat_error_parse_xml"));
  const styles = elementsByLocalName(stylesDoc, "style").map((styleNode) => {
    const type = getAttr(styleNode, "type");
    const styleId = getAttr(styleNode, "styleId");
    const nameNode = firstChildByLocalName(styleNode, "name");
    const outlineNode = elementsByLocalName(styleNode, "outlineLvl")[0];

    return {
      type,
      styleId,
      name: getAttr(nameNode, "val"),
      outlineLevel: getAttr(outlineNode, "val"),
      isDefault: getAttr(styleNode, "default") === "1",
      visuals: extractStyleVisuals(styleNode),
    };
  });

  const paragraphRoleIds = {};
  const characterRoleIds = {};
  const paragraphStyleRoles = {};
  const characterStyleRoles = {};
  const existingStyleIds = new Set();
  const paragraphStyleIds = new Set();
  const characterStyleIds = new Set();
  const tableStyleIds = new Set();
  const paragraphStylesById = {};
  const characterStylesById = {};
  const tableStylesById = {};
  const paragraphStyles = [];
  const characterStyles = [];
  const tableStyles = [];
  const headingSamples = {};

  styles.forEach((style) => {
    if (!style.styleId) return;
    existingStyleIds.add(style.styleId);

    if (style.type === "paragraph") {
      paragraphStyleIds.add(style.styleId);
      paragraphStylesById[style.styleId] = style;
      const role = inferParagraphRole(style);
      if (role) {
        paragraphStyleRoles[style.styleId] = role;
        if (!paragraphRoleIds[role] || style.isDefault || /^heading[1-6]$/.test(role)) {
          paragraphRoleIds[role] = style.styleId;
        }
        if (/^heading[1-6]$/.test(role)) {
          headingSamples[role] = {
            styleId: style.styleId,
            name: style.name || style.styleId,
            ...style.visuals,
          };
        }
      }
      paragraphStyles.push({
        styleId: style.styleId,
        name: style.name || style.styleId,
        role: role || "",
        isDefault: style.isDefault,
        ...style.visuals,
      });
    } else if (style.type === "character") {
      characterStyleIds.add(style.styleId);
      characterStylesById[style.styleId] = style;
      const role = inferCharacterRole(style);
      if (role) {
        characterStyleRoles[style.styleId] = role;
        if (!characterRoleIds[role]) {
          characterRoleIds[role] = style.styleId;
        }
      }
      characterStyles.push({
        styleId: style.styleId,
        name: style.name || style.styleId,
        role: role || "",
        ...style.visuals,
      });
    } else if (style.type === "table") {
      tableStyleIds.add(style.styleId);
      tableStylesById[style.styleId] = style;
      tableStyles.push({
        styleId: style.styleId,
        name: style.name || style.styleId,
      });
    }
  });

  const paragraphCount = paragraphStyles.length;
  const characterCount = characterStyles.length;
  const tableCount = tableStyles.length;

  return {
    existingStyleIds,
    paragraphStyleIds,
    characterStyleIds,
    tableStyleIds,
    paragraphStylesById,
    characterStylesById,
    tableStylesById,
    preferredTableStyleId: choosePreferredTableStyleId(tableStyles),
    paragraphRoleIds,
    characterRoleIds,
    paragraphStyleRoles,
    characterStyleRoles,
    paragraphStyles,
    characterStyles,
    tableStyles,
    summary: {
      paragraphCount,
      characterCount,
      tableCount,
      headingCount: Object.keys(paragraphRoleIds).filter((role) => /^heading[1-6]$/.test(role)).length,
      defaultFont: getDefaultFont(stylesDoc, themeFonts),
      headingSamples,
    },
  };
}

function readZipText(zip, path) {
  const part = zip.file(path);
  return part ? part.asText() : "";
}

function getLastSectionProperties(documentXml, t) {
  const doc = parseXml(documentXml, t("wordformat_error_parse_xml"));
  const sectPrNodes = elementsByLocalName(doc, "sectPr");
  return sectPrNodes.length > 0 ? sectPrNodes[sectPrNodes.length - 1] : null;
}

function summarizePageSetup(sectPr) {
  if (!sectPr) return null;
  const pgSz = firstChildByLocalName(sectPr, "pgSz");
  const pgMar = firstChildByLocalName(sectPr, "pgMar");
  const dxaToCm = (dxa) => {
    const n = Number(dxa);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round((n / 1440) * 2.54 * 10) / 10;
  };
  const width = dxaToCm(getAttr(pgSz, "w"));
  const height = dxaToCm(getAttr(pgSz, "h"));
  const marginTop = dxaToCm(getAttr(pgMar, "top"));
  const marginRight = dxaToCm(getAttr(pgMar, "right"));
  const marginBottom = dxaToCm(getAttr(pgMar, "bottom"));
  const marginLeft = dxaToCm(getAttr(pgMar, "left"));
  return {
    width,
    height,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
  };
}

function readNumberingIds(numberingXml, t) {
  if (!numberingXml) return [];

  const numberingDoc = parseXml(numberingXml, t("wordformat_error_parse_xml"));
  return elementsByLocalName(numberingDoc, "num")
    .map((numNode) => getAttr(numNode, "numId"))
    .filter(Boolean);
}

export async function readTemplateProfile(file, t) {
  const buffer = await file.arrayBuffer();
  const zip = new PizZip(buffer);
  const stylesXml = readZipText(zip, "word/styles.xml");
  const documentXml = readZipText(zip, "word/document.xml");
  const numberingXml = readZipText(zip, "word/numbering.xml");
  const themeXml = readZipText(zip, "word/theme/theme1.xml");

  if (!stylesXml || !documentXml) {
    throw new Error(t("wordformat_error_template_parts"));
  }

  const themeFonts = readThemeFonts(themeXml);
  const profile = readStyleProfile(stylesXml, t, themeFonts);
  const sectionProperties = getLastSectionProperties(documentXml, t);
  const numberingIds = readNumberingIds(numberingXml, t);
  return {
    file,
    zip,
    ...profile,
    numberingIds,
    sectionProperties,
    summary: {
      ...profile.summary,
      pageSetup: summarizePageSetup(sectionProperties),
      numberingCount: numberingIds.length,
    },
  };
}

function ensureContentType(zip, partName, contentType) {
  const contentTypesXml = readZipText(zip, "[Content_Types].xml");
  if (!contentTypesXml || contentTypesXml.includes(`PartName="${partName}"`)) {
    return;
  }

  const override = `<Override PartName="${partName}" ContentType="${contentType}"/>`;
  zip.file("[Content_Types].xml", contentTypesXml.replace("</Types>", `${override}</Types>`));
}

function ensureDocumentRelationship(zip, path) {
  const relationship = DOCUMENT_RELATIONSHIPS[path];
  if (!relationship) return;

  const relsPath = "word/_rels/document.xml.rels";
  const relsXml =
    readZipText(zip, relsPath) ||
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"/>`;
  const relsDoc = parseXml(relsXml, "wordformat_error_parse_xml");
  const relationshipsNode = relsDoc.documentElement;
  const relationshipNodes = Array.from(relationshipsNode?.childNodes || []).filter(
    (node) => node.nodeType === 1 && node.localName === "Relationship"
  );
  const exists = relationshipNodes.some(
    (node) => node.getAttribute("Type") === relationship.type && node.getAttribute("Target") === relationship.target
  );

  if (exists) return;

  const nextId =
    relationshipNodes.reduce((maxId, node) => {
      const match = /^rId(\d+)$/.exec(node.getAttribute("Id") || "");
      return match ? Math.max(maxId, Number(match[1])) : maxId;
    }, 0) + 1;
  const relationshipNode = relsDoc.createElementNS(REL_NS, "Relationship");
  relationshipNode.setAttribute("Id", `rId${nextId}`);
  relationshipNode.setAttribute("Type", relationship.type);
  relationshipNode.setAttribute("Target", relationship.target);
  relationshipsNode.appendChild(relationshipNode);
  zip.file(relsPath, serializeXml(relsDoc));
}

function copyTemplateParts(targetZip, templateProfile, options) {
  STYLE_PARTS.forEach((path) => {
    const sourcePart = templateProfile.zip.file(path);
    if (!sourcePart) return;
    targetZip.file(path, sourcePart.asText());
    const partName = `/${path}`;
    if (CONTENT_TYPES[partName]) {
      ensureContentType(targetZip, partName, CONTENT_TYPES[partName]);
    }
    ensureDocumentRelationship(targetZip, path);
  });

  if (options.applyNumbering && templateProfile.zip.file("word/numbering.xml")) {
    targetZip.file("word/numbering.xml", templateProfile.zip.file("word/numbering.xml").asText());
    ensureContentType(targetZip, "/word/numbering.xml", CONTENT_TYPES["/word/numbering.xml"]);
    ensureDocumentRelationship(targetZip, "word/numbering.xml");
  }
}

function ensureParagraphProperties(paragraph) {
  let pPr = firstChildByLocalName(paragraph, "pPr");
  if (!pPr) {
    pPr = paragraph.ownerDocument.createElementNS(W_NS, "w:pPr");
    paragraph.insertBefore(pPr, paragraph.firstChild);
  }
  return pPr;
}

function ensureTableProperties(table) {
  let tblPr = firstChildByLocalName(table, "tblPr");
  if (!tblPr) {
    tblPr = table.ownerDocument.createElementNS(W_NS, "w:tblPr");
    table.insertBefore(tblPr, table.firstChild);
  }
  return tblPr;
}

function ensureStyleNode(propertiesNode, localName) {
  let styleNode = firstChildByLocalName(propertiesNode, localName);
  if (!styleNode) {
    styleNode = propertiesNode.ownerDocument.createElementNS(W_NS, `w:${localName}`);
    propertiesNode.insertBefore(styleNode, propertiesNode.firstChild);
  }
  return styleNode;
}

function pruneDirectFormatting(propertiesNode, keepChildren) {
  Array.from(propertiesNode.childNodes || []).forEach((child) => {
    if (child.nodeType === 1 && !keepChildren.has(child.localName)) {
      propertiesNode.removeChild(child);
    }
  });
}

function paragraphText(paragraph) {
  return elementsByLocalName(paragraph, "t")
    .map((node) => node.textContent || "")
    .join("");
}

function hasAncestorLocalName(node, localName) {
  let cursor = node?.parentNode;
  while (cursor) {
    if (cursor.nodeType === 1 && cursor.localName === localName) return true;
    cursor = cursor.parentNode;
  }
  return false;
}

function readParagraphRunVisuals(paragraph) {
  return elementsByLocalName(paragraph, "rPr").reduce(
    (visuals, rPr) => {
      const sizeNode = firstChildByLocalName(rPr, "sz");
      const size = Number(getAttr(sizeNode, "val"));
      if (Number.isFinite(size)) {
        visuals.maxSize = Math.max(visuals.maxSize, size);
      }
      visuals.hasBold = visuals.hasBold || Boolean(firstChildByLocalName(rPr, "b") || firstChildByLocalName(rPr, "bCs"));
      visuals.hasItalic = visuals.hasItalic || Boolean(firstChildByLocalName(rPr, "i") || firstChildByLocalName(rPr, "iCs"));
      return visuals;
    },
    { maxSize: 0, hasBold: false, hasItalic: false }
  );
}

function inferParagraphRoleFromContent(paragraph, templateProfile, paragraphState) {
  const text = paragraphText(paragraph).trim();
  if (!text || hasAncestorLocalName(paragraph, "tbl")) return "";

  const normalizedText = normalizeName(text.slice(0, 80));
  if (
    templateProfile.paragraphRoleIds.callout &&
    /^(⚠|提醒|注意|警告|风险|warning|alert|caution|notice)/i.test(normalizedText)
  ) {
    return "callout";
  }
  if (templateProfile.paragraphRoleIds.info && /^(ⓘ|信息|提示|说明|info|note)/i.test(normalizedText)) {
    return "info";
  }

  const visuals = readParagraphRunVisuals(paragraph);
  if (paragraphState.nonTableTextIndex === 0 && templateProfile.paragraphRoleIds.title) {
    const looksLikeTitle =
      visuals.maxSize >= 28 ||
      (visuals.hasBold && text.length <= 120) ||
      /(报告|方案|计划|总结|复盘|模板|合同|report|proposal|plan|summary|review)/i.test(text);
    if (looksLikeTitle) return "title";
  }

  if (
    paragraphState.nonTableTextIndex === 1 &&
    paragraphState.firstParagraphRole === "title" &&
    templateProfile.paragraphRoleIds.subtitle
  ) {
    const looksLikeSubtitle = visuals.hasItalic || visuals.maxSize <= 24 || text.length <= 180;
    if (looksLikeSubtitle) return "subtitle";
  }

  return "";
}

function pruneRunFormattingInParagraph(paragraph, keepChildren) {
  elementsByLocalName(paragraph, "rPr").forEach((rPr) => {
    pruneDirectFormatting(rPr, keepChildren);
  });
}

function findMappedParagraphStyle(sourceStyleId, sourceProfile, templateProfile, options) {
  if (!sourceStyleId) return "";
  const role = sourceProfile.paragraphStyleRoles[sourceStyleId];
  const templateRoleForSameId = templateProfile.paragraphStyleRoles[sourceStyleId] || "";
  if (role && templateProfile.paragraphRoleIds[role]) {
    if (templateProfile.paragraphStyleIds?.has(sourceStyleId) && templateRoleForSameId === role) {
      return sourceStyleId;
    }
    return templateProfile.paragraphRoleIds[role];
  }
  if (templateProfile.paragraphStyleIds?.has(sourceStyleId)) {
    return sourceStyleId;
  }
  return options.normalizeUnknownStyles ? templateProfile.paragraphRoleIds.normal || "" : "";
}

function findMappedParagraphRole(sourceStyleId, sourceProfile, templateProfile) {
  if (!sourceStyleId) return "";
  const role = sourceProfile.paragraphStyleRoles[sourceStyleId] || "";
  if (role && templateProfile.paragraphRoleIds[role]) {
    const templateRoleForSameId = templateProfile.paragraphStyleRoles[sourceStyleId] || "";
    if (!templateProfile.paragraphStyleIds?.has(sourceStyleId) || templateRoleForSameId !== role) {
      return role;
    }
  }
  return "";
}

function findMappedCharacterStyle(sourceStyleId, sourceProfile, templateProfile, options) {
  if (!sourceStyleId) return "";
  if (templateProfile.characterStyleIds?.has(sourceStyleId)) {
    return sourceStyleId;
  }
  const role = sourceProfile.characterStyleRoles[sourceStyleId];
  if (role && templateProfile.characterRoleIds[role]) {
    return templateProfile.characterRoleIds[role];
  }
  return options.normalizeUnknownStyles ? "" : sourceStyleId;
}

function applyParagraphStyles(doc, sourceProfile, templateProfile, options, stats) {
  const paragraphState = { nonTableTextIndex: 0, firstParagraphRole: "" };

  elementsByLocalName(doc, "p").forEach((paragraph) => {
    const text = paragraphText(paragraph).trim();
    const isNonTableText = Boolean(text) && !hasAncestorLocalName(paragraph, "tbl");
    const pPr = firstChildByLocalName(paragraph, "pPr");
    const pStyle = firstChildByLocalName(pPr, "pStyle");
    const sourceStyleId = getAttr(pStyle, "val");
    const mappedStyleId = findMappedParagraphStyle(sourceStyleId, sourceProfile, templateProfile, options);
    let appliedTemplateRole = findMappedParagraphRole(sourceStyleId, sourceProfile, templateProfile);

    if (sourceStyleId && mappedStyleId && mappedStyleId !== sourceStyleId) {
      setWAttr(pStyle, "val", mappedStyleId);
      stats.remappedStyles += 1;
    } else if (sourceStyleId && !mappedStyleId && options.normalizeUnknownStyles) {
      const nextPPr = ensureParagraphProperties(paragraph);
      setWAttr(ensureStyleNode(nextPPr, "pStyle"), "val", templateProfile.paragraphRoleIds.normal || sourceStyleId);
      stats.remappedStyles += 1;
    } else if (!sourceStyleId && options.normalizeUnknownStyles) {
      const inferredRole = inferParagraphRoleFromContent(paragraph, templateProfile, paragraphState);
      const inferredStyleId = inferredRole ? templateProfile.paragraphRoleIds[inferredRole] : "";
      if (inferredStyleId) {
        const nextPPr = ensureParagraphProperties(paragraph);
        setWAttr(ensureStyleNode(nextPPr, "pStyle"), "val", inferredStyleId);
        appliedTemplateRole = inferredRole;
        stats.remappedStyles += 1;
      }
    }

    if (options.clearDirectFormatting) {
      const nextPPr = firstChildByLocalName(paragraph, "pPr");
      if (nextPPr) {
        pruneDirectFormatting(nextPPr, PARAGRAPH_KEEP_CHILDREN);
      }
      if (appliedTemplateRole) {
        pruneRunFormattingInParagraph(paragraph, TEMPLATE_PARAGRAPH_RUN_KEEP_CHILDREN);
      }
    }

    if (isNonTableText) {
      const finalStyle = getAttr(firstChildByLocalName(firstChildByLocalName(paragraph, "pPr"), "pStyle"), "val");
      const finalRole = finalStyle ? templateProfile.paragraphStyleRoles[finalStyle] || appliedTemplateRole : appliedTemplateRole;
      if (paragraphState.nonTableTextIndex === 0) {
        paragraphState.firstParagraphRole = finalRole;
      }
      paragraphState.nonTableTextIndex += 1;
    }
  });
}

function applyRunStyles(doc, sourceProfile, templateProfile, options, stats) {
  elementsByLocalName(doc, "r").forEach((run) => {
    const rPr = firstChildByLocalName(run, "rPr");
    const rStyle = firstChildByLocalName(rPr, "rStyle");
    const sourceStyleId = getAttr(rStyle, "val");
    const mappedStyleId = findMappedCharacterStyle(sourceStyleId, sourceProfile, templateProfile, options);

    if (sourceStyleId && mappedStyleId && mappedStyleId !== sourceStyleId) {
      setWAttr(rStyle, "val", mappedStyleId);
      stats.remappedStyles += 1;
    } else if (sourceStyleId && !mappedStyleId && rStyle && rStyle.parentNode) {
      rStyle.parentNode.removeChild(rStyle);
      stats.remappedStyles += 1;
    }

    if (options.clearDirectFormatting && rPr) {
      pruneDirectFormatting(rPr, RUN_KEEP_CHILDREN);
    }
  });
}

function applyTableStyles(doc, templateProfile, options, stats) {
  if (!options.normalizeUnknownStyles) return;

  elementsByLocalName(doc, "tbl").forEach((table) => {
    const tblPr = firstChildByLocalName(table, "tblPr");
    const tblStyle = firstChildByLocalName(tblPr, "tblStyle");
    const styleId = getAttr(tblStyle, "val");
    if (templateProfile.preferredTableStyleId) {
      if (styleId !== templateProfile.preferredTableStyleId) {
        const nextTblPr = ensureTableProperties(table);
        const nextTblStyle = tblStyle || ensureStyleNode(nextTblPr, "tblStyle");
        setWAttr(nextTblStyle, "val", templateProfile.preferredTableStyleId);
        stats.remappedStyles += 1;
      }
    } else if (styleId && !templateProfile.tableStyleIds?.has(styleId)) {
      if (tblStyle?.parentNode) {
        tblStyle.parentNode.removeChild(tblStyle);
        stats.remappedStyles += 1;
      }
    }
  });
}

function nextElementSibling(node) {
  let cursor = node?.nextSibling;
  while (cursor && cursor.nodeType !== 1) {
    cursor = cursor.nextSibling;
  }
  return cursor;
}

function repairTables(doc) {
  elementsByLocalName(doc, "tbl").forEach((tbl) => {
    if (!firstChildByLocalName(tbl, "tblGrid")) {
      const firstRow = firstChildByLocalName(tbl, "tr");
      const cellCount = firstRow ? childrenByLocalName(firstRow, "tc").length || 1 : 1;
      const tblGrid = doc.createElementNS(W_NS, "w:tblGrid");
      for (let i = 0; i < cellCount; i += 1) {
        const gridCol = doc.createElementNS(W_NS, "w:gridCol");
        gridCol.setAttribute("w:w", "2400");
        tblGrid.appendChild(gridCol);
      }
      const tblPr = firstChildByLocalName(tbl, "tblPr");
      tbl.insertBefore(tblGrid, tblPr ? tblPr.nextSibling : tbl.firstChild);
    }

    const next = nextElementSibling(tbl);
    const needsFiller = !next || (next.localName !== "p" && next.localName !== "sectPr");
    if (needsFiller) {
      const filler = doc.createElementNS(W_NS, "w:p");
      tbl.parentNode.insertBefore(filler, tbl.nextSibling);
    }
  });
}

function applyTemplateNumbering(doc, templateProfile, options, stats) {
  if (!options.applyNumbering || templateProfile.numberingIds.length === 0) {
    return;
  }

  const numIdNodes = elementsByLocalName(doc, "numId");
  const usedNumIds = [];

  numIdNodes.forEach((numIdNode) => {
    const sourceNumId = getAttr(numIdNode, "val");
    if (sourceNumId && !usedNumIds.includes(sourceNumId)) {
      usedNumIds.push(sourceNumId);
    }
  });

  const numIdMap = usedNumIds.reduce((map, sourceNumId, index) => {
    map[sourceNumId] = templateProfile.numberingIds[Math.min(index, templateProfile.numberingIds.length - 1)];
    return map;
  }, {});

  numIdNodes.forEach((numIdNode) => {
    const sourceNumId = getAttr(numIdNode, "val");
    const templateNumId = numIdMap[sourceNumId];
    if (templateNumId && templateNumId !== sourceNumId) {
      setWAttr(numIdNode, "val", templateNumId);
      stats.remappedNumbering += 1;
    }
  });
}

function applyPageSetup(doc, templateProfile) {
  if (!templateProfile.sectionProperties) return false;

  const sectPrNodes = elementsByLocalName(doc, "sectPr");
  let targetSectPr = sectPrNodes[sectPrNodes.length - 1];
  const body = elementsByLocalName(doc, "body")[0];

  if (!targetSectPr && body) {
    targetSectPr = doc.createElementNS(W_NS, "w:sectPr");
    body.appendChild(targetSectPr);
  }

  if (!targetSectPr) return false;

  Array.from(targetSectPr.childNodes || []).forEach((child) => {
    if (child.nodeType === 1 && SECTION_FORMAT_CHILDREN.has(child.localName)) {
      targetSectPr.removeChild(child);
    }
  });

  Array.from(templateProfile.sectionProperties.childNodes || []).forEach((child) => {
    if (child.nodeType === 1 && SECTION_FORMAT_CHILDREN.has(child.localName)) {
      targetSectPr.appendChild(doc.importNode(child, true));
    }
  });

  return true;
}

const XML_DECLARATION = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;

function serializeXml(doc) {
  const body = new XMLSerializer().serializeToString(doc);
  return body.startsWith("<?xml") ? body : `${XML_DECLARATION}\n${body}`;
}

function applyDocumentFormatting(documentXml, sourceProfile, templateProfile, options, t) {
  const doc = parseXml(documentXml, t("wordformat_error_parse_xml"));
  const stats = {
    remappedStyles: 0,
    remappedNumbering: 0,
    pageSetupApplied: false,
  };

  applyParagraphStyles(doc, sourceProfile, templateProfile, options, stats);
  applyRunStyles(doc, sourceProfile, templateProfile, options, stats);
  applyTableStyles(doc, templateProfile, options, stats);
  applyTemplateNumbering(doc, templateProfile, options, stats);
  repairTables(doc);

  if (options.applyPageSetup) {
    stats.pageSetupApplied = applyPageSetup(doc, templateProfile);
  }

  return {
    xml: serializeXml(doc),
    stats,
  };
}

export async function formatWordFile(file, templateProfile, options, t) {
  const buffer = await file.arrayBuffer();
  const zip = new PizZip(buffer);
  const stylesXml = readZipText(zip, "word/styles.xml");
  const documentXml = readZipText(zip, "word/document.xml");

  if (!documentXml) {
    throw new Error(t("wordformat_error_document_xml"));
  }

  const sourceProfile = stylesXml
    ? readStyleProfile(stylesXml, t)
    : {
        existingStyleIds: new Set(),
        paragraphStyleIds: new Set(),
        characterStyleIds: new Set(),
        tableStyleIds: new Set(),
        paragraphStylesById: {},
        characterStylesById: {},
        tableStylesById: {},
        preferredTableStyleId: "",
        paragraphRoleIds: {},
        characterRoleIds: {},
        paragraphStyleRoles: {},
        characterStyleRoles: {},
      };

  const formatted = applyDocumentFormatting(documentXml, sourceProfile, templateProfile, options, t);
  copyTemplateParts(zip, templateProfile, options);
  zip.file("word/document.xml", formatted.xml);

  const blob = zip.generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
  const baseName = sanitizeFileName(file.name.replace(/\.docx$/i, ""));

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceName: file.name,
    fileName: `${baseName}_formatted.docx`,
    size: blob.size,
    blob,
    stats: formatted.stats,
    status: "success",
  };
}

export default function WordFormatContent() {
  const { t } = useI18n();
  const [templateProfile, setTemplateProfile] = useState(null);
  const [targetFiles, setTargetFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sampleLoading, setSampleLoading] = useState("");
  const [options, setOptions] = useState({
    clearDirectFormatting: true,
    normalizeUnknownStyles: true,
    applyPageSetup: true,
    applyNumbering: true,
  });

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleTemplateUpload = async (file) => {
    if (!isDocxFile(file)) {
      showModal(t("wordformat_error_invalid_template"), "error");
      return;
    }

    setIsProcessing(true);
    try {
      const profile = await readTemplateProfile(file, t);
      setTemplateProfile(profile);
      setResults([]);
    } catch (error) {
      console.error("Template read failed:", error);
      showModal(error.message || t("wordformat_error_read_template"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSampleTemplate = async () => {
    setSampleLoading("template");
    try {
      const file = await loadSampleDocx(SAMPLE_TEMPLATE_FILE, t("wordformat_error_sample_load"));
      await handleTemplateUpload(file);
    } catch (error) {
      console.error("Sample template load failed:", error);
      showModal(error.message || t("wordformat_error_sample_load"), "error");
    } finally {
      setSampleLoading("");
    }
  };

  const handleTargetUpload = (files) => {
    const incomingFiles = Array.isArray(files) ? files : [files];
    const errors = [];
    const validFiles = [];

    incomingFiles.forEach((file) => {
      if (!isDocxFile(file)) {
        errors.push(`${file.name}: ${t("wordformat_error_invalid_target")}`);
        return;
      }
      if (targetFiles.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("wordformat_error_duplicate")}`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      showModal(errors.join("\n"), "error");
    }
    if (validFiles.length > 0) {
      setTargetFiles((current) => [...current, ...validFiles]);
      setResults([]);
    }
  };

  const loadSampleTarget = async () => {
    setSampleLoading("target");
    try {
      const file = await loadSampleDocx(SAMPLE_TARGET_FILE, t("wordformat_error_sample_load"));
      handleTargetUpload([file]);
    } catch (error) {
      console.error("Sample target load failed:", error);
      showModal(error.message || t("wordformat_error_sample_load"), "error");
    } finally {
      setSampleLoading("");
    }
  };

  const removeTargetFile = (index) => {
    setTargetFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setResults([]);
  };

  const clearAll = () => {
    setTemplateProfile(null);
    setTargetFiles([]);
    setResults([]);
  };

  const updateOption = (key) => {
    setOptions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const processFiles = async () => {
    if (!templateProfile) {
      showModal(t("wordformat_error_no_template"), "error");
      return;
    }
    if (targetFiles.length === 0) {
      showModal(t("wordformat_error_no_targets"), "error");
      return;
    }

    setIsProcessing(true);
    const nextResults = [];

    try {
      for (const file of targetFiles) {
        try {
          nextResults.push(await formatWordFile(file, templateProfile, options, t));
        } catch (error) {
          console.error("Word format failed:", file.name, error);
          nextResults.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            sourceName: file.name,
            fileName: file.name,
            size: 0,
            blob: null,
            status: "failed",
            error: error.message || t("wordformat_error_format_failed"),
            stats: { remappedStyles: 0, pageSetupApplied: false },
          });
        }
      }

      setResults(nextResults);
      const successCount = nextResults.filter((result) => result.status === "success").length;
      showModal(t("wordformat_success", { count: successCount }), successCount > 0 ? "success" : "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = (result) => {
    if (!result.blob) return;
    saveAs(result.blob, result.fileName);
  };

  const downloadZip = async () => {
    const successfulResults = results.filter((result) => result.status === "success" && result.blob);
    if (successfulResults.length === 0) {
      showModal(t("wordformat_error_no_results"), "error");
      return;
    }

    const zip = new PizZip();
    for (const result of successfulResults) {
      zip.file(result.fileName, await result.blob.arrayBuffer());
    }

    const blob = zip.generate({ type: "blob", compression: "DEFLATE" });
    saveAs(blob, "formatted_word_files.zip");
  };

  const canProcess = Boolean(templateProfile && targetFiles.length > 0 && !isProcessing);
  const successfulResults = results.filter((result) => result.status === "success");
  const getStyleRuleChips = (style) => {
    const chips = [];
    const font = [style.fontEastAsia, style.fontLatin].filter(Boolean).join(" / ");
    if (style.role) chips.push(`${t("wordformat_rule_role")}: ${style.role}`);
    if (font) chips.push(`${t("wordformat_rule_font")}: ${font}`);
    if (style.size) chips.push(`${t("wordformat_rule_size")}: ${style.size}`);
    if (style.color) chips.push(`${t("wordformat_rule_color")}: #${style.color}`);
    if (style.bold) chips.push(t("wordformat_rule_bold"));
    if (style.italic) chips.push(t("wordformat_rule_italic"));

    const spacing = [
      style.spacingBefore ? `${t("wordformat_rule_before")} ${style.spacingBefore}` : "",
      style.spacingAfter ? `${t("wordformat_rule_after")} ${style.spacingAfter}` : "",
      style.lineSpacing ? `${t("wordformat_rule_line")} ${style.lineSpacing}` : "",
    ].filter(Boolean);
    if (spacing.length > 0) chips.push(`${t("wordformat_rule_spacing")}: ${spacing.join(" / ")}`);

    const indent = [
      style.indentLeft ? `${t("wordformat_rule_left")} ${style.indentLeft}` : "",
      style.indentRight ? `${t("wordformat_rule_right")} ${style.indentRight}` : "",
      style.hangingIndent ? `${t("wordformat_rule_hanging")} ${style.hangingIndent}` : "",
    ].filter(Boolean);
    if (indent.length > 0) chips.push(`${t("wordformat_rule_indent")}: ${indent.join(" / ")}`);
    return chips;
  };
  const renderStyleRule = (style) => {
    const chips = getStyleRuleChips(style);
    return (
      <li key={style.styleId} className="rounded border border-gray-100 bg-white px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-gray-700" title={style.styleId}>{style.name || style.styleId}</span>
          <span className="shrink-0 font-mono text-[10px] text-gray-400">{style.styleId}</span>
        </div>
        {chips.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {chips.map((chip) => (
              <span key={chip} className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] leading-4 text-gray-500">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6 px-4">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                  <h2 className="truncate text-base font-semibold text-gray-950">{t("wordformat_template_title")}</h2>
                </div>
                {templateProfile && <span className="shrink-0 text-xs text-blue-600">{t("wordformat_status_success")}</span>}
              </div>
              <div className="mt-3">
                <FileUploadBox
                  key={templateProfile ? templateProfile.file.name : "empty-template"}
                  accept=".docx"
                  onChange={handleTemplateUpload}
                  title={t("wordformat_template_upload")}
                  maxSize={80}
                  className={templateProfile ? "min-h-24" : "min-h-48"}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={loadSampleTemplate}
                  disabled={isProcessing || Boolean(sampleLoading)}
                  className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {sampleLoading === "template" ? t("wordformat_sample_loading") : t("wordformat_sample_template")}
                </button>
                <span className="text-xs leading-5 text-gray-500">{t("wordformat_sample_template_desc")}</span>
              </div>

              {templateProfile ? (
                <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
                  <p className="truncate text-sm font-medium text-gray-950" title={templateProfile.file.name}>
                    {templateProfile.file.name}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <span>{t("wordformat_summary_paragraphs", { count: templateProfile.summary.paragraphCount })}</span>
                    <span>{t("wordformat_summary_characters", { count: templateProfile.summary.characterCount })}</span>
                    <span>{t("wordformat_summary_tables", { count: templateProfile.summary.tableCount })}</span>
                    <span>{t("wordformat_summary_headings", { count: templateProfile.summary.headingCount })}</span>
                    <span>{t("wordformat_summary_numbering", { count: templateProfile.summary.numberingCount || 0 })}</span>
                    {templateProfile.summary.pageSetup?.width && templateProfile.summary.pageSetup?.height ? (
                      <span>
                        {t("wordformat_summary_page_size", {
                          width: templateProfile.summary.pageSetup.width,
                          height: templateProfile.summary.pageSetup.height,
                        })}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-xs text-gray-500">
                    {t("wordformat_summary_font", {
                      font:
                        [templateProfile.summary.defaultFont.eastAsia, templateProfile.summary.defaultFont.latin]
                          .filter(Boolean)
                          .join(" / ") || t("wordformat_unknown"),
                    })}
                  </p>
                  {templateProfile.summary.pageSetup ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {t("wordformat_summary_margins", {
                        top: templateProfile.summary.pageSetup.marginTop ?? "?",
                        right: templateProfile.summary.pageSetup.marginRight ?? "?",
                        bottom: templateProfile.summary.pageSetup.marginBottom ?? "?",
                        left: templateProfile.summary.pageSetup.marginLeft ?? "?",
                      })}
                    </p>
                  ) : null}

                  {Object.keys(templateProfile.summary.headingSamples || {}).length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-gray-700">{t("wordformat_section_headings")}</p>
                      <div className="space-y-1">
                        {["heading1", "heading2", "heading3", "heading4", "heading5", "heading6"]
                          .map((role) => templateProfile.summary.headingSamples[role])
                          .filter(Boolean)
                          .map((sample) => {
                            const sampleStyle = {
                              color: sample.color ? `#${sample.color}` : undefined,
                              fontSize: sample.size || undefined,
                              fontWeight: sample.bold ? 700 : undefined,
                              fontStyle: sample.italic ? "italic" : undefined,
                            };
                            return (
                              <div
                                key={sample.styleId}
                                className="flex items-baseline justify-between gap-2 rounded bg-white px-2 py-1.5 text-xs"
                              >
                                <span className="truncate text-gray-500" title={sample.styleId}>
                                  {sample.name || sample.styleId}
                                </span>
                                <span className="truncate text-right" style={sampleStyle} title={sample.size || ""}>
                                  {t("wordformat_heading_sample_text")}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : null}

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-blue-600">
                      {t("wordformat_section_paragraph_styles", { count: templateProfile.paragraphStyles.length })}
                    </summary>
                    <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded border border-gray-200 bg-white p-2 text-xs text-gray-600">
                      {templateProfile.paragraphStyles.map(renderStyleRule)}
                    </ul>
                  </details>

                  {templateProfile.characterStyles.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-blue-600">
                        {t("wordformat_section_character_styles", { count: templateProfile.characterStyles.length })}
                      </summary>
                      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded border border-gray-200 bg-white p-2 text-xs text-gray-600">
                        {templateProfile.characterStyles.map(renderStyleRule)}
                      </ul>
                    </details>
                  ) : null}

                  {templateProfile.tableStyles.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-blue-600">
                        {t("wordformat_section_table_styles", { count: templateProfile.tableStyles.length })}
                      </summary>
                      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded border border-gray-200 bg-white p-2 text-xs text-gray-600">
                        {templateProfile.tableStyles.map((style) => (
                          <li key={style.styleId} className="rounded border border-gray-100 bg-white px-2 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium text-gray-700" title={style.styleId}>{style.name || style.styleId}</span>
                              <span className="shrink-0 font-mono text-[10px] text-gray-400">{style.styleId}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-gray-500">{t("wordformat_template_empty")}</p>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Layers className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                  <h2 className="truncate text-base font-semibold text-gray-950">{t("wordformat_targets_title")}</h2>
                </div>
                {targetFiles.length > 0 && <span className="shrink-0 text-xs text-gray-500">{targetFiles.length}</span>}
              </div>
              <div className="mt-3">
                <FileUploadBox
                  key={targetFiles.length > 0 ? targetFiles.map((file) => `${file.name}-${file.size}`).join("|") : "empty-targets"}
                  accept=".docx"
                  onChange={handleTargetUpload}
                  title={t("wordformat_targets_upload")}
                  maxSize={80}
                  multiple
                  className={targetFiles.length > 0 ? "min-h-24" : "min-h-48"}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={loadSampleTarget}
                  disabled={isProcessing || Boolean(sampleLoading)}
                  className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  {sampleLoading === "target" ? t("wordformat_sample_loading") : t("wordformat_sample_target")}
                </button>
                <span className="text-xs leading-5 text-gray-500">{t("wordformat_sample_target_desc")}</span>
              </div>

              <div className="mt-3">
                {targetFiles.length > 0 ? (
                  <div className="max-h-72 divide-y divide-gray-100 overflow-auto rounded border border-gray-200">
                    {targetFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-950" title={file.name}>{file.name}</p>
                          <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTargetFile(index)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-red-50 hover:text-red-600"
                          title={t("wordformat_remove")}
                          aria-label={t("wordformat_remove")}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-gray-500">{t("wordformat_targets_empty")}</p>
                )}
              </div>
            </section>
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-gray-950">{t("wordformat_options_title")}</h2>
            </div>
            <div className="mt-5 space-y-4 text-sm text-gray-700">
              {[
                ["clearDirectFormatting", "wordformat_option_clear_direct", "wordformat_option_clear_direct_desc"],
                ["normalizeUnknownStyles", "wordformat_option_normalize", "wordformat_option_normalize_desc"],
                ["applyPageSetup", "wordformat_option_page", "wordformat_option_page_desc"],
                ["applyNumbering", "wordformat_option_numbering", "wordformat_option_numbering_desc"],
              ].map(([key, labelKey, descKey]) => (
                <label key={key} className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={() => updateOption(key)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block font-medium text-gray-950">{t(labelKey)}</span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">{t(descKey)}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={processFiles}
                disabled={!canProcess}
                className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                {isProcessing ? t("wordformat_processing") : t("wordformat_process", { count: targetFiles.length })}
              </button>
              {successfulResults.length > 0 && (
                <button
                  type="button"
                  onClick={downloadZip}
                  className="inline-flex items-center justify-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("wordformat_download_zip")}
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                disabled={!templateProfile && targetFiles.length === 0 && results.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t("wordformat_clear")}
              </button>
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-500">{t("wordformat_feature_4")}</p>
          </section>
        </aside>
      </section>

      {results.length > 0 && (
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{t("wordformat_results_title")}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">{t("wordformat_result_source")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">{t("wordformat_result_status")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">{t("wordformat_result_details")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">{t("wordformat_result_action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {results.map((result) => (
                  <tr key={result.id}>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-900">{result.sourceName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          result.status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {result.status === "success" ? t("wordformat_status_success") : t("wordformat_status_failed")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {result.status === "success"
                        ? t("wordformat_result_stats", {
                            count: result.stats.remappedStyles,
                            size: formatBytes(result.size),
                          })
                        : result.error}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {result.status === "success" && (
                        <button
                          type="button"
                          onClick={() => downloadResult(result)}
                          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("wordformat_download")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className={modalType === "error" ? "text-red-700" : modalType === "success" ? "text-green-700" : "text-gray-700"}>
          {modalMessage}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("wordformat_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
