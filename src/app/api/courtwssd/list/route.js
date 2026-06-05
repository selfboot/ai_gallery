import { fetchDeliveryFiles, jsonResponse } from "../utils";

export const runtime = "edge";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await fetchDeliveryFiles(body?.url);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error.message || "court_request_failed" }, 400);
  }
}
