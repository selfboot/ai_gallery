import { INPUT_FORMATS, OUTPUT_FORMATS, convertStructuredText, detectInputFormat, parseStructuredText } from "../logic";

describe("yamljson logic", () => {
  test("detects json and yaml input", () => {
    expect(detectInputFormat('{"name":"demo"}')).toBe(INPUT_FORMATS.JSON);
    expect(detectInputFormat("name: demo\nactive: true")).toBe(INPUT_FORMATS.YAML);
  });

  test("converts yaml to formatted json", () => {
    const result = convertStructuredText("name: demo\nports:\n  - 3000\n  - 3001", INPUT_FORMATS.YAML, OUTPUT_FORMATS.JSON, { jsonIndent: 2 });
    expect(result.inputFormat).toBe(INPUT_FORMATS.YAML);
    expect(result.output).toContain('"name": "demo"');
    expect(result.output).toContain("3001");
  });

  test("converts json to yaml", () => {
    const result = convertStructuredText('{"name":"demo","active":true}', INPUT_FORMATS.JSON, OUTPUT_FORMATS.YAML, { yamlIndent: 2 });
    expect(result.output).toContain("name: demo");
    expect(result.output).toContain("active: true");
  });

  test("auto output reverses detected input format", () => {
    const fromJson = convertStructuredText('{"name":"demo"}', INPUT_FORMATS.AUTO, OUTPUT_FORMATS.AUTO);
    expect(fromJson.inputFormat).toBe(INPUT_FORMATS.JSON);
    expect(fromJson.outputFormat).toBe(OUTPUT_FORMATS.YAML);
    expect(fromJson.output).toContain("name: demo");

    const fromYaml = convertStructuredText("name: demo", INPUT_FORMATS.AUTO, OUTPUT_FORMATS.AUTO);
    expect(fromYaml.inputFormat).toBe(INPUT_FORMATS.YAML);
    expect(fromYaml.outputFormat).toBe(OUTPUT_FORMATS.JSON);
    expect(fromYaml.output).toContain('"name": "demo"');
  });

  test("throws structured errors for invalid json", () => {
    expect(() => parseStructuredText("{bad", INPUT_FORMATS.JSON)).toThrow();
  });
});
