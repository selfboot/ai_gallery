# PDF Print Orientation Fixer

Some scanned PDFs look portrait on screen but print as landscape, or they appear correct in one viewer and rotated in another. This usually happens because the PDF depends on page rotation metadata instead of storing the visible orientation directly in the page content.

This tool fixes that mismatch by flattening the current visual orientation into the PDF itself. After export, the file should look the same in viewers and on paper, without relying on printer or viewer rotation handling.

## What This Tool Fixes

- Scanned PDF pages that look upright on screen but print sideways
- PDFs that open portrait in one app and landscape in another
- Mixed-orientation scan bundles where some pages depend on rotation metadata
- Files that need a stable print result before sending to clients, schools, courts, or archives

## How It Works

1. Upload the PDF.
2. The tool reads each page size and rotation flag.
3. It creates a new PDF where the visible orientation is baked into every page.
4. Download the fixed PDF and print it normally.

## Local Processing

The PDF is processed locally in your browser. It is not uploaded to a server. That makes it suitable for contracts, scanned IDs, court filings, invoices, forms, and other sensitive PDF documents.
