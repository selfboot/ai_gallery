import { compareNormalizedJson, parseJsonInput, sortJsonValue } from "../logic";

describe("jsondiff logic", () => {
  test("sortJsonValue sorts object keys recursively but keeps array order", () => {
    const input = {
      z: 1,
      a: {
        d: true,
        b: false,
      },
      list: [{ y: 2, x: 1 }, 3],
    };

    expect(sortJsonValue(input)).toEqual({
      a: {
        b: false,
        d: true,
      },
      list: [{ x: 1, y: 2 }, 3],
      z: 1,
    });
  });

  test("parseJsonInput returns normalized pretty json", () => {
    const result = parseJsonInput('{"b":1,"a":{"d":2,"c":3}}', { sortKeys: true, indent: 2 });

    expect(result.ok).toBe(true);
    expect(result.normalizedText).toBe('{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}');
    expect(result.keyCount).toBe(4);
  });

  test("compareNormalizedJson reports added and removed lines", () => {
    const left = parseJsonInput('{"a":1,"b":2}');
    const right = parseJsonInput('{"a":1,"b":3,"c":4}');
    const result = compareNormalizedJson(left, right);

    expect(result.stats.changed).toBe(true);
    expect(result.stats.added).toBeGreaterThan(0);
    expect(result.stats.removed).toBeGreaterThan(0);
  });
});
