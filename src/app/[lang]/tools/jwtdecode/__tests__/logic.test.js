import { base64UrlDecode, base64UrlEncode, extractTimeClaims, makeRandomJwt, parseJwt } from "../logic";

describe("jwtdecode logic", () => {
  test("encodes and decodes unicode base64url text", () => {
    const text = JSON.stringify({ name: "测试 User" });
    expect(base64UrlDecode(base64UrlEncode(text))).toBe(text);
  });

  test("parses generated jwt example", () => {
    const token = makeRandomJwt(1700000000, "abc12345");
    const parsed = parseJwt(token);
    expect(parsed.header.alg).toBe("HS256");
    expect(parsed.payload.sub).toBe("user_abc12345");
    expect(parsed.payload.exp).toBe(1700003600);
    expect(parsed.signature.length).toBeGreaterThan(0);
  });

  test("extracts time claims with state", () => {
    const claims = extractTimeClaims({ iat: 100, nbf: 200, exp: 50 }, "en-US", 100);
    expect(claims.map((claim) => claim.field)).toEqual(["iat", "exp", "nbf"]);
    expect(claims.find((claim) => claim.field === "exp").state).toBe("past");
    expect(claims.find((claim) => claim.field === "nbf").state).toBe("future");
  });

  test("rejects malformed jwt", () => {
    expect(() => parseJwt("abc.def")).toThrow("three");
    expect(() => parseJwt("abc.def.ghi")).toThrow("Header");
  });
});
