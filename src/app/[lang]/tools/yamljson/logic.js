import yaml from "js-yaml";

export const INPUT_FORMATS = {
  AUTO: "auto",
  JSON: "json",
  YAML: "yaml",
};

export const OUTPUT_FORMATS = {
  AUTO: "auto",
  JSON: "json",
  YAML: "yaml",
};

export const YAML_JSON_ACCEPT = ".json,.yaml,.yml,application/json,application/x-yaml,text/yaml,text/x-yaml,text/plain";

export function normalizeText(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function detectInputFormat(text) {
  const trimmed = normalizeText(text).trim();
  if (!trimmed) return INPUT_FORMATS.JSON;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return INPUT_FORMATS.JSON;

  try {
    JSON.parse(trimmed);
    return INPUT_FORMATS.JSON;
  } catch {
    return INPUT_FORMATS.YAML;
  }
}

export function parseStructuredText(text, inputFormat = INPUT_FORMATS.AUTO) {
  const normalized = normalizeText(text);
  const trimmed = normalized.trim();
  if (!trimmed) {
    const error = new Error("empty input");
    error.code = "empty_input";
    throw error;
  }

  const format = inputFormat === INPUT_FORMATS.AUTO ? detectInputFormat(trimmed) : inputFormat;
  try {
    const data = format === INPUT_FORMATS.JSON ? JSON.parse(trimmed) : yaml.load(trimmed, { json: true });
    return { data, format };
  } catch (error) {
    const wrapped = new Error(error?.message || "parse failed");
    wrapped.code = format === INPUT_FORMATS.JSON ? "invalid_json" : "invalid_yaml";
    wrapped.originalError = error;
    throw wrapped;
  }
}

export function stringifyJson(data, options = {}) {
  const space = options.compactJson ? 0 : Number(options.jsonIndent || 2);
  return `${JSON.stringify(data, null, space)}\n`;
}

export function stringifyYaml(data, options = {}) {
  return yaml.dump(data, {
    indent: Number(options.yamlIndent || 2),
    lineWidth: Number(options.yamlLineWidth || 120),
    noRefs: true,
    sortKeys: Boolean(options.sortKeys),
  });
}

export function getReverseOutputFormat(inputFormat) {
  return inputFormat === INPUT_FORMATS.JSON ? OUTPUT_FORMATS.YAML : OUTPUT_FORMATS.JSON;
}

export function convertStructuredText(text, inputFormat, outputFormat, options = {}) {
  const parsed = parseStructuredText(text, inputFormat);
  const resolvedOutputFormat = outputFormat === OUTPUT_FORMATS.AUTO ? getReverseOutputFormat(parsed.format) : outputFormat;
  const output = resolvedOutputFormat === OUTPUT_FORMATS.JSON ? stringifyJson(parsed.data, options) : stringifyYaml(parsed.data, options);
  return {
    inputFormat: parsed.format,
    outputFormat: resolvedOutputFormat,
    output,
    data: parsed.data,
  };
}

export function getStats(text) {
  const normalized = normalizeText(text);
  return {
    chars: normalized.length,
    lines: normalized ? normalized.split("\n").length : 0,
    bytes: new Blob([normalized]).size,
  };
}

export function getDownloadName(outputFormat) {
  return outputFormat === OUTPUT_FORMATS.JSON ? "converted-config.json" : "converted-config.yaml";
}
