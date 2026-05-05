export const JWT_TIME_FIELDS = ["iat", "exp", "nbf"];

export function base64UrlToBase64(input) {
  const text = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = text.length % 4;
  return padding ? `${text}${"=".repeat(4 - padding)}` : text;
}

export function base64UrlDecode(input) {
  const base64 = base64UrlToBase64(input);
  if (typeof atob === "function" && typeof TextDecoder === "function") {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export function base64UrlEncode(text) {
  const json = String(text || "");
  let base64;
  if (typeof btoa === "function" && typeof TextEncoder === "function") {
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    base64 = btoa(binary);
  } else {
    base64 = Buffer.from(json, "utf8").toString("base64");
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function parseJsonSegment(segment, segmentName) {
  if (!segment) {
    throw new Error(`${segmentName} is missing`);
  }
  try {
    return JSON.parse(base64UrlDecode(segment));
  } catch (error) {
    throw new Error(`${segmentName} is not valid base64url JSON`);
  }
}

export function parseJwt(token) {
  const compact = String(token || "").trim();
  const parts = compact.split(".");
  if (parts.length !== 3) {
    throw new Error("JWT must contain three dot-separated parts");
  }
  return {
    header: parseJsonSegment(parts[0], "Header"),
    payload: parseJsonSegment(parts[1], "Payload"),
    signature: parts[2],
    parts,
  };
}

export function getUnixTimeState(value, nowSeconds = Math.floor(Date.now() / 1000)) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return "invalid";
  if (seconds > nowSeconds) return "future";
  return "past";
}

export function formatUnixTime(value, locale = "en-US", nowSeconds = Math.floor(Date.now() / 1000)) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) {
    return { valid: false, text: "", state: "invalid", seconds: null };
  }
  const date = new Date(seconds * 1000);
  return {
    valid: true,
    text: date.toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    iso: date.toISOString(),
    state: getUnixTimeState(seconds, nowSeconds),
    seconds,
  };
}

export function extractTimeClaims(payload, locale = "en-US", nowSeconds = Math.floor(Date.now() / 1000)) {
  return JWT_TIME_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(payload || {}, field)).map((field) => ({
    field,
    raw: payload[field],
    ...formatUnixTime(payload[field], locale, nowSeconds),
  }));
}

export function makePrettyJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}

export function makeRandomJwt(nowSeconds = Math.floor(Date.now() / 1000), randomText = Math.random().toString(36).slice(2, 10)) {
  const header = {
    alg: "HS256",
    typ: "JWT",
    kid: `demo-${randomText.slice(0, 6)}`,
  };
  const payload = {
    sub: `user_${randomText}`,
    name: "Demo User",
    role: "editor",
    iss: "https://gallery.selfboot.cn",
    aud: "jwtdecode-demo",
    iat: nowSeconds,
    nbf: nowSeconds - 60,
    exp: nowSeconds + 3600,
    permissions: ["read:profile", "write:draft"],
  };
  const signature = base64UrlEncode(`demo-signature-${randomText}`);
  return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.${signature}`;
}
