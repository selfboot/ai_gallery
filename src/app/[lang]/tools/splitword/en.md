This tool splits Word (`.docx`) files directly in your browser, with no server upload. You can split by different rules: single-page, odd/even pages, page ranges, fixed page count, page breaks, or Heading 1 sections. After splitting, download files one by one or in a ZIP package.

## How to use

1. Upload one `.docx` file (processed locally in your browser).
2. Choose a split mode and fill mode-specific options (for example `1-3;4-6` for ranges).
3. Configure output naming rules (prefix, suffix, start index, zero padding). The prefix defaults to the uploaded file name.
4. Click split and download outputs from the result list.

## Features

- 6 split modes: single-page, odd/even pages, page ranges, fixed page count, page breaks, and Heading 1.
- Custom output naming: prefix, suffix, start index, and zero-padding width.
- Supports both single-file download and one-click ZIP package download.
- Fully local browser processing with no server upload.

## Notes

- Page-based split modes depend on pagination markers inside the document (explicit page breaks and rendered page markers).
- Heading-based split depends on paragraph style being Heading 1 (or equivalent style IDs).
- For best compatibility, use standard Office `.docx` files.
