import { degrees, PDFDocument } from "pdf-lib";
import { getVisiblePageStats, moveItem, removePageItem, rotatePageItem } from "../logic";

async function makeSourcePdf(pageCount) {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([300 + index, 400 + index]);
    page.drawText(`Page ${index + 1}`, { x: 20, y: 350 });
  }
  return pdf.save();
}

async function organizePdf(sourceBytes, pages) {
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const outputPdf = await PDFDocument.create();

  for (const item of pages) {
    const [copiedPage] = await outputPdf.copyPages(sourcePdf, [item.sourceIndex]);
    copiedPage.setRotation(degrees(((copiedPage.getRotation().angle || 0) + item.rotation) % 360));
    outputPdf.addPage(copiedPage);
  }

  return outputPdf.save();
}

describe("pdforganize logic", () => {
  test("moves, rotates, and removes page items", () => {
    const pages = [
      { sourceIndex: 0, rotation: 0 },
      { sourceIndex: 1, rotation: 0 },
      { sourceIndex: 2, rotation: 0 },
    ];

    expect(moveItem(pages, 0, 2).map((page) => page.sourceIndex)).toEqual([1, 2, 0]);
    expect(rotatePageItem(pages[0]).rotation).toBe(90);
    expect(rotatePageItem({ sourceIndex: 0, rotation: 270 }).rotation).toBe(0);
    expect(removePageItem(pages, 1).map((page) => page.sourceIndex)).toEqual([0, 2]);
  });

  test("reports visible page stats", () => {
    expect(
      getVisiblePageStats(5, [
        { sourceIndex: 0, rotation: 90 },
        { sourceIndex: 2, rotation: 0 },
        { sourceIndex: 4, rotation: 180 },
      ])
    ).toEqual({
      originalPageCount: 5,
      outputPageCount: 3,
      deletedPageCount: 2,
      rotatedPageCount: 2,
    });
  });

  test("creates organized PDF with reordered and rotated pages", async () => {
    const sourceBytes = await makeSourcePdf(3);
    const outputBytes = await organizePdf(sourceBytes, [
      { sourceIndex: 2, rotation: 90 },
      { sourceIndex: 0, rotation: 0 },
    ]);
    const outputPdf = await PDFDocument.load(outputBytes);

    expect(outputPdf.getPageCount()).toBe(2);
    expect(outputPdf.getPage(0).getRotation().angle).toBe(90);
    expect(outputPdf.getPage(0).getWidth()).toBe(302);
    expect(outputPdf.getPage(1).getWidth()).toBe(300);
  });
});
