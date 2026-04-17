import { execFileSync } from "child_process";
import path from "path";
import { getRowValues, processRows } from "../logic";

const FIXTURE_PATH = path.join(process.cwd(), "src/app/[lang]/tools/excelsplitmerge/__fixtures__/split-merge-data.xlsx");

function runXlsxScript(script, input) {
  return JSON.parse(
    execFileSync(process.execPath, ["-e", script, FIXTURE_PATH], {
      cwd: process.cwd(),
      encoding: "utf8",
      input: input ? JSON.stringify(input) : undefined,
      maxBuffer: 1024 * 1024,
    })
  );
}

function readFixtureRows() {
  return runXlsxScript(`
    const XLSX = require("xlsx");
    const workbook = XLSX.readFile(process.argv[1], { cellDates: true, dense: true });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["split-merge-data"], {
      header: 1,
      raw: false,
      defval: "",
    });
    process.stdout.write(JSON.stringify(rows));
  `);
}

function roundTripRows(rows, maxColumn) {
  return runXlsxScript(
    `
      const fs = require("fs");
      const XLSX = require("xlsx");
      const input = JSON.parse(fs.readFileSync(0, "utf8"));
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(input.rows);
      XLSX.utils.book_append_sheet(workbook, sheet, "result");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const parsedWorkbook = XLSX.read(buffer, { type: "buffer", cellDates: true, dense: true });
      const rows = XLSX.utils.sheet_to_json(parsedWorkbook.Sheets.result, {
        header: 1,
        raw: false,
        defval: "",
      });
      process.stdout.write(JSON.stringify(rows));
    `,
    { rows: rows.map((row) => getRowValues(row, maxColumn)) }
  );
}

function makeWorksheet() {
  return {
    name: "split-merge-data",
    rows: readFixtureRows(),
  };
}

describe("excel split merge core logic", () => {
  test("merges multiple columns into one column and skips empty fields", () => {
    const result = processRows({
      worksheet: makeWorksheet(),
      mode: "merge",
      skipHeaderRow: true,
      mergeOptions: {
        columnKeys: [1, 2, 3, 4],
        delimiter: " | ",
        outputHeader: "完整信息",
        skipEmptyValues: true,
        trimValues: true,
      },
      splitOptions: {},
      contactOptions: {},
    });
    const exportedRows = roundTripRows(result.rows, result.maxColumn);

    expect(result.stats).toEqual({
      totalRows: 3,
      changedRows: 3,
      newColumnCount: 1,
    });
    expect(exportedRows[0][6]).toBe("完整信息");
    expect(exportedRows[1][6]).toBe("张三 | 13800138000 | 北京市朝阳区 | VIP");
    expect(exportedRows[2][6]).toBe("李四 | 13900139000 | 上海市浦东新区");
    expect(exportedRows[3][6]).toBe("王五 | 广州市天河区 | 空手机号");
  });

  test("splits one column with mixed delimiters into multiple columns", () => {
    const result = processRows({
      worksheet: makeWorksheet(),
      mode: "split",
      skipHeaderRow: true,
      mergeOptions: {},
      splitOptions: {
        sourceColumnKey: 5,
        delimiters: {
          comma: true,
          space: true,
          newline: true,
          tab: true,
          semicolon: true,
          custom: "|",
        },
        outputPrefix: "拆分",
        outputCount: 7,
        trimParts: true,
        removeEmptyParts: true,
      },
      contactOptions: {},
    });
    const exportedRows = roundTripRows(result.rows, result.maxColumn);

    expect(result.stats.newColumnCount).toBe(7);
    expect(exportedRows[0].slice(6, 13)).toEqual(["拆分1", "拆分2", "拆分3", "拆分4", "拆分5", "拆分6", "拆分7"]);
    expect(exportedRows[1].slice(6, 13)).toEqual(["苹果", "香蕉", "梨", "葡萄", "西瓜", "桃", "杏"]);
    expect(exportedRows[2].slice(6, 9)).toEqual(["A", "B", "C"]);
    expect(exportedRows[3].slice(6, 9)).toEqual(["红色", "蓝色", "绿色"]);
  });

  test("extracts name phone and address from mixed contact text", () => {
    const result = processRows({
      worksheet: makeWorksheet(),
      mode: "contact",
      skipHeaderRow: true,
      mergeOptions: {},
      splitOptions: {},
      contactOptions: {
        sourceColumnKey: 6,
        nameHeader: "姓名",
        phoneHeader: "手机号",
        addressHeader: "地址",
      },
    });
    const exportedRows = roundTripRows(result.rows, result.maxColumn);

    expect(result.stats).toEqual({
      totalRows: 3,
      changedRows: 3,
      newColumnCount: 3,
    });
    expect(exportedRows[0].slice(6, 9)).toEqual(["姓名", "手机号", "地址"]);
    expect(exportedRows[1].slice(6, 9)).toEqual(["张三", "13800138000", "北京市朝阳区建国路"]);
    expect(exportedRows[2].slice(6, 9)).toEqual(["李四", "13900139000", "上海市浦东新区"]);
    expect(exportedRows[3].slice(6, 9)).toEqual(["王五", "", "广州市天河区"]);
  });
});
