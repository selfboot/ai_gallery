import { PDFDocument } from "pdf-lib";
import { fetchDeliveryFiles, jsonResponse } from "../utils";

export const runtime = "edge";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await fetchDeliveryFiles(body?.url);
    if (!result.files.length) {
      return jsonResponse({ error: "no_files" }, 404);
    }

    const mergedPdf = await PDFDocument.create();
    for (const file of result.files) {
      const response = await fetch(file.sourceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
      if (!response.ok) {
        throw new Error("file_request_failed");
      }

      const sourcePdf = await PDFDocument.load(await response.arrayBuffer(), { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const bytes = await mergedPdf.save();

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename*=UTF-8''court-delivery-documents.pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "merge_failed" }, 400);
  }
}
