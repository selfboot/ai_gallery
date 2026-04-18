## CSV / Excel to JSON Tool Guide

This tool converts Excel to JSON, CSV to JSON, and JSON to Excel directly in the browser. Files are not uploaded to a server, which makes it practical for API testing, data migration, spreadsheet cleanup, frontend mock data, and operations workflows.

### Supported Conversions

- Excel to JSON: upload `.xlsx` or `.xls`, choose a sheet, and export JSON.
- CSV to JSON: upload `.csv` and parse common CSV quoting, commas, and line breaks.
- JSON / JSONL to Excel: upload a JSON or JSONL file, or paste the content, then export `.xlsx`.

### First Row as Field Names

For Excel and CSV input, enable “first row as field names” to use the first row as JSON object keys. Each following row becomes one object.

If this option is disabled, the output stays as a two-dimensional array. That is useful when the file has no header row, has messy headers, or must preserve the original column order exactly.

### JSONL, One Record Per Line

Excel to JSON and CSV to JSON support two output formats:

- Standard JSON array: useful for APIs, config files, and frontend mock data.
- JSONL: one JSON record per line, useful for LLM fine-tuning datasets, batch imports, logs, and streaming workflows.

When JSONL is selected, every record is written as a compact single line without indentation. Example:

```json
{"prompt":"Hello","completion":"Hi, how can I help?"}
{"prompt":"Describe the product","completion":"It is an online data conversion tool."}
```

### Large File Tips

To better support larger files, the page renders only a result preview while keeping the complete result available for copy and download. CSV parsing uses a browser Worker to reduce UI blocking.

For large files, turn off “pretty JSON” to generate faster and produce a smaller output file. Very large Excel files still depend on browser memory because the workbook must be parsed locally.

### JSON to Excel Format

Object arrays are recommended:

```json
[
  { "name": "Alice", "phone": "13800138000" },
  { "name": "Bob", "phone": "13900139000" }
]
```

Two-dimensional arrays are also supported:

```json
[
  ["name", "phone"],
  ["Alice", "13800138000"]
]
```

Nested arrays or objects are written into cells as JSON strings to avoid losing data.

JSONL with one record per line can also be converted directly to Excel:

```json
{"prompt":"Hello","completion":"Hi, how can I help?"}
{"prompt":"Describe the product","completion":"It is an online data conversion tool."}
```

Each JSONL record becomes one Excel row, and shared fields are organized as columns.
