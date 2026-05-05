export const DEFAULT_OPTIONS = {
  trimLines: true,
  removeEmptyLines: true,
  caseSensitive: true,
  keepOrder: true,
};

export function normalizeText(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeLineForCompare(line, options = DEFAULT_OPTIONS) {
  const trimmed = options.trimLines ? line.trim() : line;
  return options.caseSensitive ? trimmed : trimmed.toLocaleLowerCase();
}

export function normalizeLineForOutput(line, options = DEFAULT_OPTIONS) {
  return options.trimLines ? line.trim() : line;
}

export function dedupeLines(text, options = DEFAULT_OPTIONS) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const lines = normalizeText(text).split("\n");
  const seen = new Map();
  const kept = [];
  const duplicates = [];

  lines.forEach((line, index) => {
    const outputLine = normalizeLineForOutput(line, mergedOptions);
    if (mergedOptions.removeEmptyLines && outputLine === "") {
      return;
    }

    const key = normalizeLineForCompare(line, mergedOptions);
    const existing = seen.get(key);
    if (existing) {
      existing.count += 1;
      existing.lines.push(index + 1);
      duplicates.push({
        line: outputLine,
        firstLine: existing.firstLine,
        lineNumber: index + 1,
        key,
      });
      return;
    }

    seen.set(key, {
      key,
      line: outputLine,
      count: 1,
      firstLine: index + 1,
      lines: [index + 1],
    });
    kept.push({ key, line: outputLine, firstLine: index + 1 });
  });

  const outputLines = mergedOptions.keepOrder
    ? kept.map((item) => item.line)
    : [...kept].sort((a, b) => a.line.localeCompare(b.line, undefined, { numeric: true })).map((item) => item.line);

  const duplicateGroups = Array.from(seen.values())
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count || a.firstLine - b.firstLine);

  return {
    output: outputLines.join("\n"),
    inputLineCount: lines.length,
    outputLineCount: outputLines.length,
    removedLineCount: lines.length - outputLines.length,
    duplicateLineCount: duplicates.length,
    duplicateGroupCount: duplicateGroups.length,
    emptyLineCount: lines.filter((line) => normalizeLineForOutput(line, mergedOptions) === "").length,
    duplicateGroups,
    duplicates,
  };
}

export function makeDedupeReport(result) {
  return JSON.stringify(
    {
      summary: {
        inputLineCount: result.inputLineCount,
        outputLineCount: result.outputLineCount,
        removedLineCount: result.removedLineCount,
        duplicateLineCount: result.duplicateLineCount,
        duplicateGroupCount: result.duplicateGroupCount,
        emptyLineCount: result.emptyLineCount,
      },
      duplicateGroups: result.duplicateGroups,
    },
    null,
    2
  );
}
