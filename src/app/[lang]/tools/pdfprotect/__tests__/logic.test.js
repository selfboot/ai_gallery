import {
  formatFileSize,
  makeProtectedPdfName,
  makeUniqueFileName,
  summarizeResults,
  validatePassword,
} from "../logic";

describe("pdfprotect logic", () => {
  test("formats file sizes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.00 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.00 MB");
  });

  test("creates protected PDF names", () => {
    expect(makeProtectedPdfName("contract.pdf")).toBe("contract-protected.pdf");
    expect(makeProtectedPdfName("report.PDF")).toBe("report-protected.pdf");
    expect(makeProtectedPdfName("")).toBe("document-protected.pdf");
  });

  test("creates unique file names", () => {
    const usedNames = new Set();
    expect(makeUniqueFileName("a.pdf", usedNames)).toBe("a.pdf");
    expect(makeUniqueFileName("a.pdf", usedNames)).toBe("a_2.pdf");
    expect(makeUniqueFileName("a.pdf", usedNames)).toBe("a_3.pdf");
  });

  test("validates password length", () => {
    expect(validatePassword("abc")).toEqual({ ok: false, reason: "tooShort" });
    expect(validatePassword("abcd")).toEqual({ ok: true });
    expect(validatePassword("x".repeat(128))).toEqual({ ok: false, reason: "tooLong" });
  });

  test("summarizes processed results", () => {
    expect(
      summarizeResults([
        { originalSize: 100, outputSize: 120 },
        { originalSize: 300, outputSize: 360 },
      ])
    ).toEqual({ count: 2, originalSize: 400, outputSize: 480 });
  });
});
