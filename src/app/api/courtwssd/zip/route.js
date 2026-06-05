import PizZip from "pizzip";
import { fetchDeliveryFiles, jsonResponse, sanitizeFileName } from "../utils";

export const runtime = "edge";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await fetchDeliveryFiles(body?.url);
    if (!result.files.length) {
      return jsonResponse({ error: "no_files" }, 404);
    }

    const zip = new PizZip();
    for (const file of result.files) {
      const response = await fetch(file.sourceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
      if (!response.ok) {
        throw new Error("file_request_failed");
      }
      zip.file(`${String(file.index).padStart(2, "0")}_${sanitizeFileName(file.name)}`, await response.arrayBuffer());
    }

    const bytes = zip.generate({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename*=UTF-8''court-delivery-documents.zip",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "zip_failed" }, 400);
  }
}
