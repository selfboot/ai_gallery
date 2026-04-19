import {
  clampInsertAfterPage,
  fitImageIntoBox,
  formatFileSize,
  getAutoGridBoxes,
  getPageNumberDrawPosition,
  groupImagesForAutoLayout,
  makeOutputFileName,
  sanitizeFileName,
} from "../logic";

describe("pdfaddimage logic", () => {
  test("formats file names and insert page numbers", () => {
    expect(sanitizeFileName("合同/发票:test.pdf")).toBe("合同_发票_test");
    expect(makeOutputFileName("report.pdf")).toBe("report_with_images.pdf");
    expect(clampInsertAfterPage("9", 3)).toBe(3);
    expect(clampInsertAfterPage("-1", 3)).toBe(0);
    expect(formatFileSize(1536)).toBe("1.50 KB");
  });

  test("groups images for automatic multi-image pages", () => {
    const groups = groupImagesForAutoLayout([
      { width: 800, height: 600 },
      { width: 1600, height: 600 },
      { width: 500, height: 700 },
      { width: 500, height: 700 },
    ]);

    expect(groups.map((group) => group.length)).toEqual([3, 1]);
  });

  test("creates grid boxes and fits images", () => {
    const boxes = getAutoGridBoxes({ pageWidth: 600, pageHeight: 800, count: 2, margin: 40, gap: 20 });
    expect(boxes).toEqual([
      { x: 40, y: 410, width: 520, height: 350 },
      { x: 40, y: 40, width: 520, height: 350 },
    ]);
    expect(fitImageIntoBox({ box: boxes[0], imageWidth: 400, imageHeight: 200 })).toEqual({
      x: 40,
      y: 455,
      width: 520,
      height: 260,
    });
  });

  test("places page numbers", () => {
    expect(
      getPageNumberDrawPosition({
        pageWidth: 600,
        pageHeight: 800,
        textWidth: 24,
        fontSize: 10,
        position: "topCenter",
        margin: 20,
      })
    ).toEqual({ x: 288, y: 770 });
  });
});
