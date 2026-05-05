import { dedupeLines, normalizeLineForCompare } from "../logic";

describe("textdedupe logic", () => {
  test("dedupes lines with trim and keeps order", () => {
    const result = dedupeLines("a\n b \na\nb\n\nc", {
      trimLines: true,
      removeEmptyLines: true,
      caseSensitive: true,
      keepOrder: true,
    });
    expect(result.output).toBe("a\nb\nc");
    expect(result.duplicateLineCount).toBe(2);
    expect(result.duplicateGroupCount).toBe(2);
  });

  test("supports case insensitive comparison", () => {
    expect(normalizeLineForCompare(" Apple ", { trimLines: true, caseSensitive: false })).toBe("apple");
    const result = dedupeLines("Apple\napple\nAPPLE", {
      trimLines: true,
      removeEmptyLines: true,
      caseSensitive: false,
      keepOrder: true,
    });
    expect(result.output).toBe("Apple");
    expect(result.duplicateLineCount).toBe(2);
  });

  test("can sort output when keep order is disabled", () => {
    const result = dedupeLines("b\na\nc\na", {
      trimLines: true,
      removeEmptyLines: true,
      caseSensitive: true,
      keepOrder: false,
    });
    expect(result.output).toBe("a\nb\nc");
  });
});
