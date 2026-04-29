import { compareTexts, createPlainTextReport, countWords, DIFF_MODES } from "../logic";

describe("difftext logic", () => {
  test("compares text by line", () => {
    const result = compareTexts("a\nb\nc", "a\nx\nc", DIFF_MODES.LINE);
    expect(result.stats.same).toBe(2);
    expect(result.stats.removed).toBe(1);
    expect(result.stats.added).toBe(1);
    expect(result.stats.changed).toBe(true);
  });

  test("compares text by word", () => {
    const result = compareTexts("price is 100", "price is 120", DIFF_MODES.WORD);
    expect(result.stats.removed).toBe(1);
    expect(result.stats.added).toBe(1);
  });

  test("detects small version changes in code-like strings", () => {
    const result = compareTexts('   "eslint": "^8.57.1",', '    "eslint": "^8.57.2",', DIFF_MODES.WORD);
    expect(result.segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "remove", value: "1" }),
        expect.objectContaining({ type: "add", value: "2" }),
      ])
    );
  });

  test("counts unicode words and punctuation without whitespace tokens", () => {
    expect(countWords("第 1 页，hello!")).toBe(6);
  });

  test("creates plain text report", () => {
    const result = compareTexts("old", "new", DIFF_MODES.WORD);
    const report = createPlainTextReport("old", "new", result);
    expect(report).toContain("Text Diff Report");
    expect(report).toContain("- old");
    expect(report).toContain("+ new");
  });
});
