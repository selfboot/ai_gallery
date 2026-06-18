import { readFileSync } from "node:fs";
import { join } from "node:path";
import PizZip from "pizzip";
import { formatWordFile, readTemplateProfile } from "../content";
import {
  buildDirectFormattingSource,
  buildMalformedTableSource,
  buildOverlappingSource,
  buildOverlappingTemplate,
  makeFileFromBuffer,
} from "../__fixtures__/fixtures";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const t = (key) => key;

function makeDocxFile({ name, documentXml, stylesXml, numberingXml, pageTheme = "template" }) {
  const zip = new PizZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`
  );
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml);
  zip.file(
    "word/fontTable.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="${pageTheme === "template" ? "Aptos" : "Courier New"}"/>
  <w:font w:name="${pageTheme === "template" ? "Microsoft YaHei" : "SimSun"}"/>
</w:fonts>`
  );
  zip.file(
    "word/theme/theme1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${pageTheme}">
  <a:themeElements/>
</a:theme>`
  );
  zip.file(
    "word/settings.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="420"/>
</w:settings>`
  );
  zip.file("word/numbering.xml", numberingXml);

  const arrayBuffer = zip.generate({ type: "arraybuffer", compression: "DEFLATE" });
  return {
    name,
    type: DOCX_MIME,
    size: arrayBuffer.byteLength,
    arrayBuffer: async () => arrayBuffer,
  };
}

