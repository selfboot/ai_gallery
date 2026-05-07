import { diffLines } from "diff";

export const DEFAULT_INDENT = 2;

export function normalizeLineEndings(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((result, key) => {
        result[key] = sortJsonValue(value[key]);
        return result;
      }, {});
  }

  return value;
}

export function countJsonKeys(value) {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countJsonKeys(item), 0);
  }

  if (value && typeof value === "object") {
    return Object.keys(value).reduce((sum, key) => sum + 1 + countJsonKeys(value[key]), 0);
  }

  return 0;
}

export function countJsonNodes(value) {
  if (Array.isArray(value)) {
    return 1 + value.reduce((sum, item) => sum + countJsonNodes(item), 0);
  }

  if (value && typeof value === "object") {
    return 1 + Object.values(value).reduce((sum, item) => sum + countJsonNodes(item), 0);
  }

  return 1;
}

export function countLines(text) {
  if (!text) return 0;
  return normalizeLineEndings(text).split("\n").length;
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

export function normalizeDiffParts(parts) {
  return parts
    .filter((part) => part.value !== "")
    .map((part) => ({
      type: part.added ? "add" : part.removed ? "remove" : "same",
      value: part.value,
      count: typeof part.count === "number" ? part.count : countLines(part.value),
    }));
}

export function parseJsonInput(text, options = {}) {
  const normalizedInput = normalizeLineEndings(text);
  const trimmed = normalizedInput.trim();
  const indent = Number.isFinite(options.indent) ? options.indent : DEFAULT_INDENT;
  const sortKeys = options.sortKeys !== false;

  if (!trimmed) {
    return {
      ok: false,
      empty: true,
      error: "",
      rawText: normalizedInput,
      normalizedText: "",
      keyCount: 0,
      nodeCount: 0,
      lineCount: 0,
      value: null,
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    const normalizedValue = sortKeys ? sortJsonValue(parsed) : parsed;
    const normalizedText = JSON.stringify(normalizedValue, null, indent);

    return {
      ok: true,
      empty: false,
      error: "",
      rawText: normalizedInput,
      normalizedText,
      keyCount: countJsonKeys(normalizedValue),
      nodeCount: countJsonNodes(normalizedValue),
      lineCount: countLines(normalizedText),
      value: normalizedValue,
    };
  } catch (error) {
    return {
      ok: false,
      empty: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
      rawText: normalizedInput,
      normalizedText: "",
      keyCount: 0,
      nodeCount: 0,
      lineCount: 0,
      value: null,
    };
  }
}

export function compareNormalizedJson(leftState, rightState) {
  if (!leftState?.ok || !rightState?.ok) {
    return {
      segments: [],
      stats: {
        same: 0,
        added: 0,
        removed: 0,
        changed: false,
        leftLines: leftState?.lineCount || 0,
        rightLines: rightState?.lineCount || 0,
      },
    };
  }

  const parts = diffLines(leftState.normalizedText, rightState.normalizedText);
  const segments = normalizeDiffParts(parts);
  const stats = summarizeDiff(segments);

  return {
    segments,
    stats: {
      ...stats,
      changed: stats.added > 0 || stats.removed > 0,
      leftLines: leftState.lineCount,
      rightLines: rightState.lineCount,
    },
  };
}

export function createJsonDiffReport(leftState, rightState, result, options = {}) {
  const lines = [
    "JSON Diff Report",
    `Sort Keys: ${options.sortKeys ? "on" : "off"}`,
    `Indent: ${options.indent || DEFAULT_INDENT}`,
    `Same Lines: ${result.stats.same}`,
    `Added Lines: ${result.stats.added}`,
    `Removed Lines: ${result.stats.removed}`,
    "",
    "Diff:",
  ];

  result.segments.forEach((segment) => {
    const prefix = segment.type === "add" ? "+ " : segment.type === "remove" ? "- " : "  ";
    lines.push(`${prefix}${segment.value}`);
  });

  lines.push(
    "",
    "Normalized Left JSON:",
    leftState?.normalizedText || "",
    "",
    "Normalized Right JSON:",
    rightState?.normalizedText || ""
  );

  return lines.join("\n");
}
