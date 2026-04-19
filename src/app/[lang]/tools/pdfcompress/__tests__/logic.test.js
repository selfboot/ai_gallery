import {
  calculateSavingPercent,
  formatFileSize,
  getCompressionSummary,
  getPresetConfig,
  makeCompressedPdfName,
  makeUniqueFileName,
  sanitizeFileName,
  summarizePdfCompression,
} from "../logic";

describe("pdfcompress logic", () => {
  test("formats file names and sizes", () => {
    expect(sanitizeFileName("合同/发票:test.pdf")).toBe("合同_发票_test");
    expect(makeCompressedPdfName("report.v1.pdf")).toBe("report.v1_compressed.pdf");
    expect(formatFileSize(1536)).toBe("1.50 KB");
  });

  test("calculates compression summary", () => {
    expect(calculateSavingPercent(1000, 620)).toBe(38);
    expect(calculateSavingPercent(1000, 1200)).toBe(-20);
    expect(getCompressionSummary(4000, 1500)).toEqual({
      originalSize: 4000,
      outputSize: 1500,
      savingPercent: 63,
      isSmaller: true,
      changedSize: -2500,
    });
  });

  test("falls back to balanced preset", () => {
    expect(getPresetConfig("smaller").jpegQuality).toBe(0.62);
    expect(getPresetConfig("unknown")).toEqual(getPresetConfig("balanced"));
  });

  test("summarizes batch results and avoids duplicate output names", () => {
    const usedNames = new Set();
    expect(makeUniqueFileName("a.pdf", usedNames)).toBe("a.pdf");
    expect(makeUniqueFileName("a.pdf", usedNames)).toBe("a_2.pdf");
    expect(
      summarizePdfCompression([
        { originalSize: 1000, outputSize: 500 },
        { originalSize: 3000, outputSize: 1000 },
      ])
    ).toEqual({
      count: 2,
      originalSize: 4000,
      outputSize: 1500,
      savingPercent: 63,
    });
  });
});
