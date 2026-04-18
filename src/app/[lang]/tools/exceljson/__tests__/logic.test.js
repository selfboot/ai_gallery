import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { jsonToSheetRows, makeHeaders, makeJsonLinesText, makeJsonText, parseJsonOrJsonLines, rowsToJsonValue } from "../logic";

const FIXTURE_DIR = path.join(process.cwd(), "src/app/[lang]/tools/exceljson/__fixtures__");
const XLSX_FIXTURE_PATH = path.join(FIXTURE_DIR, "contacts.xlsx");
const CSV_FIXTURE_PATH = path.join(FIXTURE_DIR, "contacts.csv");
const JSON_FIXTURE_PATH = path.join(FIXTURE_DIR, "orders.json");
const JSONL_FIXTURE_PATH = path.join(FIXTURE_DIR, "fine-tune.jsonl");

function runXlsxScript(script, input) {
  return JSON.parse(
    execFileSync(process.execPath, ["-e", script, XLSX_FIXTURE_PATH], {
      cwd: process.cwd(),
      encoding: "utf8",
      input: input ? JSON.stringify(input) : undefined,
      maxBuffer: 1024 * 1024,
    })
  );
}

function readXlsxFixtureRows() {
  return runXlsxScript(`
    const XLSX = require("xlsx");
    const workbook = XLSX.readFile(process.argv[1], { cellDates: true, dense: true });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.contacts, {
      header: 1,
      raw: false,
      defval: "",
    });
    process.stdout.write(JSON.stringify(rows));
  `);
}

function roundTripSheetRows(rows) {
  return runXlsxScript(
    `
      const fs = require("fs");
      const XLSX = require("xlsx");
      const input = JSON.parse(fs.readFileSync(0, "utf8"));
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(input.rows);
      XLSX.utils.book_append_sheet(workbook, sheet, "Result");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const parsedWorkbook = XLSX.read(buffer, { type: "buffer", cellDates: true, dense: true });
      const rows = XLSX.utils.sheet_to_json(parsedWorkbook.Sheets.Result, {
        header: 1,
        raw: false,
        defval: "",
      });
      process.stdout.write(JSON.stringify(rows));
    `,
    { rows }
  );
}

