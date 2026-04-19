"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import {
  IMAGE_INSERT_MODES,
  PAGE_NUMBER_POSITIONS,
  clampInsertAfterPage,
  fitImageIntoBox,
  formatFileSize,
  getAutoGridBoxes,
  getPageNumberDrawPosition,
  groupImagesForAutoLayout,
  makeOutputFileName,
} from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEFAULT_SETTINGS = {
  insertAfterPage: 0,
  insertMode: "auto",
  addPageNumbers: false,
  pageNumberPosition: "bottomCenter",
  pageNumberStart: 1,
  pageNumberFontSize: 10,
};

function makeImageId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function loadImageInfo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        id: makeImageId(file),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        width: image.naturalWidth,
        height: image.naturalHeight,
        previewUrl: url,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    image.src = url;
  });
}

async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToJpegBytes(file) {
  const image = await fileToImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) {
    throw new Error("canvas export failed");
  }
  return blob.arrayBuffer();
}

async function embedImage(pdfDoc, item) {
  if (item.type === "image/png") {
    return pdfDoc.embedPng(await item.file.arrayBuffer());
  }
  if (item.type === "image/jpeg") {
    return pdfDoc.embedJpg(await item.file.arrayBuffer());
  }
  return pdfDoc.embedJpg(await canvasToJpegBytes(item.file));
}

function getReferencePageSize(pdfDoc, insertAfterPage) {
  const pageCount = pdfDoc.getPageCount();
  if (pageCount === 0) {
    return { width: 595.28, height: 841.89 };
  }
  const referenceIndex = Math.min(Math.max(insertAfterPage - 1, 0), pageCount - 1);
  return pdfDoc.getPage(referenceIndex).getSize();
}

