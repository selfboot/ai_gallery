# How to Use the Text Deduplication Tool

This online text dedupe tool removes duplicate lines from lists, keywords, URLs, emails, SKUs, IDs, logs, config snippets, CSV columns, and marketing copy. Paste text into the editor and the tool instantly deduplicates lines while showing duplicate statistics.

All processing runs locally in your browser. Your text is not uploaded to a server, which is useful for internal customer lists, account data, API output, logs, and unpublished content.

## Supported Options

- Line deduplication: each line is treated as one item and kept only once.
- Trim whitespace: treat ` apple ` and `apple` as the same line.
- Remove empty lines: clean blank lines created by copy and paste.
- Case sensitivity: choose whether `Apple` and `apple` should be treated as duplicates.
- Keep order: keep the first occurrence order, or disable it to sort output text.
- Duplicate statistics: see duplicate groups, counts, and line numbers.

## Steps

1. Paste text, or upload a `.txt`, `.csv`, `.md`, or `.log` file.
2. Choose whether to trim lines, remove empty lines, use case-sensitive matching, and keep order.
3. Review the summary and duplicate item list.
4. Copy the deduped result or download it as TXT.
5. Copy or download the JSON report if you need duplicate audit details.

## Common Use Cases

Use this tool for keyword deduplication, URL dedupe, email list cleanup, customer list dedupe, product SKU cleanup, ID list dedupe, log line dedupe, API output cleanup, and copywriting material cleanup. Developers, data analysts, SEO teams, marketers, and editors often need fast line-based deduplication.

## Deduplication Rules

By default, the tool trims leading and trailing whitespace, removes empty lines, and keeps the first occurrence order. If case sensitivity is disabled, lines with different casing but the same text are treated as duplicates. Duplicate statistics include line numbers so you can trace where repeated values appeared in the original text.
