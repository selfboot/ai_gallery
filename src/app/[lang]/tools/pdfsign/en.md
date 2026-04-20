## Add a Signature Image to PDF

This free online PDF signature tool lets you add a handwritten signature image to contracts, forms, approvals, quotes, receipts, agreements, and other PDF documents. Upload a PDF and a signature image, preview the transparent signature, drag it onto any PDF page, resize the signature area, and export a new signed PDF.

You do not need to install desktop software or upload files to a server. PDF preview, signature background removal, drag-and-resize placement, and final PDF export all run locally in your browser, which is useful for documents that contain personal information, contract terms, or internal business content.

## Key Features

- Add a handwritten signature image to a PDF online, with support for JPG, PNG, and WebP signature files.
- Convert a signature image into a transparent PNG, suitable for white-background scanned signatures and photographed signatures.
- Preview the background-removed signature before placing it on the PDF.
- Save the processed signature in the current browser so it can be reused the next time you open the tool.
- Work with multi-page PDFs and bind every signature placement to a specific page.
- Drag the signature anywhere on the PDF preview and resize it using the bottom-right handle.
- Export a real signed PDF by converting preview coordinates into PDF coordinates and writing the transparent signature image into the document.

## How to Use

1. Upload the PDF file that needs a visible signature.
2. Upload a handwritten signature image. The tool quickly creates a transparent signature preview.
3. If automatic background removal is still running in the background, you can already use the current preview; the tool will replace it with a cleaner result if the automatic process succeeds.
4. Drag the signature preview onto the target PDF page, or click the add button to place it on the current page.
5. Move the signature box to the right position and resize it with the bottom-right handle.
6. Review all signature placements, then export the signed PDF.

## Signature Image Tips

For best results, use a clear signature written on plain white paper with even lighting. Black or blue ink usually works best. The tool first creates a fast transparent PNG by cleaning up a white background locally. When the browser supports it, it also tries more advanced automatic background removal in the background. Because JPEG does not support transparency, the final signature asset is normalized to PNG before it is embedded into the PDF.

If the source image has strong shadows, paper wrinkles, uneven lighting, a busy background, or very light handwriting, automatic background removal may not be perfect. Cropping the image around the signature or taking a clearer, higher-contrast photo usually improves the result.

## Privacy and Local Processing

This PDF signing tool is designed for local browser processing. Your PDF, signature image, signature positions, and exported file are handled in the browser and are not uploaded to a server. When you save a signature in the browser, it is stored in local browser storage for reuse in this tool only. You can remove the saved signature at any time.

## How It Works

PDF preview rendering is powered by PDF.js. The draggable signature is placed on a separate overlay layer, so moving and resizing the signature does not modify the original PDF while you are editing. During export, the tool converts browser preview coordinates into PDF coordinates, then uses pdf-lib to embed the transparent PNG signature into the selected PDF pages. This keeps the editor responsive while producing a standard downloadable PDF.