export default function PdfAddImageContent() {
  const { t } = useI18n();
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [images, setImages] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = (message, type = "info") => {
    setModalMessage(message);
    setModalType(type);
    setIsModalOpen(true);
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handlePdfUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showModal(t("pdfaddimage_error_invalid_pdf"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText(t("pdfaddimage_reading_pdf"));
    setStatusMessage("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfDoc = await PDFDocument.load(bytes.slice(), { ignoreEncryption: true });
      const total = pdfDoc.getPageCount();
      setPdfFile(file);
      setPdfBytes(bytes);
      setPageCount(total);
      setSettings((current) => ({ ...current, insertAfterPage: clampInsertAfterPage(current.insertAfterPage, total) }));
      setStatusMessage(t("pdfaddimage_pdf_loaded", { count: total }));
    } catch (error) {
      console.error("PDF read failed:", error);
      showModal(t("pdfaddimage_error_read_pdf"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  const handleImageUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t("pdfaddimage_error_invalid_image")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("pdfaddimage_error_image_exists")}`);
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
    try {
      const loadedImages = await Promise.all(validFiles.map(loadImageInfo));
      setImages((current) => [...current, ...loadedImages]);
      setStatusMessage(t("pdfaddimage_images_added", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image read failed:", error);
      showModal(t("pdfaddimage_error_read_image"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const moveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= images.length) {
      return;
    }
    setImages((current) => {
      const nextImages = [...current];
      const [movedImage] = nextImages.splice(fromIndex, 1);
      nextImages.splice(toIndex, 0, movedImage);
      return nextImages;
    });
  };

  const removeImage = (index) => {
    setImages((current) => {
      const target = current[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const clearAll = () => {
    images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPdfFile(null);
    setPdfBytes(null);
    setPageCount(0);
    setImages([]);
    setSettings(DEFAULT_SETTINGS);
    setProgressText("");
    setStatusMessage("");
  };

  const insertSingleImagePages = async ({ pdfDoc, embeddedImages, insertIndex, pageWidth, pageHeight }) => {
    for (let index = 0; index < embeddedImages.length; index += 1) {
      const { item, image } = embeddedImages[index];
      const page = pdfDoc.insertPage(insertIndex + index, [pageWidth, pageHeight]);
      const box = fitImageIntoBox({
        box: { x: 36, y: 36, width: pageWidth - 72, height: pageHeight - 72 },
        imageWidth: item.width,
        imageHeight: item.height,
      });
      page.drawImage(image, box);
    }
    return embeddedImages.length;
  };

  const insertAutoImagePages = async ({ pdfDoc, embeddedImages, insertIndex, pageWidth, pageHeight }) => {
    const groups = groupImagesForAutoLayout(embeddedImages.map(({ item, image }) => ({ ...item, image })));
    groups.forEach((group, groupIndex) => {
      const page = pdfDoc.insertPage(insertIndex + groupIndex, [pageWidth, pageHeight]);
      const boxes = getAutoGridBoxes({ pageWidth, pageHeight, count: group.length, margin: 36, gap: 18 });
      group.forEach((entry, imageIndex) => {
        const box = fitImageIntoBox({
          box: boxes[imageIndex],
          imageWidth: entry.width,
          imageHeight: entry.height,
        });
        page.drawImage(entry.image, box);
      });
    });
    return groups.length;
  };

  const addPageNumbers = async (pdfDoc) => {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = Number(settings.pageNumberFontSize) || 10;
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      const text = String(index + Number(settings.pageNumberStart || 1));
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const position = getPageNumberDrawPosition({
        pageWidth,
        pageHeight,
        textWidth,
        fontSize,
        position: settings.pageNumberPosition,
        margin: 28,
      });
      page.drawText(text, {
        ...position,
        size: fontSize,
        font,
        color: rgb(0.25, 0.29, 0.35),
      });
    });
  };

  const createPdf = async () => {
    if (!pdfBytes || !pdfFile) {
      showModal(t("pdfaddimage_error_missing_pdf"), "error");
      return;
    }
    if (images.length === 0 && !settings.addPageNumbers) {
      showModal(t("pdfaddimage_error_missing_work"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText("");

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(), { ignoreEncryption: true });
      const insertAfterPage = clampInsertAfterPage(settings.insertAfterPage, pdfDoc.getPageCount());
      const insertIndex = insertAfterPage;
      const { width: pageWidth, height: pageHeight } = getReferencePageSize(pdfDoc, insertAfterPage);

      if (images.length > 0) {
        const embeddedImages = [];
        for (let index = 0; index < images.length; index += 1) {
          setProgressText(t("pdfaddimage_progress_image", { current: index + 1, total: images.length }));
          embeddedImages.push({ item: images[index], image: await embedImage(pdfDoc, images[index]) });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        const insertedPages = settings.insertMode === "single"
          ? await insertSingleImagePages({ pdfDoc, embeddedImages, insertIndex, pageWidth, pageHeight })
          : await insertAutoImagePages({ pdfDoc, embeddedImages, insertIndex, pageWidth, pageHeight });
        setStatusMessage(t("pdfaddimage_inserted_pages", { count: insertedPages }));
      }

      if (settings.addPageNumbers) {
        setProgressText(t("pdfaddimage_progress_page_numbers"));
        await addPageNumbers(pdfDoc);
      }

      const outputBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 });
      saveAs(new Blob([outputBytes], { type: "application/pdf" }), makeOutputFileName(pdfFile.name));
      setStatusMessage(t("pdfaddimage_success"));
    } catch (error) {
      console.error("Insert images into PDF failed:", error);
      showModal(t("pdfaddimage_error_process"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfaddimage_pdf_upload_title")}</h2>
          <FileUploadBox accept=".pdf" onChange={handlePdfUpload} title={t("pdfaddimage_pdf_upload_hint")} maxSize={180} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("pdfaddimage_pdf_upload_note")}</p>
          {pdfFile && (
            <div className="mt-4 rounded border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium truncate" title={pdfFile.name}>{pdfFile.name}</p>
              <p>{formatFileSize(pdfFile.size)} · {t("pdfaddimage_page_count", { count: pageCount })}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfaddimage_image_upload_title")}</h2>
          <FileUploadBox accept={IMAGE_ACCEPT} multiple onChange={handleImageUpload} title={t("pdfaddimage_image_upload_hint")} maxSize={80} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("pdfaddimage_image_upload_note")}</p>
          {statusMessage && <p className="mt-3 text-sm text-green-700">{statusMessage}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfaddimage_insert_settings_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("pdfaddimage_insert_after_page")}</span>
              <input
                type="number"
                min="0"
                max={pageCount || 0}
                value={settings.insertAfterPage}
                onChange={(event) => updateSetting("insertAfterPage", clampInsertAfterPage(event.target.value, pageCount))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <span className="mt-1 block text-xs text-gray-500">{t("pdfaddimage_insert_after_hint")}</span>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("pdfaddimage_insert_mode")}</span>
              <select value={settings.insertMode} onChange={(event) => updateSetting("insertMode", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                {Object.entries(IMAGE_INSERT_MODES).map(([key, option]) => (
                  <option key={key} value={key}>{t(option.labelKey)}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-gray-500">
                {settings.insertMode === "single" ? t("pdfaddimage_insert_mode_single_hint") : t("pdfaddimage_insert_mode_auto_hint")}
              </span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("pdfaddimage_page_number_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-2 text-sm text-gray-700 md:col-span-2">
              <input type="checkbox" checked={settings.addPageNumbers} onChange={(event) => updateSetting("addPageNumbers", event.target.checked)} className="mt-1" />
              <span>{t("pdfaddimage_add_page_numbers")}</span>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("pdfaddimage_page_number_position")}</span>
              <select value={settings.pageNumberPosition} onChange={(event) => updateSetting("pageNumberPosition", event.target.value)} disabled={!settings.addPageNumbers} className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100">
                {Object.entries(PAGE_NUMBER_POSITIONS).map(([key, option]) => (
                  <option key={key} value={key}>{t(option.labelKey)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("pdfaddimage_page_number_start")}</span>
              <input type="number" min="0" value={settings.pageNumberStart} disabled={!settings.addPageNumbers} onChange={(event) => updateSetting("pageNumberStart", Number(event.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100" />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("pdfaddimage_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("pdfaddimage_privacy_note")}</p>
            {progressText && <p className="text-sm text-blue-700 mt-2">{progressText}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={createPdf} disabled={isProcessing || !pdfFile} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || !pdfFile ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("pdfaddimage_processing") : t("pdfaddimage_generate_button")}
            </button>
            <button onClick={clearAll} disabled={isProcessing || (!pdfFile && images.length === 0)} className={`px-5 py-3 rounded font-medium ${(!pdfFile && images.length === 0) || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("pdfaddimage_clear")}
            </button>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-1">{t("pdfaddimage_images_title", { count: images.length })}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("pdfaddimage_images_hint")}</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {images.map((item, index) => (
              <div key={item.id} className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={item.previewUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
                  <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">#{index + 1}</span>
                </div>
                <div className="p-3">
                  <p className="font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.width} × {item.height} · {formatFileSize(item.size)}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button onClick={() => moveImage(index, index - 1)} disabled={isProcessing || index === 0} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">{t("pdfaddimage_move_up")}</button>
                    <button onClick={() => moveImage(index, index + 1)} disabled={isProcessing || index === images.length - 1} className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">{t("pdfaddimage_move_down")}</button>
                    <button onClick={() => removeImage(index)} disabled={isProcessing} className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                      {t("pdfaddimage_delete_image")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("pdfaddimage_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