describe("exceljson logic", () => {
  test("converts the fixed Excel fixture to JSON with first row as headers", async () => {
    const rows = readXlsxFixtureRows();
    const result = await rowsToJsonValue(rows, true);

    expect(result).toEqual([
      { name: "Alice", phone: "13800138000", phone_2: "backup", city: "Beijing" },
      { name: "Bob", phone: "13900139000", phone_2: "", city: "Shanghai" },
      { name: "Charlie", phone: "", phone_2: "", city: "Guangzhou" },
    ]);
  });

  test("converts the fixed Excel fixture to JSONL with one record per line", async () => {
    const rows = readXlsxFixtureRows();
    const records = await rowsToJsonValue(rows, true);
    const jsonl = makeJsonLinesText(records);

    expect(jsonl.split("\n")).toEqual([
      "{\"name\":\"Alice\",\"phone\":\"13800138000\",\"phone_2\":\"backup\",\"city\":\"Beijing\"}",
      "{\"name\":\"Bob\",\"phone\":\"13900139000\",\"phone_2\":\"\",\"city\":\"Shanghai\"}",
      "{\"name\":\"Charlie\",\"phone\":\"\",\"phone_2\":\"\",\"city\":\"Guangzhou\"}",
    ]);
    expect(jsonl).not.toMatch(/^\[/);
    expect(jsonl).not.toContain("\n  ");
  });

  test("converts the fixed CSV fixture to JSON and preserves quoted newline content", async () => {
    const csv = fs.readFileSync(CSV_FIXTURE_PATH, "utf8");
    const parsed = Papa.parse(csv, { skipEmptyLines: false });
    const result = await rowsToJsonValue(parsed.data, true);

    expect(result[0]).toEqual({
      name: "Alice",
      phone: "13800138000",
      city: "Beijing",
      notes: "VIP, likes email",
    });
    expect(result[1].notes).toBe("Line one\nLine two");
    expect(result[2]).toEqual({ name: "Charlie", phone: "", city: "Guangzhou", notes: "" });
  });

  test("converts the fixed JSON fixture to Excel rows and verifies xlsx round trip", () => {
    const source = JSON.parse(fs.readFileSync(JSON_FIXTURE_PATH, "utf8"));
    const sheetData = jsonToSheetRows(source);
    const exportedRows = roundTripSheetRows(sheetData.rows);

    expect(sheetData.rowCount).toBe(2);
    expect(sheetData.columnCount).toBe(5);
    expect(exportedRows[0]).toEqual(["orderId", "name", "amount", "tags", "meta"]);
    expect(exportedRows[1]).toEqual(["A001", "Alice", "128.5", "[\"vip\",\"paid\"]", ""]);
    expect(exportedRows[2]).toEqual(["A002", "Bob", "88", "", "{\"source\":\"csv\"}"]);
  });

  test("converts the fixed JSONL fixture to Excel rows and verifies xlsx round trip", () => {
    const source = parseJsonOrJsonLines(fs.readFileSync(JSONL_FIXTURE_PATH, "utf8"));
    const sheetData = jsonToSheetRows(source);
    const exportedRows = roundTripSheetRows(sheetData.rows);

    expect(sheetData.rowCount).toBe(3);
    expect(sheetData.columnCount).toBe(3);
    expect(exportedRows[0]).toEqual(["prompt", "completion", "source"]);
    expect(exportedRows[1]).toEqual(["你好", "你好，有什么可以帮你？", "chat"]);
    expect(exportedRows[2]).toEqual(["介绍产品", "这是一个在线 CSV / Excel / JSON 转换工具。", "product"]);
    expect(exportedRows[3]).toEqual(["输出 JSONL", "每一行都是一条独立 JSON 记录。", "format"]);
  });

  test("converts rows to objects when first row is used as headers", async () => {
    const rows = [
      ["name", "phone", "phone"],
      ["Alice", "13800138000", "backup"],
      ["Bob", "13900139000", ""],
    ];

    const result = await rowsToJsonValue(rows, true);

    expect(result).toEqual([
      { name: "Alice", phone: "13800138000", phone_2: "backup" },
      { name: "Bob", phone: "13900139000", phone_2: "" },
    ]);
  });

  test("converts rows to arrays without header mode", async () => {
    const result = await rowsToJsonValue(
      [
        ["A", "B"],
        ["1", "2"],
      ],
      false
    );

    expect(result).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });

  test("normalizes object array JSON into sheet rows", () => {
    const result = jsonToSheetRows([
      { name: "Alice", tags: ["vip", "test"] },
      { name: "Bob", age: 18 },
    ]);

    expect(result.rows).toEqual([
      ["name", "tags", "age"],
      ["Alice", "[\"vip\",\"test\"]", ""],
      ["Bob", "", 18],
    ]);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(3);
  });

  test("makes unique fallback headers", () => {
    expect(makeHeaders(["name", "name", ""], 4, true)).toEqual(["name", "name_2", "field_3", "field_4"]);
  });

  test("supports compact JSON", () => {
    expect(makeJsonText([{ a: 1 }], false)).toBe("[{\"a\":1}]");
  });

  test("supports JSONL output", () => {
    expect(makeJsonLinesText([{ a: 1 }, { b: "two" }])).toBe("{\"a\":1}\n{\"b\":\"two\"}");
  });

  test("parses JSONL input with blank lines", () => {
    expect(parseJsonOrJsonLines("{\"a\":1}\n\n{\"b\":\"two\"}")).toEqual([{ a: 1 }, { b: "two" }]);
  });
});
