import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "../public/files");

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const sharedRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

const sharedSettings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${W_NS}"><w:defaultTabStop w:val="420"/><w:characterSpacingControl w:val="doNotCompress"/></w:settings>`;

const sharedFontTable = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="${W_NS}">
  <w:font w:name="Aptos"/><w:font w:name="Aptos Display"/>
  <w:font w:name="Microsoft YaHei"/><w:font w:name="Source Han Sans CN"/>
  <w:font w:name="Times New Roman"/><w:font w:name="SimSun"/>
  <w:font w:name="Calibri"/><w:font w:name="Cambria"/>
</w:fonts>`;

function buildContentTypes(extra = {}) {
  const overrides = [
    ['/word/document.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'],
    ['/word/styles.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml'],
    ['/word/fontTable.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml'],
    ['/word/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml'],
    ['/word/settings.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml'],
    ['/word/numbering.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml'],
    ...Object.entries(extra),
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${overrides.map(([part, ct]) => `<Override PartName="${part}" ContentType="${ct}"/>`).join("\n  ")}
</Types>`;
}

function buildTheme({ majorLatin, majorEastAsia, minorLatin, minorEastAsia, name }) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${name}">
  <a:themeElements>
    <a:fontScheme name="${name}">
      <a:majorFont>
        <a:latin typeface="${majorLatin}"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
        <a:font script="Hans" typeface="${majorEastAsia}"/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="${minorLatin}"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
        <a:font script="Hans" typeface="${minorEastAsia}"/>
      </a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`;
}

const templateTheme = buildTheme({
  name: "company-template",
  majorLatin: "Aptos Display",
  majorEastAsia: "Microsoft YaHei",
  minorLatin: "Aptos",
  minorEastAsia: "Microsoft YaHei",
});

const sourceTheme = buildTheme({
  name: "legacy-source",
  majorLatin: "Times New Roman",
  majorEastAsia: "SimSun",
  minorLatin: "Times New Roman",
  minorEastAsia: "SimSun",
});

const templateStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W_NS}">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Microsoft YaHei" w:cs="Aptos"/>
      <w:color w:val="111827"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/><w:qFormat/>
    <w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Microsoft YaHei"/><w:color w:val="111827"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="0F172A"/><w:sz w:val="56"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:before="0" w:after="320"/></w:pPr>
    <w:rPr><w:color w:val="64748B"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:before="360" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="2563EB"/><w:sz w:val="40"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="0F172A"/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="334155"/><w:sz w:val="26"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:before="160" w:after="60"/><w:outlineLvl w:val="3"/></w:pPr>
    <w:rPr><w:b/><w:i/><w:color w:val="475569"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:ind w:left="600" w:right="600"/><w:spacing w:before="120" w:after="120"/></w:pPr>
    <w:rPr><w:i/><w:color w:val="475569"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="IntenseQuote">
    <w:name w:val="Intense Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="2563EB"/></w:pBdr><w:ind w:left="600"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="1E3A8A"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TemplateCallout">
    <w:name w:val="Template Callout"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:space="6" w:color="F59E0B"/><w:left w:val="single" w:sz="6" w:space="6" w:color="F59E0B"/><w:bottom w:val="single" w:sz="6" w:space="6" w:color="F59E0B"/><w:right w:val="single" w:sz="6" w:space="6" w:color="F59E0B"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/><w:ind w:left="120" w:right="120"/><w:spacing w:before="120" w:after="120"/></w:pPr>
    <w:rPr><w:color w:val="92400E"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TemplateInfoBox">
    <w:name w:val="Template Info Box"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/><w:ind w:left="120" w:right="120"/><w:spacing w:before="120" w:after="120"/></w:pPr>
    <w:rPr><w:color w:val="1E40AF"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TemplateNote">
    <w:name w:val="Template Note"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:rPr><w:color w:val="6B7280"/><w:sz w:val="20"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:qFormat/>
    <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="80"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListNumber">
    <w:name w:val="List Number"/><w:basedOn w:val="Normal"/><w:qFormat/>
    <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="80"/></w:pPr>
  </w:style>
  <w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:semiHidden/></w:style>
  <w:style w:type="character" w:styleId="Strong">
    <w:name w:val="Strong"/><w:qFormat/>
    <w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="Emphasis">
    <w:name w:val="Emphasis"/><w:qFormat/>
    <w:rPr><w:i/><w:color w:val="2563EB"/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr><w:color w:val="2563EB"/><w:u w:val="single"/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="TemplateInlineCode">
    <w:name w:val="Template Inline Code"/><w:qFormat/>
    <w:rPr><w:rFonts w:ascii="Cascadia Mono" w:hAnsi="Cascadia Mono"/><w:color w:val="9333EA"/><w:shd w:val="clear" w:color="auto" w:fill="F3E8FF"/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="TemplateBadge">
    <w:name w:val="Template Badge"/><w:qFormat/>
    <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:shd w:val="clear" w:color="auto" w:fill="2563EB"/></w:rPr>
  </w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableNormal">
    <w:name w:val="Normal Table"/>
    <w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr>
  </w:style>
  <w:style w:type="table" w:styleId="TemplateGrid">
    <w:name w:val="Template Grid"/><w:basedOn w:val="TableNormal"/>
    <w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5F5"/><w:left w:val="single" w:sz="4" w:color="CBD5F5"/><w:bottom w:val="single" w:sz="4" w:color="CBD5F5"/><w:right w:val="single" w:sz="4" w:color="CBD5F5"/><w:insideH w:val="single" w:sz="4" w:color="CBD5F5"/><w:insideV w:val="single" w:sz="4" w:color="CBD5F5"/></w:tblBorders></w:tblPr>
    <w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="2563EB"/></w:tcPr></w:tblStylePr>
  </w:style>
  <w:style w:type="table" w:styleId="LightShading-Accent2">
    <w:name w:val="Light Shading Accent 2"/><w:basedOn w:val="TableNormal"/>
    <w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="C45911"/><w:bottom w:val="single" w:sz="4" w:color="C45911"/></w:tblBorders></w:tblPr>
    <w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:color w:val="C45911"/></w:rPr></w:tblStylePr>
  </w:style>
</w:styles>`;

const templateNumbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${W_NS}">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="●"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="420" w:hanging="420"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:color w:val="2563EB"/></w:rPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="420" w:hanging="420"/></w:pPr><w:rPr><w:b/><w:color w:val="2563EB"/></w:rPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

function rPr(parts = []) {
  return parts.length ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
}
function pPr(parts = []) {
  return parts.length ? `<w:pPr>${parts.join("")}</w:pPr>` : "";
}
function paragraph({ pPrXml = "", runs }) {
  return `<w:p>${pPrXml}${runs.join("")}</w:p>`;
}
function run({ rPrXml = "", text }) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<w:r>${rPrXml}<w:t xml:space="preserve">${escaped}</w:t></w:r>`;
}
function tableCell(text, width = 2400) {
  return `<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${width}"/></w:tcPr><w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:tc>`;
}
function tableRow(cells) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

const templateBody = [
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Title"/>']), runs: [run({ text: "企业项目报告模板" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Subtitle"/>']), runs: [run({ text: "用于统一标题、正文、链接、列表、表格和页面边距的 Word 格式模板" })] }),

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading1"/>']), runs: [run({ text: "一、概览" })] }),
  paragraph({ runs: [run({ text: "正文使用 Aptos / 微软雅黑 字体，字号 11pt，行距 1.6 倍，行间距与段后距保持一致。" })] }),

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="TemplateInfoBox"/>']), runs: [run({ text: "ⓘ 信息提示框：模板里所有 TemplateInfoBox 段落都会渲染成浅蓝色底色与深蓝文字。" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="TemplateCallout"/>']), runs: [run({ text: "⚠ 注意事项框：TemplateCallout 段落带橙色边框与浅黄底色，用于风险提示。" })] }),

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading2"/>']), runs: [run({ text: "1.1 关键样式与字符元素" })] }),
  paragraph({
    runs: [
      run({ text: "正文中可使用 " }),
      run({ rPrXml: rPr(['<w:rStyle w:val="Strong"/>']), text: "Strong" }),
      run({ text: "、" }),
      run({ rPrXml: rPr(['<w:rStyle w:val="Emphasis"/>']), text: "Emphasis" }),
      run({ text: "、" }),
      run({ rPrXml: rPr(['<w:rStyle w:val="TemplateInlineCode"/>']), text: "InlineCode" }),
      run({ text: "、" }),
      run({ rPrXml: rPr(['<w:rStyle w:val="TemplateBadge"/>']), text: " Badge " }),
      run({ text: " 字符样式来突出重点。" }),
    ],
  }),

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading2"/>']), runs: [run({ text: "1.2 标题层级示例" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading3"/>']), runs: [run({ text: "三级标题：阶段性结论" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading4"/>']), runs: [run({ text: "四级标题：具体动作" })] }),

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading1"/>']), runs: [run({ text: "二、列表与编号" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="ListBullet"/>']), runs: [run({ text: "项目目标：模板可被批量套用" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="ListBullet"/>']), runs: [run({ text: "样式覆盖：标题/正文/列表/表格/页面" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="ListBullet"/>']), runs: [run({ text: "保留语义：链接、加粗、斜体不被抹掉" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="ListNumber"/>']), runs: [run({ text: "上传模板 .docx 文件" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="ListNumber"/>']), runs: [run({ text: "上传待格式化文件" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="ListNumber"/>']), runs: [run({ text: "下载格式化结果" })] }),

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading1"/>']), runs: [run({ text: "三、表格" })] }),
  `<w:tbl><w:tblPr><w:tblStyle w:val="TemplateGrid"/><w:tblW w:type="auto" w:w="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/></w:tblGrid>${tableRow([tableCell("阶段"), tableCell("交付物"), tableCell("负责人")])}${tableRow([tableCell("立项"), tableCell("方案文档"), tableCell("产品经理")])}${tableRow([tableCell("评审"), tableCell("评审纪要"), tableCell("项目经理")])}${tableRow([tableCell("上线"), tableCell("发布报告"), tableCell("研发团队")])}</w:tbl>`,
  paragraph({ runs: [run({ text: " " })] }),

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading1"/>']), runs: [run({ text: "四、引用样式" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Quote"/>']), runs: [run({ text: '"模板的目的是减少协作中的格式分歧，而不是限制内容。"' })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="IntenseQuote"/>']), runs: [run({ text: "强调引用：所有上线材料必须经过双人复核。" })] }),
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="TemplateNote"/>']), runs: [run({ text: "备注：本模板仅作为格式样板，正文请按实际项目内容调整。" })] }),
];

const templateDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}">
  <w:body>
    ${templateBody.join("\n    ")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

// SOURCE: realistic, "messy" document with mixed direct formatting,
// uses standard heading IDs (Heading1/Heading2) plus chaotic direct overrides,
// raw direct-styled headings (no pStyle), unknown table style, foreign list numId.

const sourceStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W_NS}">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="SimSun"/><w:sz w:val="21"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="100"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="SimSun"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="2E74B5"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="LegacyAlertBox"><w:name w:val="Legacy Alert"/></w:style>
  <w:style w:type="paragraph" w:styleId="IntenseQuote"><w:name w:val="Intense Quote"/></w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/></w:style>
  <w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0000EE"/><w:u w:val="single"/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="MysteryEmphasis"><w:name w:val="Mystery Emphasis"/><w:rPr><w:color w:val="DC2626"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="LightShading-Accent2"><w:name w:val="Light Shading Accent 2"/></w:style>
  <w:style w:type="table" w:styleId="UnknownVendorTable"><w:name w:val="Unknown Vendor Table"/></w:style>
</w:styles>`;

const sourceNumbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${W_NS}">
  <w:abstractNum w:abstractNumId="9"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="420" w:hanging="420"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="7"><w:abstractNumId w:val="9"/></w:num>
</w:numbering>`;