function blobToArrayBuffer(blob) {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

const templateStylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Microsoft YaHei"/>
        <w:color w:val="1F2937"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="TemplateBody">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="160"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TemplateHeading1">
    <w:name w:val="Heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TemplateQuote">
    <w:name w:val="Quote"/>
    <w:pPr><w:ind w:left="420"/></w:pPr>
  </w:style>
  <w:style w:type="character" w:styleId="TemplateHyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr><w:color w:val="2563EB"/><w:u w:val="single"/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="TemplateStrong">
    <w:name w:val="Strong"/>
    <w:rPr><w:b/></w:rPr>
  </w:style>
  <w:style w:type="table" w:styleId="TemplateTable">
    <w:name w:val="Table Grid"/>
  </w:style>
</w:styles>`;

const sourceStylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="SourceNormal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="SourceHeading1">
    <w:name w:val="Heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="SourceQuote"><w:name w:val="Quote"/></w:style>
  <w:style w:type="character" w:styleId="SourceHyperlink"><w:name w:val="Hyperlink"/></w:style>
  <w:style w:type="character" w:styleId="SourceStrong"><w:name w:val="Strong"/></w:style>
  <w:style w:type="table" w:styleId="SourceTable"><w:name w:val="Plain Table"/></w:style>
</w:styles>`;

const templateNumberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="10">
    <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="42"><w:abstractNumId w:val="10"/></w:num>
</w:numbering>`;

const sourceNumberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="7"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

const templateDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="TemplateHeading1"/></w:pPr>
      <w:r><w:t>Template heading</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="312"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const sourceDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="SourceHeading1"/>
        <w:spacing w:before="999" w:after="999"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Courier New"/><w:color w:val="FF0000"/><w:sz w:val="18"/><w:b/></w:rPr>
        <w:t>Quarterly Project Report</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="SourceNormal"/></w:pPr>
      <w:r>
        <w:rPr><w:rStyle w:val="SourceHyperlink"/><w:color w:val="00AA00"/><w:u w:val="single"/></w:rPr>
        <w:t>https://example.com/report</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr></w:pPr>
      <w:r><w:t>First action item</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr><w:tblStyle w:val="SourceTable"/></w:tblPr>
      <w:tr><w:tc><w:p><w:r><w:t>Budget</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

describe("wordformat docx formatting", () => {
  it("formats a realistic uploaded Word file using a generated template Word file", async () => {
    const templateFile = makeDocxFile({
      name: "company-template.docx",
      documentXml: templateDocumentXml,
      stylesXml: templateStylesXml,
      numberingXml: templateNumberingXml,
      pageTheme: "template",
    });
    const sourceFile = makeDocxFile({
      name: "real-project-report.docx",
      documentXml: sourceDocumentXml,
      stylesXml: sourceStylesXml,
      numberingXml: sourceNumberingXml,
      pageTheme: "source",
    });

    const templateProfile = await readTemplateProfile(templateFile, t);
    const result = await formatWordFile(
      sourceFile,
      templateProfile,
      {
        clearDirectFormatting: true,
        normalizeUnknownStyles: true,
        applyPageSetup: true,
        applyNumbering: true,
      },
      t
    );

    const outputZip = new PizZip(await blobToArrayBuffer(result.blob));
    const outputDocumentXml = outputZip.file("word/document.xml").asText();
    const outputStylesXml = outputZip.file("word/styles.xml").asText();
    const outputNumberingXml = outputZip.file("word/numbering.xml").asText();
    const outputFontTableXml = outputZip.file("word/fontTable.xml").asText();
    const outputThemeXml = outputZip.file("word/theme/theme1.xml").asText();
    const outputDocumentRelsXml = outputZip.file("word/_rels/document.xml.rels").asText();

    expect(result.fileName).toBe("real-project-report_formatted.docx");
    expect(result.stats.remappedStyles).toBeGreaterThanOrEqual(3);
    expect(result.stats.remappedNumbering).toBe(1);
    expect(result.stats.pageSetupApplied).toBe(true);

    expect(outputStylesXml).toContain('w:styleId="TemplateHeading1"');
    expect(outputStylesXml).toContain('w:styleId="TemplateHyperlink"');
    expect(outputFontTableXml).toContain('w:name="Microsoft YaHei"');
    expect(outputThemeXml).toContain('name="template"');
    expect(outputNumberingXml).toContain('w:numId="42"');
    expect(outputDocumentRelsXml).toContain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"'
    );
    expect(outputDocumentRelsXml).toContain('Target="styles.xml"');
    expect(outputDocumentRelsXml).toContain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering"'
    );
    expect(outputDocumentRelsXml).toContain('Target="numbering.xml"');

    expect(outputDocumentXml).toContain('w:pStyle w:val="TemplateHeading1"');
    expect(outputDocumentXml).toContain('w:pStyle w:val="TemplateBody"');
    expect(outputDocumentXml).toContain('w:rStyle w:val="TemplateHyperlink"');
    expect(outputDocumentXml).toContain('w:numId w:val="42"');
    expect(outputDocumentXml).toContain('w:pgSz w:w="11906" w:h="16838"');
    expect(outputDocumentXml).toContain('w:pgMar w:top="1134"');
    expect(outputDocumentXml).toContain('w:docGrid w:linePitch="312"');

    expect(outputDocumentXml).not.toContain('w:pStyle w:val="SourceHeading1"');
    expect(outputDocumentXml).not.toContain('w:rStyle w:val="SourceHyperlink"');
    expect(outputDocumentXml).not.toContain('w:rFonts w:ascii="Courier New"');
    expect(outputDocumentXml).not.toContain('w:color w:val="FF0000"');
    expect(outputDocumentXml).not.toContain('w:sz w:val="18"');
    expect(outputDocumentXml).not.toContain('w:numId w:val="7"');
    expect(outputDocumentXml).not.toContain('w:tblStyle w:val="SourceTable"');
  });

  it("preserves overlapping styleIds only when they represent the same role", async () => {
    const templateFile = buildOverlappingTemplate();
    const sourceFile = buildOverlappingSource();

    const templateProfile = await readTemplateProfile(templateFile, t);
    const result = await formatWordFile(
      sourceFile,
      templateProfile,
      { clearDirectFormatting: true, normalizeUnknownStyles: true, applyPageSetup: true, applyNumbering: false },
      t
    );

    const zip = new PizZip(await blobToArrayBuffer(result.blob));
    const documentXml = zip.file("word/document.xml").asText();

    // Heading1 exists in both → preserved as Heading1 (not role-remapped to itself)
    expect(documentXml).toContain('w:pStyle w:val="Heading1"');
    // IntenseQuote exists in both → preserved (previous bug: was rewritten to plain "Quote")
    expect(documentXml).toContain('w:pStyle w:val="IntenseQuote"');
    expect(documentXml).not.toContain('w:pStyle w:val="Quote"');
    // LegacyHeading is unique to source → role-mapped to template's Heading1
    expect(documentXml).not.toContain('w:pStyle w:val="LegacyHeading"');
    // Hyperlink is in both → unchanged
    expect(documentXml.match(/w:rStyle w:val="Hyperlink"/)?.length).toBeTruthy();
    // UnknownChar is normalized away (no rStyle child) when normalizeUnknownStyles is on
    expect(documentXml).not.toContain('w:rStyle w:val="UnknownChar"');

    // Table style preserved when present in template
    expect(documentXml).toContain('w:tblStyle w:val="LightShading-Accent2"');
    // Unknown table style normalized to the preferred template table style
    expect(documentXml).not.toContain('w:tblStyle w:val="ExoticTable"');

    // page setup pulled from template
    expect(documentXml).toContain('w:pgSz w:w="11906" w:h="16838"');
    expect(documentXml).toContain('w:pgMar w:top="1134"');
  });

  it("maps Word-generated short style ids by semantic role and infers title, subtitle, callout, and table styles", async () => {
    const templateFile = makeDocxFile({
      name: "short-id-template.docx",
      numberingXml: templateNumberingXml,
      documentXml: templateDocumentXml,
      stylesXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="a1"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="a5"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="56"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="a6"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="64748B"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="a0"><w:name w:val="List Bullet"/><w:pPr><w:numPr><w:numId w:val="42"/></w:numPr></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="a"><w:name w:val="List Number"/></w:style>
  <w:style w:type="paragraph" w:styleId="TemplateCallout"><w:name w:val="Template Callout"/><w:rPr><w:color w:val="92400E"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="a3"><w:name w:val="Normal Table"/></w:style>
  <w:style w:type="table" w:styleId="TemplateGrid"><w:name w:val="Template Grid"/></w:style>
</w:styles>`,
    });
    const sourceFile = makeDocxFile({
      name: "short-id-source.docx",
      numberingXml: sourceNumberingXml,
      stylesXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="a0"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="a"><w:name w:val="List Bullet"/></w:style>
  <w:style w:type="paragraph" w:styleId="LegacyAlert"><w:name w:val="Legacy Alert"/></w:style>
  <w:style w:type="table" w:styleId="UnknownVendorTable"><w:name w:val="Unknown Vendor Table"/></w:style>
</w:styles>`,
      documentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/><w:color w:val="DC2626"/><w:sz w:val="36"/></w:rPr><w:t>Q3 智能客服项目复盘报告</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:i/><w:color w:val="6B7280"/><w:sz w:val="20"/></w:rPr><w:t>本文档来自不同团队协作编辑。</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="a"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr></w:pPr><w:r><w:t>完成 12 个高频业务场景梳理</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="LegacyAlert"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="EA580C"/></w:rPr><w:t>提醒：以下表格使用了旧样式。</w:t></w:r></w:p>
    <w:tbl><w:tblPr><w:tblStyle w:val="UnknownVendorTable"/></w:tblPr><w:tr><w:tc><w:p><w:r><w:t>工作项</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
  </w:body>
</w:document>`,
    });

    const profile = await readTemplateProfile(templateFile, t);
    expect(profile.paragraphRoleIds.title).toBe("a5");
    expect(profile.paragraphRoleIds.subtitle).toBe("a6");
    expect(profile.paragraphRoleIds.listBullet).toBe("a0");
    expect(profile.paragraphRoleIds.listNumber).toBe("a");
    expect(profile.paragraphRoleIds.callout).toBe("TemplateCallout");
    expect(profile.preferredTableStyleId).toBe("TemplateGrid");

    const result = await formatWordFile(
      sourceFile,
      profile,
      { clearDirectFormatting: true, normalizeUnknownStyles: true, applyPageSetup: true, applyNumbering: true },
      t
    );

    const zip = new PizZip(await blobToArrayBuffer(result.blob));
    const documentXml = zip.file("word/document.xml").asText();
    const numberingXml = zip.file("word/numbering.xml").asText();

    expect(documentXml).toContain('w:pStyle w:val="a5"');
    expect(documentXml).toContain('w:pStyle w:val="a6"');
    expect(documentXml).toContain('w:pStyle w:val="a0"');
    expect(documentXml).toContain('w:pStyle w:val="TemplateCallout"');
    expect(documentXml).toContain('w:tblStyle w:val="TemplateGrid"');
    expect(documentXml).toContain('w:numId w:val="42"');
    expect(numberingXml).toContain('w:numId="42"');
    expect(documentXml).not.toContain('w:pStyle w:val="LegacyAlert"');
    expect(documentXml).not.toContain('w:tblStyle w:val="UnknownVendorTable"');
    expect(documentXml).not.toContain('w:color w:val="DC2626"');
    expect(documentXml).not.toContain('w:color w:val="EA580C"');
    expect(documentXml).not.toContain("<w:i/>");
  });

  it("resolves themed fonts (asciiTheme=minorHAnsi) to the actual typeface from theme1.xml", async () => {
    const templateFile = buildOverlappingTemplate();
    const profile = await readTemplateProfile(templateFile, t);

    expect(profile.summary.defaultFont.latin).toBe("Aptos");
    expect(profile.summary.defaultFont.eastAsia).toBe("Microsoft YaHei");
    expect(profile.summary.defaultFont.size).toBe("11 pt");
  });

  it("preserves the XML declaration in the rewritten document.xml", async () => {
    const templateFile = buildOverlappingTemplate();
    const sourceFile = buildOverlappingSource();
    const profile = await readTemplateProfile(templateFile, t);
    const result = await formatWordFile(
      sourceFile,
      profile,
      { clearDirectFormatting: true, normalizeUnknownStyles: true, applyPageSetup: true, applyNumbering: false },
      t
    );

    const zip = new PizZip(await blobToArrayBuffer(result.blob));
    const documentXml = zip.file("word/document.xml").asText();
    expect(documentXml.startsWith('<?xml ')).toBe(true);
    expect(documentXml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"/);
  });

  it("does not crash on a paragraph that has only direct formatting and no pStyle", async () => {
    const templateFile = buildOverlappingTemplate();
    const sourceFile = buildDirectFormattingSource();

    const profile = await readTemplateProfile(templateFile, t);
    const result = await formatWordFile(
      sourceFile,
      profile,
      { clearDirectFormatting: true, normalizeUnknownStyles: true, applyPageSetup: true, applyNumbering: false },
      t
    );

    expect(result.status).toBe("success");
    const zip = new PizZip(await blobToArrayBuffer(result.blob));
    const documentXml = zip.file("word/document.xml").asText();
    // direct font/color/size cleared from runs
    expect(documentXml).not.toContain('w:rFonts w:ascii="Courier New"');
    expect(documentXml).not.toContain('w:color w:val="DC2626"');
    expect(documentXml).not.toContain('w:sz w:val="32"');
    // bold preserved (RUN_KEEP_CHILDREN keeps semantic toggles)
    expect(documentXml).toContain('<w:b/>');
    // template styles part fully replaced
    const stylesXml = zip.file("word/styles.xml").asText();
    expect(stylesXml).toContain('w:styleId="Heading1"');
  });

  it("repairs tables that lack <w:tblGrid> and tables that are not followed by a paragraph", async () => {
    const templateFile = buildOverlappingTemplate();
    const sourceFile = buildMalformedTableSource();

    const profile = await readTemplateProfile(templateFile, t);
    const result = await formatWordFile(
      sourceFile,
      profile,
      { clearDirectFormatting: true, normalizeUnknownStyles: true, applyPageSetup: true, applyNumbering: false },
      t
    );

    expect(result.status).toBe("success");
    const zip = new PizZip(await blobToArrayBuffer(result.blob));
    const documentXml = zip.file("word/document.xml").asText();

    // Both tables now have a tblGrid
    const tblGridCount = (documentXml.match(/<w:tblGrid>/g) || []).length;
    expect(tblGridCount).toBeGreaterThanOrEqual(2);
    // First table had 2 cells in its first row → its synthetic tblGrid has 2 gridCol nodes
    expect(documentXml).toMatch(/<w:tblGrid><w:gridCol[^/]*\/><w:gridCol[^/]*\/><\/w:tblGrid>/);
    // Adjacent tables get separated by a synthetic <w:p/>
    expect(documentXml).not.toMatch(/<\/w:tbl>\s*<w:tbl>/);
    // Each table is followed by a paragraph separator before following content/sectPr.
    expect((documentXml.match(/<\/w:tbl><w:p\/>/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("formats the real public/files sample docx end-to-end with stable assertions", async () => {
    const fixturesDir = join(process.cwd(), "public", "files");
    const tplBuf = readFileSync(join(fixturesDir, "wordformat-company-template.docx"));
    const srcBuf = readFileSync(join(fixturesDir, "wordformat-real-project-report.docx"));

    const toAB = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const tplFile = makeFileFromBuffer("wordformat-company-template.docx", toAB(tplBuf));
    const srcFile = makeFileFromBuffer("wordformat-real-project-report.docx", toAB(srcBuf));

    const profile = await readTemplateProfile(tplFile, t);
    const heading1StyleId = profile.paragraphRoleIds.heading1;
    const heading2StyleId = profile.paragraphRoleIds.heading2;
    const normalStyleId = profile.paragraphRoleIds.normal;
    const listBulletStyleId = profile.paragraphRoleIds.listBullet;
    const quoteStyleId = profile.paragraphRoleIds.quote;
    const intenseQuoteStyleId = profile.paragraphStyleIds.has("IntenseQuote") ? "IntenseQuote" : "";
    const hyperlinkStyleId = profile.characterRoleIds.hyperlink;
    const preferredTableStyleId = profile.preferredTableStyleId;

    expect(heading1StyleId).toBeTruthy();
    expect(profile.paragraphStyles.find((style) => style.styleId === heading1StyleId)?.name.toLowerCase()).toContain(
      "heading 1"
    );
    expect(normalStyleId).toBeTruthy();
    expect(heading2StyleId).toBeTruthy();
    expect(listBulletStyleId).toBeTruthy();
    expect(quoteStyleId || intenseQuoteStyleId).toBeTruthy();
    expect(hyperlinkStyleId).toBeTruthy();
    expect(preferredTableStyleId).toBeTruthy();
    expect(profile.summary.defaultFont.latin).toBe("Aptos");
    expect(profile.summary.defaultFont.eastAsia).toBe("Microsoft YaHei");
    // Custom template-only paragraph styles surfaced
    expect(profile.existingStyleIds.has("TemplateCallout")).toBe(true);
    expect(profile.existingStyleIds.has("TemplateInfoBox")).toBe(true);
    expect(profile.existingStyleIds.has("TemplateNote")).toBe(true);
    // Template numbering ids picked up
    expect(profile.numberingIds.length).toBeGreaterThanOrEqual(1);

    const result = await formatWordFile(
      srcFile,
      profile,
      { clearDirectFormatting: true, normalizeUnknownStyles: true, applyPageSetup: true, applyNumbering: true },
      t
    );

    expect(result.status).toBe("success");
    expect(result.stats.pageSetupApplied).toBe(true);

    const zip = new PizZip(await blobToArrayBuffer(result.blob));
    const documentXml = zip.file("word/document.xml").asText();
    const stylesXml = zip.file("word/styles.xml").asText();
    const numberingXml = zip.file("word/numbering.xml").asText();

    // styles.xml is fully template's
    expect(stylesXml).toContain(`w:styleId="${heading1StyleId}"`);
    expect(stylesXml).toContain('w:styleId="TemplateCallout"');
    expect(stylesXml).toContain(`w:styleId="${preferredTableStyleId}"`);
    // numbering remapped (source 7 -> template numId)
    expect(documentXml).not.toContain('w:numId w:val="7"');
    // Role mapping uses the template's real style IDs, including Office-generated short IDs.
    expect(documentXml).toContain(`w:pStyle w:val="${heading1StyleId}"`);
    expect(documentXml).toContain(`w:pStyle w:val="${heading2StyleId}"`);
    expect(documentXml).toContain(`w:pStyle w:val="${listBulletStyleId}"`);
    expect(documentXml).toContain(`w:pStyle w:val="${intenseQuoteStyleId || quoteStyleId}"`);
    expect(documentXml).toContain(`w:rStyle w:val="${hyperlinkStyleId}"`);
    // template-known table style kept; unknown vendor style stripped
    expect(documentXml).toContain(`w:tblStyle w:val="${preferredTableStyleId}"`);
    expect(documentXml).not.toContain('w:tblStyle w:val="UnknownVendorTable"');
    // Source's "LegacyAlertBox" paragraph style is normalized to template body
    expect(documentXml).not.toContain('w:pStyle w:val="LegacyAlertBox"');
    // numbering definitions came from template
    expect(numberingXml).toMatch(/w:numId="\d+"/);
    // page geometry from template (A4)
    expect(documentXml).toContain('w:pgSz w:w="11906"');
    // direct red color from "Q3 智能客服项目复盘报告" run stripped
    expect(documentXml).not.toContain('w:color w:val="DC2626"');
    expect(documentXml).not.toContain('w:rFonts w:ascii="Courier New"');
    // The unknown character style "MysteryEmphasis" is mapped to template's Strong via role inference
    expect(documentXml).not.toContain('w:rStyle w:val="MysteryEmphasis"');
  });
});
