import {
  formatFileSize,
  getImageMimeType,
  makePageImageName,
  makeZipName,
  sanitizeFileName,
  summarizeImages,
} from "../logic";

describe("pdfimage logic", () => {
  test("formats output names safely", () => {
    expect(sanitizeFileName("合同/发票:test.pdf")).toBe("合同_发票_test");
    expect(makePageImageName("report.pdf", 7, "jpg")).toBe("report_page_007.jpg");
    expect(makePageImageName("report.pdf", 12, "png")).toBe("report_page_012.png");
    expect(makeZipName("report.pdf")).toBe("report_images.zip");
  });

  test("maps image mime types and summarizes output", () => {
    expect(getImageMimeType("png")).toBe("image/png");
    expect(getImageMimeType("jpg")).toBe("image/jpeg");
    expect(formatFileSize(1536)).toBe("1.50 KB");
    expect(summarizeImages([{ size: 100 }, { size: 250 }])).toEqual({ count: 2, totalSize: 350 });
  });
});
