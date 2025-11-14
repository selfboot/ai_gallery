# Remove Blank Pages From Word

When Word documents contain many empty paragraphs, manual page breaks, or leftover rendering markers, unwanted blank pages often appear. This tool runs entirely in your browser. After uploading a `.docx` file, it scans for empty or break-only paragraphs, removes them, and generates a cleaned document for download.

## How to use

1. **Upload** – Click or drop the Word (`.docx`) document you want to clean. The maximum file size is 50 MB.
2. **Clean** – Press **“Remove Blank Pages”**. The script parses the document locally and searches for empty paragraphs or isolated page breaks.
3. **Download** – Once processing finishes the cleaned file downloads automatically with a `cleaned` suffix in its name.
4. **Review** – A summary dialog shows how many empty paragraphs or page-break paragraphs were removed. Open the new file to double-check the layout.

## What gets removed

- Paragraphs that only contain a page break or `lastRenderedPageBreak`
- Empty paragraphs without text, images, form controls, or fields
- Structural placeholders that would turn into blank pages

> ⚠️ To protect formatting, section breaks, bookmarks, fields, images, and equations are kept intact. If a blank page is caused by those elements you may still need a manual adjustment afterwards.

![Remove blank pages from Word](https://slefboot-1251736664.file.myqcloud.com/20250704_ai_gallery_mergetool.webp)