const sourceBody = [
  // BIG no-pStyle direct-formatted "title" paragraph — common real-world pattern
  paragraph({
    pPrXml: pPr(['<w:spacing w:before="0" w:after="320"/>']),
    runs: [run({
      rPrXml: rPr(['<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="SimSun"/>', '<w:b/>', '<w:color w:val="DC2626"/>', '<w:sz w:val="36"/>']),
      text: "Q3 智能客服项目复盘报告",
    })],
  }),
  paragraph({
    runs: [run({
      rPrXml: rPr(['<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="SimSun"/>', '<w:i/>', '<w:color w:val="6B7280"/>', '<w:sz w:val="20"/>']),
      text: "本文档来自不同团队协作编辑，存在标题颜色、字体、表格和列表样式不统一的问题。",
    })],
  }),

  // pStyle-based heading (template has Heading1; preserved by id)
  paragraph({ pPrXml: pPr(['<w:pStyle w:val="Heading1"/>']), runs: [run({ text: "一、项目背景" })] }),
  paragraph({
    runs: [run({
      rPrXml: rPr(['<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/>', '<w:sz w:val="24"/>', '<w:color w:val="1F2937"/>']),
      text: "项目从 4 月启动，目标是把客服首响时间压缩到 30 秒以内，并把转人工率降低 15%。",
    })],
  }),
  paragraph({
    runs: [
      run({ text: "参考链接：" }),
      run({ rPrXml: rPr(['<w:rStyle w:val="Hyperlink"/>', '<w:color w:val="16A34A"/>']), text: "https://example.com/q3-project-dashboard" }),
    ],
  }),

  // Heading2 with extra direct font/color overrides — to be cleaned
  paragraph({
    pPrXml: pPr(['<w:pStyle w:val="Heading2"/>', '<w:spacing w:before="999" w:after="999"/>']),
    runs: [run({
      rPrXml: rPr(['<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/>', '<w:color w:val="7C2D12"/>', '<w:sz w:val="36"/>']),
      text: "1.1 项目进展",
    })],
  }),

  // List bullets via standard ListBullet style with foreign numId
  paragraph({
    pPrXml: pPr(['<w:pStyle w:val="ListBullet"/>', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr>']),
    runs: [run({ rPrXml: rPr(['<w:rFonts w:ascii="Times New Roman" w:eastAsia="SimSun"/>', '<w:sz w:val="20"/>']), text: "完成 12 个高频业务场景梳理" })],
  }),
  paragraph({
    pPrXml: pPr(['<w:pStyle w:val="ListBullet"/>', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr>']),
    runs: [run({ rPrXml: rPr(['<w:rFonts w:ascii="Times New Roman" w:eastAsia="SimSun"/>', '<w:sz w:val="20"/>']), text: "灰度覆盖 3 条客服队列" })],
  }),
  paragraph({
    pPrXml: pPr(['<w:pStyle w:val="ListBullet"/>', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr>']),
    runs: [
      run({ rPrXml: rPr(['<w:rFonts w:ascii="Times New Roman" w:eastAsia="SimSun"/>', '<w:sz w:val="20"/>']), text: "待补充离线评测样本和 " }),
      run({ rPrXml: rPr(['<w:rStyle w:val="MysteryEmphasis"/>']), text: "知识库回流机制" }),
      run({ rPrXml: rPr(['<w:rFonts w:ascii="Times New Roman" w:eastAsia="SimSun"/>', '<w:sz w:val="20"/>']), text: "（红色字体来自未知字符样式）" }),
    ],
  }),

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="LegacyAlertBox"/>']),
    runs: [run({
      rPrXml: rPr(['<w:rFonts w:ascii="SimHei" w:eastAsia="SimHei"/>', '<w:b/>', '<w:color w:val="EA580C"/>', '<w:sz w:val="22"/>']),
      text: "提醒：以下表格使用了 LegacyAlertBox 样式，应被规整成模板正文。",
    })],
  }),

  // Table with template-known style
  `<w:tbl><w:tblPr><w:tblStyle w:val="LightShading-Accent2"/><w:tblW w:type="auto" w:w="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/></w:tblGrid>${tableRow([tableCell("工作项"), tableCell("当前负责人"), tableCell("风险"), tableCell("下一步")])}${tableRow([tableCell("意图识别"), tableCell("算法组"), tableCell("样本覆盖不足"), tableCell("补充 200 条边界样本")])}${tableRow([tableCell("工单流转"), tableCell("平台组"), tableCell("权限配置不一致"), tableCell("统一角色模板")])}${tableRow([tableCell("上线验收"), tableCell("QA"), tableCell("回归窗口紧张"), tableCell("提前冻结测试范围")])}</w:tbl>`,

  paragraph({ runs: [run({ text: " " })] }),

  // Table with unknown table style — should be normalized to TableNormal/none
  `<w:tbl><w:tblPr><w:tblStyle w:val="UnknownVendorTable"/><w:tblW w:type="auto" w:w="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="3600"/><w:gridCol w:w="3600"/></w:tblGrid>${tableRow([tableCell("指标", 3600), tableCell("数值", 3600)])}${tableRow([tableCell("首响时间", 3600), tableCell("28s", 3600)])}${tableRow([tableCell("转人工率", 3600), tableCell("12%", 3600)])}</w:tbl>`,

  paragraph({ pPrXml: pPr(['<w:pStyle w:val="IntenseQuote"/>']),
    runs: [run({
      rPrXml: rPr(['<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="SimSun"/>', '<w:color w:val="9333EA"/>']),
      text: "管理层备注：重点关注上线后一周的转人工率和用户满意度变化。",
    })],
  }),
];

const sourceDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}">
  <w:body>
    ${sourceBody.join("\n    ")}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

function buildDocx({ documentXml, stylesXml, themeXml, numberingXml }) {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", buildContentTypes());
  zip.file("_rels/.rels", sharedRels);
  zip.file("word/_rels/document.xml.rels", documentRels);
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/theme/theme1.xml", themeXml);
  zip.file("word/fontTable.xml", sharedFontTable);
  zip.file("word/settings.xml", sharedSettings);
  zip.file("word/numbering.xml", numberingXml);
  return zip.generate({ type: "uint8array", compression: "DEFLATE" });
}

const fixtures = [
  {
    file: "wordformat-company-template.docx",
    bytes: buildDocx({
      documentXml: templateDocumentXml,
      stylesXml: templateStyles,
      themeXml: templateTheme,
      numberingXml: templateNumbering,
    }),
  },
  {
    file: "wordformat-real-project-report.docx",
    bytes: buildDocx({
      documentXml: sourceDocumentXml,
      stylesXml: sourceStyles,
      themeXml: sourceTheme,
      numberingXml: sourceNumbering,
    }),
  },
];

if (!existsSync(outputDir)) {
  await mkdir(outputDir, { recursive: true });
}

await Promise.all(fixtures.map(({ file, bytes }) => writeFile(join(outputDir, file), Buffer.from(bytes))));

console.log(`wordformat sample files written to ${outputDir}: ${fixtures.map((f) => f.file).join(", ")}`);
