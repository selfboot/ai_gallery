import PizZip from "pizzip";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const BASE_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

const BASE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

const BASE_FONT_TABLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="Calibri"/></w:fonts>`;

const BASE_SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="420"/></w:settings>`;

function buildThemeXml({ majorLatin = "Calibri", majorEastAsia = "宋体", minorLatin = "Cambria", minorEastAsia = "宋体" } = {}) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="generated">
  <a:themeElements>
    <a:fontScheme name="generated">
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

function buildDocxFile({ name, documentXml, stylesXml, numberingXml, themeXml, fontTableXml }) {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", BASE_CONTENT_TYPES);
  zip.file("_rels/.rels", BASE_RELS);
  zip.file("word/_rels/document.xml.rels", DOCUMENT_RELS);
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/fontTable.xml", fontTableXml || BASE_FONT_TABLE);
  zip.file("word/settings.xml", BASE_SETTINGS);
  zip.file("word/theme/theme1.xml", themeXml || buildThemeXml());
  if (numberingXml) {
    zip.file("word/numbering.xml", numberingXml);
  }

  const arrayBuffer = zip.generate({ type: "arraybuffer", compression: "DEFLATE" });
  return {
    name,
    type: DOCX_MIME,
    size: arrayBuffer.byteLength,
    arrayBuffer: async () => arrayBuffer,
  };
}

const TEMPLATE_THEME_FONT_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:eastAsiaTheme="minorEastAsia"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/></w:style>
  <w:style w:type="paragraph" w:styleId="IntenseQuote"><w:name w:val="Intense Quote"/></w:style>
  <w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/></w:style>
  <w:style w:type="character" w:styleId="Strong"><w:name w:val="Strong"/></w:style>
  <w:style w:type="table" w:styleId="LightShading-Accent2"><w:name w:val="Light Shading Accent 2"/></w:style>
</w:styles>`;

const TEMPLATE_DOCUMENT_WITH_SECTPR = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Template H1</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="312"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const SOURCE_OVERLAPPING_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="IntenseQuote"><w:name w:val="Intense Quote"/></w:style>
  <w:style w:type="paragraph" w:styleId="LegacyHeading">
    <w:name w:val="heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
  </w:style>
  <w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/></w:style>
  <w:style w:type="character" w:styleId="UnknownChar"><w:name w:val="UnknownChar"/></w:style>
  <w:style w:type="table" w:styleId="LightShading-Accent2"><w:name w:val="Light Shading Accent 2"/></w:style>
  <w:style w:type="table" w:styleId="ExoticTable"><w:name w:val="Exotic"/></w:style>
</w:styles>`;

const SOURCE_DOCUMENT_OVERLAP = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Heading kept</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="LegacyHeading"/></w:pPr>
      <w:r><w:t>Mapped via heading1 role</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="IntenseQuote"/></w:pPr>
      <w:r><w:t>Intense quote preserved</w:t></w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:rStyle w:val="UnknownChar"/></w:rPr>
        <w:t>Unknown char run</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>
        <w:t>https://example.com/template</w:t>
      </w:r>
    </w:p>
    <w:tbl>
      <w:tblPr><w:tblStyle w:val="LightShading-Accent2"/></w:tblPr>
      <w:tblGrid><w:gridCol w:w="2400"/></w:tblGrid>
      <w:tr><w:tc><w:tcPr><w:tcW w:type="dxa" w:w="2400"/></w:tcPr><w:p><w:r><w:t>Cell A</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Spacer between tables</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblStyle w:val="ExoticTable"/></w:tblPr>
      <w:tblGrid><w:gridCol w:w="2400"/></w:tblGrid>
      <w:tr><w:tc><w:tcPr><w:tcW w:type="dxa" w:w="2400"/></w:tcPr><w:p><w:r><w:t>Cell B</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Trailing paragraph</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

export function buildOverlappingTemplate() {
  return buildDocxFile({
    name: "overlap-template.docx",
    documentXml: TEMPLATE_DOCUMENT_WITH_SECTPR,
    stylesXml: TEMPLATE_THEME_FONT_STYLES,
    themeXml: buildThemeXml({ minorLatin: "Aptos", minorEastAsia: "Microsoft YaHei" }),
  });
}

export function buildOverlappingSource() {
  return buildDocxFile({
    name: "overlap-source.docx",
    documentXml: SOURCE_DOCUMENT_OVERLAP,
    stylesXml: SOURCE_OVERLAPPING_STYLES,
  });
}

const DIRECT_FORMAT_SOURCE_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`;

const DIRECT_FORMAT_SOURCE_DOC = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Courier New"/><w:b/><w:color w:val="DC2626"/><w:sz w:val="32"/></w:rPr>
        <w:t>大字号红色加粗"标题"段落</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman"/><w:sz w:val="20"/></w:rPr>
        <w:t>普通正文</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

export function buildDirectFormattingSource() {
  return buildDocxFile({
    name: "direct-format-source.docx",
    documentXml: DIRECT_FORMAT_SOURCE_DOC,
    stylesXml: DIRECT_FORMAT_SOURCE_STYLES,
  });
}

const MALFORMED_TABLE_SOURCE_DOC = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr><w:tblStyle w:val="LightShading-Accent2"/></w:tblPr>
      <w:tr><w:tc><w:p><w:r><w:t>缺少 tblGrid 的表格 A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>列 2</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:tbl>
      <w:tblPr/>
      <w:tr><w:tc><w:p><w:r><w:t>紧贴下一个表格的表格 B</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

export function buildMalformedTableSource() {
  return buildDocxFile({
    name: "malformed-table-source.docx",
    documentXml: MALFORMED_TABLE_SOURCE_DOC,
    stylesXml: DIRECT_FORMAT_SOURCE_STYLES,
  });
}

export function makeFileFromBuffer(name, arrayBuffer) {
  return {
    name,
    type: DOCX_MIME,
    size: arrayBuffer.byteLength,
    arrayBuffer: async () => arrayBuffer,
  };
}
