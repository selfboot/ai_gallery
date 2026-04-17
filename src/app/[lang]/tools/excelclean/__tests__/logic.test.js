import { execFileSync } from "child_process";
import path from "path";
import { getRowValues, processExcelCleanRows } from "../logic";

const DIRTY_WORKBOOK_PATH = path.join(process.cwd(), "src/app/[lang]/tools/excelclean/__fixtures__/dirty-data.xlsx");

function runXlsxScript(script, input) {
  return JSON.parse(
    execFileSync(process.execPath, ["-e", script, DIRTY_WORKBOOK_PATH], {
      cwd: process.cwd(),
      encoding: "utf8",
      input: input ? JSON.stringify(input) : undefined,
      maxBuffer: 1024 * 1024,
    })
  );
}

function readDirtyWorkbookRows() {
  return runXlsxScript(`
    const XLSX = require("xlsx");
    const workbook = XLSX.readFile(process.argv[1], { cellDates: true, dense: true });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["dirty-data"], {
      header: 1,
      raw: true,
      defval: "",
    });
    process.stdout.write(JSON.stringify(rows));
  `);
}

function roundTripCleanedRows(rows, maxColumn) {
  return runXlsxScript(
    `
      const fs = require("fs");
      const XLSX = require("xlsx");
      const input = JSON.parse(fs.readFileSync(0, "utf8"));
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(input.rows);
      XLSX.utils.book_append_sheet(workbook, sheet, "cleaned");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const parsedWorkbook = XLSX.read(buffer, { type: "buffer", cellDates: true, dense: true });
      const rows = XLSX.utils.sheet_to_json(parsedWorkbook.Sheets.cleaned, {
        header: 1,
        raw: false,
        defval: "",
      });
      process.stdout.write(JSON.stringify(rows));
    `,
    { rows: rows.map((row) => getRowValues(row, maxColumn)) }
  );
}

describe("excel clean core logic", () => {
  test("cleans dirty fields, normalizes dates, and reports validation issues from the fixed dirty Excel fixture", () => {
    const rows = readDirtyWorkbookRows();

    const baseOptions = {
      rows,
      skipHeaderRow: true,
      rules: {
        trimSpaces: true,
        removeAllSpaces: false,
        fullWidthToHalfWidth: true,
        removeLineBreaks: true,
        removeInvisible: true,
      },
      caseMode: "none",
      dateOptions: {
        enabled: true,
        outputFormat: "yyyy-mm-dd",
        ambiguousMode: "report",
      },
    };

    const result = processExcelCleanRows({
      ...baseOptions,
      dateColumnKeys: [2],
      validationColumnGroups: {
        phone: [3],
        email: [4],
        id: [5],
      },
    });
    expect(result.rows[1][0]).toBe("Alice Smith");
    expect(result.rows[1][2]).toBe("13800138000");
    expect(result.rows[1][3]).toBe("good@example.com");

    const cleanedWorkbookRows = roundTripCleanedRows(result.rows, result.maxColumn);

    expect(cleanedWorkbookRows[1][1]).toBe("2024-01-01");
    expect(cleanedWorkbookRows[2][1]).toBe("2024-01-02");
    expect(cleanedWorkbookRows[4][1]).toBe("2024-01-03");
    expect(cleanedWorkbookRows[5][1]).toBe("2024-01-04");

    expect(result.dateReports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowNumber: 2, columnLabel: "B", resultValue: "2024-01-01", status: "serial" }),
        expect.objectContaining({ rowNumber: 4, columnLabel: "B", resultValue: "", status: "ambiguous" }),
        expect.objectContaining({ rowNumber: 7, columnLabel: "B", resultValue: "", status: "out_of_range" }),
        expect.objectContaining({ rowNumber: 8, columnLabel: "B", resultValue: "", status: "invalid" }),
      ])
    );
    expect(result.stats.dateConverted).toBe(4);
    expect(result.stats.dateIssues).toBe(3);

    expect(result.validationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowNumber: 3, columnLabel: "C", value: "12345", type: "phone" }),
        expect.objectContaining({ rowNumber: 3, columnLabel: "D", value: "bad@", type: "email" }),
        expect.objectContaining({ rowNumber: 3, columnLabel: "E", value: "11010519490230002Z", type: "id" }),
      ])
    );
  });
});
