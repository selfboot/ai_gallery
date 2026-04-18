import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getImagePlacement, getPageSize, getResizeDimensions, shouldResizeImage } from "../logic";

const FIXTURE_DIR = path.join(process.cwd(), "src/app/[lang]/tools/imagepdf/__fixtures__");
const LANDSCAPE_FIXTURE_PATH = path.join(FIXTURE_DIR, "landscape.png");
const PORTRAIT_FIXTURE_PATH = path.join(FIXTURE_DIR, "portrait.png");

async function buildPdfFromImageFixtures() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fixtures = [
    { path: LANDSCAPE_FIXTURE_PATH, width: 800, height: 400 },
    { path: PORTRAIT_FIXTURE_PATH, width: 400, height: 800 },
  ];

  for (let index = 0; index < fixtures.length; index += 1) {
    const fixture = fixtures[index];
    const pageSize = getPageSize("a4", "auto", fixture.width, fixture.height);
    const page = pdfDoc.addPage([pageSize.width, pageSize.height]);
    const image = await pdfDoc.embedPng(new Uint8Array(fs.readFileSync(fixture.path)));
    const placement = getImagePlacement({
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      imageWidth: fixture.width,
      imageHeight: fixture.height,
      margin: 24,
      fitMode: "contain",
      reserveFooter: true,
    });

    page.drawImage(image, placement);
    page.drawText(`${index + 1} / ${fixtures.length}`, {
      x: 24,
      y: 12,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  return pdfDoc.save({ useObjectStreams: true });
}

describe("imagepdf logic", () => {
  test("builds a PDF from fixed image fixtures with one page per image", async () => {
    const pdfBytes = await buildPdfFromImageFixtures();
    const parsedPdf = await PDFDocument.load(pdfBytes);
    const pages = parsedPdf.getPages();

    expect(pages).toHaveLength(2);
    expect(Math.round(pages[0].getWidth())).toBe(842);
    expect(Math.round(pages[0].getHeight())).toBe(595);
    expect(Math.round(pages[1].getWidth())).toBe(595);
    expect(Math.round(pages[1].getHeight())).toBe(842);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  test("uses landscape page automatically for landscape images", () => {
    expect(getPageSize("a4", "auto", 1600, 900)).toEqual({ width: 841.89, height: 595.28 });
  });

  test("fits a wide image inside the page without cropping", () => {
    const placement = getImagePlacement({
      pageWidth: 600,
      pageHeight: 800,
      imageWidth: 1600,
      imageHeight: 800,
      margin: 50,
      fitMode: "contain",
      reserveFooter: false,
    });

    expect(placement.width).toBe(500);
    expect(placement.height).toBe(250);
    expect(placement.x).toBe(50);
    expect(placement.y).toBe(275);
  });

  test("reserves footer space when page numbers are enabled", () => {
    const withoutFooter = getImagePlacement({
      pageWidth: 600,
      pageHeight: 800,
      imageWidth: 400,
      imageHeight: 800,
      margin: 40,
      fitMode: "contain",
      reserveFooter: false,
    });
    const withFooter = getImagePlacement({
      pageWidth: 600,
      pageHeight: 800,
      imageWidth: 400,
      imageHeight: 800,
      margin: 40,
      fitMode: "contain",
      reserveFooter: true,
    });

    expect(withFooter.height).toBeLessThan(withoutFooter.height);
    expect(withFooter.y).toBeGreaterThan(withoutFooter.y);
  });

  test("resizes large images proportionally", () => {
    expect(shouldResizeImage(5000, 2500, 2400)).toBe(true);
    expect(getResizeDimensions(5000, 2500, 2500)).toEqual({ width: 2500, height: 1250 });
  });
});
