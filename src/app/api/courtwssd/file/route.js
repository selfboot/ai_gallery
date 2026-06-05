import { assertAllowedPdfUrl, jsonResponse, sanitizeFileName } from "../utils";

export const runtime = "edge";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = assertAllowedPdfUrl(searchParams.get("url"));
    const name = sanitizeFileName(searchParams.get("name") || "court-document.pdf");
    const response = await fetch(fileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return jsonResponse({ error: "file_request_failed" }, response.status);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "invalid_file_url" }, 400);
  }
}
