import { compareNormalizedCsv, parseCsvInput } from "../logic";

describe("csvdiff logic", () => {
  test("parseCsvInput trims cells and normalizes rows", () => {
    const result = parseCsvInput("sku, name \nA1, Bottle \nA2, Lamp", {
      delimiter: "comma",
      hasHeader: true,
      trimCells: true,
      skipEmptyRows: true,
    });

    expect(result.ok).toBe(true);
    expect(result.columnCount).toBe(2);
    expect(result.rowCount).toBe(3);
    expect(result.headerRow).toEqual(["sku", "name"]);
  });

  test("compareNormalizedCsv reports changed lines", () => {
    const left = parseCsvInput("sku,name\nA1,Bottle\nA2,Lamp", { delimiter: "comma" });
    const right = parseCsvInput("sku,name\nA1,Bottle\nA3,Mouse Pad", { delimiter: "comma" });
    const result = compareNormalizedCsv(left, right);

    expect(result.stats.changed).toBe(true);
    expect(result.stats.added).toBeGreaterThan(0);
    expect(result.stats.removed).toBeGreaterThan(0);
  });
});
