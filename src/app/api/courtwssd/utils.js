const LIST_API = "https://zxfw.court.gov.cn/yzw/yzw-zxfw-sdfw/api/v1/sdfw/getWsListBySdbhNew";
const ALLOWED_PDF_HOSTS = new Set(["zxfy2-oss.oss-cn-north-2-gov-1.aliyuncs.com"]);

export function jsonResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

export function parseDeliveryLink(input) {
  let parsed;
  try {
    parsed = new URL(String(input || "").trim());
  } catch {
    throw new Error("invalid_link");
  }

  const hashQuery = parsed.hash.includes("?") ? parsed.hash.slice(parsed.hash.indexOf("?") + 1) : "";
  const hashParams = new URLSearchParams(hashQuery);
  const searchParams = parsed.searchParams;
  const getParam = (key) => hashParams.get(key) || searchParams.get(key) || "";
  const params = {
    qdbh: getParam("qdbh"),
    sdbh: getParam("sdbh"),
    sdsin: getParam("sdsin"),
    mm: getParam("mm"),
  };

  if (!params.sdbh) {
    throw new Error("missing_sdbh");
  }

  return params;
}

export function sanitizeFileName(name, fallback = "document") {
  return String(name || fallback)
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || fallback;
}

export function assertAllowedPdfUrl(input) {
  let parsed;
  try {
    parsed = new URL(String(input || ""));
  } catch {
    throw new Error("invalid_file_url");
  }

  if (parsed.protocol !== "https:" || !ALLOWED_PDF_HOSTS.has(parsed.hostname)) {
    throw new Error("invalid_file_url");
  }

  return parsed.toString();
}

export async function fetchDeliveryFiles(link) {
  const params = parseDeliveryLink(link);
  const response = await fetch(LIST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("court_request_failed");
  }

  const payload = await response.json();
  if (payload?.code !== 200 || !Array.isArray(payload?.data)) {
    throw new Error(payload?.msg || payload?.message || "court_response_failed");
  }

  const files = payload.data.map((item, index) => {
    const ext = String(item.c_wjgs || "pdf").replace(/^\./, "").toLowerCase();
    const baseName = sanitizeFileName(item.c_wsmc || `document-${index + 1}`, `document-${index + 1}`);
    const fileName = `${baseName}.${ext || "pdf"}`;
    return {
      id: item.c_wsbh || `${index + 1}`,
      index: index + 1,
      name: fileName,
      title: item.c_wsmc || baseName,
      format: ext || "pdf",
      courtName: item.c_fymc || "",
      createdAt: item.dt_cjsj || "",
      deliveryId: item.c_sdbh || "",
      storagePath: item.c_stbh || "",
      sourceUrl: assertAllowedPdfUrl(item.wjlj),
    };
  });

  return {
    params,
    files,
    count: files.length,
  };
}
