/** @jest-environment node */
import { PDFDocument } from "pdf-lib";
import PizZip from "pizzip";
import { assertAllowedPdfUrl } from "../utils";
import { GET } from "../file/route";
import { POST as downloadZip } from "../zip/route";
import { POST as mergePdf } from "../merge/route";

const origin = "https://zxfy2-oss.oss-cn-north-2-gov-1.aliyuncs.com";
const signedUrl = `${origin}/folder/document%20one.pdf?Expires=123&Signature=a%2Bb%2F%3D&key=one&key=two`;
const originalFetch = global.fetch;
const requestFile = (url) => GET(new Request(`https://gallery.example/api/courtwssd/file?url=${encodeURIComponent(url)}`));
const requestBatch = () => new Request("https://gallery.example/api/courtwssd/zip", {
  method: "POST",
  body: JSON.stringify({ url: "https://zxfw.court.gov.cn/#/delivery?sdbh=test" }),
});
const listResponse = (url = signedUrl) => Response.json({
  code: 200,
  data: [{ wjlj: url, c_wsmc: "document", c_wjgs: "pdf" }],
});

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

describe("court document download destinations", () => {
  test.each([
    "", "not a URL", "http://127.0.0.1/private", "https://169.254.169.254/metadata",
    origin.replace("https:", "http:") + "/file.pdf",
    `${origin}.evil.example/file.pdf`, `${origin}:8443/file.pdf`,
    origin.replace("https://", "https://user:secret@") + "/file.pdf",
    `${origin}@evil.example/file.pdf`, "//evil.example/file.pdf",
  ])("rejects %s before making a request", async (url) => {
    const response = await requestFile(url);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_file_url" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("preserves signed query encoding and confines double-slash paths to the fixed origin", () => {
    expect(assertAllowedPdfUrl(signedUrl)).toBe(signedUrl);
    const url = assertAllowedPdfUrl(`${origin}//evil.example/file.pdf#ignored`);
    expect(new URL(url).origin).toBe(origin);
    expect(new URL(url).pathname).toBe("//evil.example/file.pdf");
    expect(new URL(url).hash).toBe("");
  });

  test("streams a valid document without changing the signed URL", async () => {
    global.fetch.mockResolvedValue(new Response("%PDF-test", { headers: { "content-type": "application/pdf" } }));
    const response = await requestFile(signedUrl);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("%PDF-test");
    expect(global.fetch).toHaveBeenCalledWith(signedUrl, expect.objectContaining({ redirect: "error" }));
  });

  test.each([["preview", requestFile], ["ZIP", downloadZip], ["merge", mergePdf]])(
    "%s rejects redirects instead of fetching their destination", async (name, handler) => {
      if (name !== "preview") global.fetch.mockResolvedValueOnce(listResponse());
      global.fetch.mockImplementation(async (_url, options) => {
        // Emulate Fetch's redirect:error behavior for an OSS redirect to an internal URL.
        if (options.redirect === "error") throw new TypeError("fetch failed");
        return new Response("private data");
      });
      const response = await handler(name === "preview" ? signedUrl : requestBatch());
      expect(response.status).toBe(400);
      expect(global.fetch).toHaveBeenLastCalledWith(signedUrl, expect.objectContaining({ redirect: "error" }));
      expect(global.fetch).toHaveBeenCalledTimes(name === "preview" ? 1 : 2);
    }
  );

  test.each([["ZIP", downloadZip], ["merge", mergePdf]])("%s rejects untrusted file URLs from the court list", async (_name, handler) => {
    global.fetch.mockResolvedValueOnce(listResponse("http://127.0.0.1/private"));
    const response = await handler(requestBatch());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_file_url" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("ZIP and merge still produce readable documents", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 300]);
    const bytes = await pdf.save();
    for (const handler of [downloadZip, mergePdf]) {
      global.fetch.mockResolvedValueOnce(listResponse()).mockResolvedValueOnce(new Response(bytes));
      const response = await handler(requestBatch());
      expect(response.status).toBe(200);
      const output = await response.arrayBuffer();
      const result = handler === downloadZip ? new PizZip(output).file("01_document.pdf").asUint8Array() : output;
      expect((await PDFDocument.load(result)).getPageCount()).toBe(1);
    }
  });
});
