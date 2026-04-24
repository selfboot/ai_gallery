"use client";

import { useMemo, useState } from "react";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  EDITABLE_FIELDS,
  IMAGE_METADATA_ACCEPT,
  canEditExif,
  canPreviewType,
  flattenMetadata,
  formatFileSize,
  formatMetadataValue,
  getEditableValues,
  getImageType,
  getMetadataExplanationKey,
  makeEditedFileName,
  makeImageId,
  makeMetadataFileName,
} from "./logic";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif", ".tif", ".tiff"];

const EXIFR_OPTIONS = {
  tiff: true,
  xmp: true,
  icc: true,
  iptc: true,
  jfif: true,
  ihdr: true,
  ifd0: true,
  ifd1: true,
  exif: true,
  gps: true,
  interop: true,
  makerNote: true,
  userComment: true,
  reviveValues: false,
};

function isSupportedImage(file) {
  const name = String(file?.name || "").toLowerCase();
  return String(file?.type || "").startsWith("image/") || SUPPORTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, body] = String(dataUrl).split(",");
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(body || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function normalizeExifDate(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}:${isoMatch[3]} ${isoMatch[4]}:${isoMatch[5]}:${isoMatch[6] || "00"}`;
  }
  return text;
}

async function parseImageMetadata(file) {
  const exifr = await import("exifr");
  const [grouped, merged] = await Promise.all([
    exifr.parse(file, { ...EXIFR_OPTIONS, mergeOutput: false }).catch((error) => ({ parseError: error.message })),
    exifr.parse(file, { ...EXIFR_OPTIONS, mergeOutput: true }).catch(() => ({})),
  ]);
  return { grouped: grouped || {}, merged: merged || {} };
}

async function loadImageMetadata(file) {
  const previewUrl = canPreviewType(file) ? URL.createObjectURL(file) : "";
  const { grouped, merged } = await parseImageMetadata(file);
  const flatMetadata = flattenMetadata(grouped);

  return {
    id: makeImageId(file),
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    imageType: getImageType(file),
    previewUrl,
    metadata: grouped,
    mergedMetadata: merged,
    flatMetadata,
    canEdit: canEditExif(file),
    parseError: grouped?.parseError || "",
  };
}

export default function ImageMetadataContent() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [expandedPreviewIds, setExpandedPreviewIds] = useState([]);
  const [editorValues, setEditorValues] = useState(getEditableValues());
  const [filter, setFilter] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) || items[0] || null, [items, selectedId]);
  const visibleMetadata = useMemo(() => {
    const text = filter.trim().toLowerCase();
    const rows = selectedItem?.flatMetadata || [];
    if (!text) {
      return rows;
    }
    return rows.filter((row) => `${row.key} ${formatMetadataValue(row.value)}`.toLowerCase().includes(text));
  }, [filter, selectedItem]);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const selectItem = (item) => {
    setSelectedId(item.id);
    setEditorValues(getEditableValues(item.mergedMetadata));
    setFilter("");
  };

  const togglePreview = (item) => {
    selectItem(item);
    setExpandedPreviewIds((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]));
  };

  const showFieldExplanation = (fieldPath) => {
    const explanationKey = getMetadataExplanationKey(fieldPath);
    showModal(`${fieldPath}\n\n${t(explanationKey, { field: fieldPath })}`);
  };

  const handleFileUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!isSupportedImage(file)) {
        errors.push(`${file.name}: ${t("imagemetadata_invalid_format")}`);
        return false;
      }
      if (items.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("imagemetadata_file_exists")}`);
        return false;
      }
      return true;
    });

    if (errors.length > 0) {
      showModal(errors.join("\n"), "error");
    }
    if (validFiles.length === 0) {
      return;
    }

    setIsProcessing(true);
    setProgressText("");
    try {
      const loaded = [];
      for (let index = 0; index < validFiles.length; index += 1) {
        setProgressText(t("imagemetadata_reading_progress", { current: index + 1, total: validFiles.length }));
        loaded.push(await loadImageMetadata(validFiles[index]));
      }

      setItems((current) => [...current, ...loaded]);
      if (!selectedItem && loaded[0]) {
        selectItem(loaded[0]);
      }
      setStatusMessage(t("imagemetadata_files_added", { count: loaded.length }));
    } catch (error) {
      console.error("Image metadata read failed:", error);
      showModal(t("imagemetadata_read_error"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const removeItem = (itemId) => {
    setItems((current) => {
      const target = current.find((item) => item.id === itemId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const next = current.filter((item) => item.id !== itemId);
      if (selectedId === itemId) {
        const nextSelected = next[0] || null;
        setSelectedId(nextSelected?.id || "");
        setEditorValues(getEditableValues(nextSelected?.mergedMetadata));
      }
      setExpandedPreviewIds((currentExpanded) => currentExpanded.filter((id) => id !== itemId));
      return next;
    });
  };

  const clearAll = () => {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setItems([]);
    setSelectedId("");
    setExpandedPreviewIds([]);
    setEditorValues(getEditableValues());
    setFilter("");
    setStatusMessage("");
  };

  const downloadMetadataJson = (item = selectedItem) => {
    if (!item) {
      showModal(t("imagemetadata_no_file_error"), "error");
      return;
    }
    const payload = {
      file: {
        name: item.name,
        size: item.size,
        type: item.type,
        detectedType: item.imageType,
      },
      metadata: item.metadata,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    saveAs(blob, makeMetadataFileName(item.name));
  };

  const exportEditedJpeg = async () => {
    if (!selectedItem) {
      showModal(t("imagemetadata_no_file_error"), "error");
      return;
    }
    if (!selectedItem.canEdit) {
      showModal(t("imagemetadata_jpeg_only_error"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText(t("imagemetadata_writing"));
    try {
      const piexifModule = await import("piexifjs");
      const piexif = piexifModule.default || piexifModule;
      const dataUrl = await readAsDataUrl(selectedItem.file);
      const exifObj = piexif.load(dataUrl);
      exifObj["0th"] = exifObj["0th"] || {};
      exifObj.Exif = exifObj.Exif || {};

      exifObj["0th"][piexif.ImageIFD.ImageDescription] = editorValues.imageDescription || "";
      exifObj["0th"][piexif.ImageIFD.Artist] = editorValues.artist || "";
      exifObj["0th"][piexif.ImageIFD.Copyright] = editorValues.copyright || "";
      exifObj["0th"][piexif.ImageIFD.Make] = editorValues.make || "";
      exifObj["0th"][piexif.ImageIFD.Model] = editorValues.model || "";
      const dateTimeOriginal = normalizeExifDate(editorValues.dateTimeOriginal);
      if (dateTimeOriginal) {
        exifObj.Exif[piexif.ExifIFD.DateTimeOriginal] = dateTimeOriginal;
      } else {
        delete exifObj.Exif[piexif.ExifIFD.DateTimeOriginal];
      }

      const exifBytes = piexif.dump(exifObj);
      const outputDataUrl = piexif.insert(exifBytes, dataUrl);
      saveAs(dataUrlToBlob(outputDataUrl), makeEditedFileName(selectedItem.name));
      setStatusMessage(t("imagemetadata_write_success"));
    } catch (error) {
      console.error("EXIF write failed:", error);
      showModal(t("imagemetadata_write_error"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const clearJpegMetadata = async () => {
    if (!selectedItem) {
      showModal(t("imagemetadata_no_file_error"), "error");
      return;
    }
    if (!selectedItem.canEdit) {
      showModal(t("imagemetadata_jpeg_only_error"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText(t("imagemetadata_writing"));
    try {
      const piexifModule = await import("piexifjs");
      const piexif = piexifModule.default || piexifModule;
      const dataUrl = await readAsDataUrl(selectedItem.file);
      const outputDataUrl = piexif.remove(dataUrl);
      saveAs(dataUrlToBlob(outputDataUrl), makeEditedFileName(selectedItem.name));
      setStatusMessage(t("imagemetadata_clear_success"));
    } catch (error) {
      console.error("EXIF clear failed:", error);
      showModal(t("imagemetadata_write_error"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  return (
    <div className="mx-auto mt-4 w-full">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t("imagemetadata_upload_title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("imagemetadata_upload_note")}</p>
            <div className="mt-5">
              <FileUploadBox accept={IMAGE_METADATA_ACCEPT} multiple onChange={handleFileUpload} title={t("imagemetadata_upload_hint")} maxSize={120} className="min-h-32" />
            </div>
            {progressText && <p className="mt-3 text-sm text-blue-700">{progressText}</p>}
            {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagemetadata_images_title", { count: items.length })}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("imagemetadata_images_hint")}</p>
              </div>
              <button onClick={clearAll} disabled={items.length === 0 || isProcessing} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                {t("imagemetadata_clear_all")}
              </button>
            </div>

            {items.length === 0 ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("imagemetadata_no_files")}</div>
            ) : (
              <div className="mt-5">
                <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded border transition ${selectedItem?.id === item.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <button type="button" onClick={() => selectItem(item)} className="flex w-full gap-3 p-3 text-left">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-semibold uppercase text-gray-500">
                          {item.imageType}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-950" title={item.name}>{item.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{formatFileSize(item.size)} · {item.imageType.toUpperCase()}</p>
                          <p className="mt-1 text-xs text-gray-500">{t("imagemetadata_tags_count", { count: item.flatMetadata.length })}</p>
                        </div>
                        <span className={`mt-1 rounded px-2 py-1 text-[11px] font-medium ${item.canEdit ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {item.canEdit ? t("imagemetadata_editable") : t("imagemetadata_view_only")}
                        </span>
                      </button>
                      <div className="border-t border-gray-100 px-3 pb-3">
                        <button type="button" onClick={() => togglePreview(item)} className="rounded bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200">
                          {expandedPreviewIds.includes(item.id) ? t("imagemetadata_collapse_preview") : t("imagemetadata_expand_preview")}
                        </button>
                      </div>
                      {expandedPreviewIds.includes(item.id) && (
                        <div className="border-t border-blue-100 p-4">
                          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded border border-gray-200 bg-white">
                            {item.previewUrl ? (
                              <img src={item.previewUrl} alt={item.name} className="h-full w-full object-contain" />
                            ) : (
                              <div className="px-4 text-center text-sm text-gray-500">{t("imagemetadata_preview_unavailable")}</div>
                            )}
                          </div>
                          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded bg-white px-3 py-2">
                              <dt className="text-gray-500">{t("imagemetadata_file_name")}</dt>
                              <dd className="mt-1 truncate font-medium text-gray-900" title={item.name}>{item.name}</dd>
                            </div>
                            <div className="rounded bg-white px-3 py-2">
                              <dt className="text-gray-500">{t("imagemetadata_file_type")}</dt>
                              <dd className="mt-1 font-medium text-gray-900">{item.imageType.toUpperCase()}</dd>
                            </div>
                            <div className="rounded bg-white px-3 py-2">
                              <dt className="text-gray-500">{t("imagemetadata_file_size")}</dt>
                              <dd className="mt-1 font-medium text-gray-900">{formatFileSize(item.size)}</dd>
                            </div>
                            <div className="rounded bg-white px-3 py-2">
                              <dt className="text-gray-500">{t("imagemetadata_metadata_count")}</dt>
                              <dd className="mt-1 font-medium text-gray-900">{item.flatMetadata.length}</dd>
                            </div>
                          </dl>
                          {item.parseError && <p className="mt-3 rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-700">{t("imagemetadata_parse_warning")}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </aside>

        <main className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">{t("imagemetadata_detail_title")}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("imagemetadata_detail_hint")}</p>
              </div>
            </div>

            {!selectedItem ? (
              <div className="mt-5 rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500">{t("imagemetadata_select_empty")}</div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-base font-semibold text-gray-950">{t("imagemetadata_editor_title")}</h3>
                  <p className="mt-1 text-sm text-gray-600">{selectedItem.canEdit ? t("imagemetadata_editor_hint") : t("imagemetadata_editor_view_only_hint")}</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {EDITABLE_FIELDS.map((field) => (
                      <label key={field.key} className="block text-sm text-gray-700">
                        <span className="mb-2 block font-medium">{t(field.labelKey)}</span>
                        <input
                          type="text"
                          value={editorValues[field.key] || ""}
                          onChange={(event) => setEditorValues((current) => ({ ...current, [field.key]: event.target.value }))}
                          disabled={!selectedItem.canEdit}
                          className="w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={exportEditedJpeg} disabled={!selectedItem.canEdit || isProcessing} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                      {t("imagemetadata_export_jpeg")}
                    </button>
                    <button onClick={() => downloadMetadataJson()} disabled={!selectedItem} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                      {t("imagemetadata_download_json")}
                    </button>
                    <button onClick={clearJpegMetadata} disabled={!selectedItem.canEdit || isProcessing} className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                      {t("imagemetadata_clear_jpeg")}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-950">{t("imagemetadata_table_title")}</h3>
                      <p className="mt-1 text-sm text-gray-600">{t("imagemetadata_table_hint")}</p>
                    </div>
                    <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t("imagemetadata_filter_placeholder")} className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-64" />
                  </div>
                  <div className="mt-3 max-h-[620px] overflow-auto rounded border border-gray-200">
                    {visibleMetadata.length === 0 ? (
                      <div className="bg-gray-50 px-4 py-8 text-sm text-gray-500">{t("imagemetadata_no_metadata")}</div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr>
                            <th className="w-72 px-3 py-2 text-left font-semibold text-gray-700">{t("imagemetadata_key")}</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">{t("imagemetadata_value")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {visibleMetadata.map((row) => (
                            <tr key={row.key}>
                              <td className="break-all px-3 py-2 font-mono text-xs">
                                <button type="button" onClick={() => showFieldExplanation(row.key)} className="text-left text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-900">
                                  {row.key}
                                </button>
                              </td>
                              <td className="max-w-[520px] break-words px-3 py-2 text-gray-800">{formatMetadataValue(row.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
            <h2 className="font-semibold">{t("imagemetadata_privacy_title")}</h2>
            <p className="mt-1">{t("imagemetadata_privacy_note")}</p>
          </section>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className={`whitespace-pre-line ${modalType === "error" ? "text-red-700" : "text-gray-700"}`}>{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            {t("imagemetadata_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
