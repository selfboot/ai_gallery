"use client";

import { useMemo, useState } from "react";
import { saveAs } from "file-saver";
import { useI18n } from "@/app/i18n/client";
import { extractTimeClaims, makePrettyJson, makeRandomJwt, parseJwt } from "./logic";

function getLocale(lang) {
  return lang === "zh" ? "zh-CN" : "en-US";
}

function getStatusClass(claim) {
  if (claim.field === "exp" && claim.state === "past") return "border-red-200 bg-red-50 text-red-800";
  if (claim.field === "nbf" && claim.state === "future") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

export default function JwtDecodeContent() {
  const { t, lang } = useI18n();
  const [token, setToken] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const result = useMemo(() => {
    if (!token.trim()) return { parsed: null, error: "" };
    try {
      return { parsed: parseJwt(token), error: "" };
    } catch (error) {
      return { parsed: null, error: error?.message || t("jwtdecode_invalid") };
    }
  }, [token, t]);

  const headerJson = useMemo(() => (result.parsed ? makePrettyJson(result.parsed.header) : ""), [result.parsed]);
  const payloadJson = useMemo(() => (result.parsed ? makePrettyJson(result.parsed.payload) : ""), [result.parsed]);
  const timeClaims = useMemo(
    () => (result.parsed ? extractTimeClaims(result.parsed.payload, getLocale(lang)) : []),
    [lang, result.parsed]
  );
  const signatureLength = result.parsed?.signature?.length || 0;

  const loadExample = () => {
    setToken(makeRandomJwt());
    setCopyStatus("");
  };

  const clearAll = () => {
    setToken("");
    setCopyStatus("");
  };

  const copyText = async (text, message) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyStatus(message);
  };

  const downloadJson = () => {
    if (!result.parsed) return;
    saveAs(
      new Blob(
        [
          makePrettyJson({
            header: result.parsed.header,
            payload: result.parsed.payload,
            signature: result.parsed.signature,
            signatureVerified: false,
            note: "Decoded locally only. Signature is not verified.",
          }),
        ],
        { type: "application/json;charset=utf-8" }
      ),
      "decoded-jwt.json"
    );
  };

  return (
    <div className="mx-auto mt-4 w-full space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">{t("jwtdecode_workspace_title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{t("jwtdecode_workspace_hint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadExample} className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
              {t("jwtdecode_random_example")}
            </button>
            <button onClick={downloadJson} disabled={!result.parsed} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300">
              {t("jwtdecode_download_json")}
            </button>
            <button onClick={clearAll} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              {t("jwtdecode_clear")}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">{t("jwtdecode_input_label")}</span>
              <textarea
                value={token}
                onChange={(event) => {
                  setToken(event.target.value);
                  setCopyStatus("");
                }}
                spellCheck={false}
                placeholder={t("jwtdecode_input_placeholder")}
                className="min-h-[360px] w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-6 text-gray-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("jwtdecode_time_title")}</h3>
              {timeClaims.length ? (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {timeClaims.map((claim) => (
                    <div key={claim.field} className={`rounded border p-3 text-sm ${getStatusClass(claim)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono font-semibold">{claim.field}</span>
                        <span className="font-mono text-xs">{claim.raw}</span>
                      </div>
                      <p className="mt-1">{claim.text}</p>
                      <p className="mt-1 break-all font-mono text-xs">{claim.iso}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">{t("jwtdecode_no_time_claims")}</p>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-900">
              <h3 className="font-semibold">{t("jwtdecode_signature_notice_title")}</h3>
              <p className="mt-1">{t("jwtdecode_signature_notice")}</p>
            </section>

            <section className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("jwtdecode_summary_title")}</h3>
              {result.error ? (
                <p className="mt-3 text-sm text-red-700">{result.error}</p>
              ) : result.parsed ? (
                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between gap-3">
                    <dt>{t("jwtdecode_algorithm")}</dt>
                    <dd className="font-mono">{result.parsed.header.alg || "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t("jwtdecode_type")}</dt>
                    <dd className="font-mono">{result.parsed.header.typ || "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t("jwtdecode_signature_length")}</dt>
                    <dd className="font-mono">{signatureLength}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t("jwtdecode_verified")}</dt>
                    <dd className="font-semibold text-red-700">{t("jwtdecode_not_verified")}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-gray-500">{t("jwtdecode_empty_summary")}</p>
              )}
            </section>

          </aside>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-950">{t("jwtdecode_header_title")}</h2>
            <button onClick={() => copyText(headerJson, t("jwtdecode_copied_header"))} disabled={!headerJson} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:text-gray-400">
              {t("jwtdecode_copy")}
            </button>
          </div>
          <pre className="mt-3 min-h-72 overflow-auto rounded bg-gray-950 p-4 text-sm leading-6 text-gray-100">{headerJson || t("jwtdecode_no_decoded")}</pre>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-950">{t("jwtdecode_payload_title")}</h2>
            <button onClick={() => copyText(payloadJson, t("jwtdecode_copied_payload"))} disabled={!payloadJson} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:text-gray-400">
              {t("jwtdecode_copy")}
            </button>
          </div>
          <pre className="mt-3 min-h-72 overflow-auto rounded bg-gray-950 p-4 text-sm leading-6 text-gray-100">{payloadJson || t("jwtdecode_no_decoded")}</pre>
        </div>
      </section>

      {copyStatus && <p className="text-sm text-green-700">{copyStatus}</p>}
    </div>
  );
}
