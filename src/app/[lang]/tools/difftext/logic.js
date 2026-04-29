import { diffLines, diffWordsWithSpace } from "diff";

export const DIFF_MODES = {
  LINE: "line",
  WORD: "word",
};

export function countLines(text) {
  if (!text) return 0;
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").length;
}

export function countWords(text) {
  if (!text) return 0;
  return String(text).match(/[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]+/gu)?.length || 0;
}

export function countSegmentUnits(value, mode) {
  return mode === DIFF_MODES.WORD ? countWords(value) : countLines(value);
}

export function normalizeDiffParts(parts, mode) {
  return parts
    .filter((part) => part.value !== "")
    .map((part) => ({
      type: part.added ? "add" : part.removed ? "remove" : "same",
      value: part.value,
      count: typeof part.count === "number" ? part.count : countSegmentUnits(part.value, mode),
    }));
}

export function compareTexts(leftText, rightText, mode = DIFF_MODES.LINE) {
  const normalizedLeft = String(leftText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const normalizedRight = String(rightText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = mode === DIFF_MODES.WORD ? diffWordsWithSpace(normalizedLeft, normalizedRight) : diffLines(normalizedLeft, normalizedRight);
  const segments = normalizeDiffParts(parts, mode);
  const stats = summarizeDiff(segments);

  return {
    mode,
    segments,
    stats: {
      ...stats,
      leftTokens: mode === DIFF_MODES.WORD ? countWords(normalizedLeft) : countLines(normalizedLeft),
      rightTokens: mode === DIFF_MODES.WORD ? countWords(normalizedRight) : countLines(normalizedRight),
      changed: stats.added > 0 || stats.removed > 0,
    },
  };
}

export function summarizeDiff(segments) {
  return segments.reduce(
    (summary, segment) => {
      if (segment.type === "same") return { ...summary, same: summary.same + segment.count };
      if (segment.type === "add") return { ...summary, added: summary.added + segment.count };
      return { ...summary, removed: summary.removed + segment.count };
    },
    { same: 0, added: 0, removed: 0 }
  );
}

export function createPlainTextReport(leftText, rightText, result) {
  const lines = [
    "Text Diff Report",
    `Mode: ${result.mode}`,
    `Same: ${result.stats.same}`,
    `Added: ${result.stats.added}`,
    `Removed: ${result.stats.removed}`,
    "",
    "Diff:",
  ];

  result.segments.forEach((segment) => {
    const prefix = segment.type === "add" ? "+ " : segment.type === "remove" ? "- " : "  ";
    lines.push(`${prefix}${segment.value}`);
  });

  lines.push("", "Original Text:", leftText, "", "Changed Text:", rightText);
  return lines.join("\n");
}
