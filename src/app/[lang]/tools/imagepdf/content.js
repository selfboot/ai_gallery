"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import FileUploadBox from "@/app/components/FileUploadBox";
import Modal from "@/app/components/Modal";
import { useI18n } from "@/app/i18n/client";
import { formatFileSize, getImagePlacement, getPageSize, getResizeDimensions, shouldResizeImage } from "./logic";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEFAULT_SETTINGS = {
  pageSize: "a4",
  orientation: "auto",
  fitMode: "contain",
  margin: 24,
  maxSide: 2400,
  jpegQuality: 0.9,
  addPageNumbers: false,
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

async function prepareImageBytes(item, settings) {
  const image = await fileToImage(item.file);
  const nextSize = getResizeDimensions(image.naturalWidth, image.naturalHeight, settings.maxSide);
  const needsCanvas = item.type === "image/webp" || shouldResizeImage(image.naturalWidth, image.naturalHeight, settings.maxSide);

  if (!needsCanvas && item.type === "image/png") {
    return {
      bytes: await item.file.arrayBuffer(),
      format: "png",
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  if (!needsCanvas && item.type === "image/jpeg") {
    return {
      bytes: await item.file.arrayBuffer(),
      format: "jpg",
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = nextSize.width;
  canvas.height = nextSize.height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", settings.jpegQuality));
  if (!blob) {
    throw new Error("canvas export failed");
  }

  return {
    bytes: await blob.arrayBuffer(),
    format: "jpg",
    width: nextSize.width,
    height: nextSize.height,
  };
}

export default function ImagePdfContent() {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
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

  const handleFileUpload = async (uploadedFiles) => {
    setStatusMessage("");
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const errors = [];
    const validFiles = files.filter((file) => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t("imagepdf_invalid_format")}`);
        return false;
      }
      if (images.some((item) => item.name === file.name && item.size === file.size)) {
        errors.push(`${file.name}: ${t("imagepdf_file_exists")}`);
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
      setStatusMessage(t("imagepdf_files_added", { count: loadedImages.length }));
    } catch (error) {
      console.error("Image load failed:", error);
      showModal(t("imagepdf_read_error"), "error");
    } finally {
      setIsProcessing(false);
    }
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

  const clearImages = () => {
    images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setImages([]);
    setProgressText("");
    setStatusMessage("");
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

  const handleDropCard = (index) => {
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }
    moveImage(draggedIndex, index);
    setDraggedIndex(null);
  };

  const createPdf = async () => {
    if (images.length === 0) {
      showModal(t("imagepdf_min_files_error"), "error");
      return;
    }

    setIsProcessing(true);
    setProgressText("");

    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (let index = 0; index < images.length; index += 1) {
        const item = images[index];
        setProgressText(t("imagepdf_progress", { current: index + 1, total: images.length }));
        const prepared = await prepareImageBytes(item, settings);
        const pageSize = getPageSize(settings.pageSize, settings.orientation, prepared.width, prepared.height);
        const page = pdfDoc.addPage([pageSize.width, pageSize.height]);
        const embeddedImage = prepared.format === "png" ? await pdfDoc.embedPng(prepared.bytes) : await pdfDoc.embedJpg(prepared.bytes);
        const placement = getImagePlacement({
          pageWidth: pageSize.width,
          pageHeight: pageSize.height,
          imageWidth: prepared.width,
          imageHeight: prepared.height,
          margin: settings.pageSize === "image" ? 0 : settings.margin,
          fitMode: settings.pageSize === "image" ? "contain" : settings.fitMode,
          reserveFooter: settings.addPageNumbers,
        });

        page.drawImage(embeddedImage, placement);

        if (settings.addPageNumbers) {
          const text = `${index + 1} / ${images.length}`;
          const size = 10;
          const textWidth = font.widthOfTextAtSize(text, size);
          page.drawText(text, {
            x: (pageSize.width - textWidth) / 2,
            y: 12,
            size,
            font,
            color: rgb(0.35, 0.35, 0.35),
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const fileName = `${t("imagepdf_output_filename")}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
      saveAs(new Blob([pdfBytes], { type: "application/pdf" }), fileName);
      showModal(t("imagepdf_success"), "success");
    } catch (error) {
      console.error("Image to PDF failed:", error);
      showModal(t("imagepdf_convert_error"), "error");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("imagepdf_upload_title")}</h2>
          <FileUploadBox accept={IMAGE_ACCEPT} multiple onChange={handleFileUpload} title={t("imagepdf_upload_hint")} maxSize={80} className="min-h-32" />
          <p className="text-xs text-gray-500 mt-3">{t("imagepdf_upload_note")}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t("imagepdf_settings_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("imagepdf_page_size")}</span>
              <select value={settings.pageSize} onChange={(event) => updateSetting("pageSize", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                {["a4", "letter", "a3", "a5", "image"].map((item) => (
                  <option key={item} value={item}>
                    {t(`imagepdf_page_${item}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("imagepdf_orientation")}</span>
              <select value={settings.orientation} onChange={(event) => updateSetting("orientation", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" disabled={settings.pageSize === "image"}>
                {["auto", "portrait", "landscape"].map((item) => (
                  <option key={item} value={item}>
                    {t(`imagepdf_orientation_${item}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("imagepdf_fit_mode")}</span>
              <select value={settings.fitMode} onChange={(event) => updateSetting("fitMode", event.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" disabled={settings.pageSize === "image"}>
                {["contain", "noUpscale", "cover"].map((item) => (
                  <option key={item} value={item}>
                    {t(`imagepdf_fit_${item}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("imagepdf_margin")}</span>
              <input type="number" min="0" max="96" value={settings.margin} onChange={(event) => updateSetting("margin", Number(event.target.value))} className="w-full border border-gray-300 rounded px-3 py-2" disabled={settings.pageSize === "image"} />
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("imagepdf_max_side")}</span>
              <select value={settings.maxSide} onChange={(event) => updateSetting("maxSide", Number(event.target.value))} className="w-full border border-gray-300 rounded px-3 py-2">
                {[1600, 2400, 3200, 0].map((item) => (
                  <option key={item} value={item}>
                    {item === 0 ? t("imagepdf_max_side_original") : t("imagepdf_max_side_value", { value: item })}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              <span className="block font-medium mb-1">{t("imagepdf_quality")}</span>
              <select value={settings.jpegQuality} onChange={(event) => updateSetting("jpegQuality", Number(event.target.value))} className="w-full border border-gray-300 rounded px-3 py-2">
                {[0.82, 0.9, 0.96].map((item) => (
                  <option key={item} value={item}>
                    {t(`imagepdf_quality_${String(item).replace(".", "_")}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700 md:col-span-2">
              <input type="checkbox" checked={settings.addPageNumbers} onChange={(event) => updateSetting("addPageNumbers", event.target.checked)} className="mt-1" />
              <span>{t("imagepdf_add_page_numbers")}</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("imagepdf_action_title")}</h2>
            <p className="text-sm text-gray-600 mt-1">{t("imagepdf_privacy_note")}</p>
            {progressText && <p className="text-sm text-blue-700 mt-2">{progressText}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={createPdf} disabled={isProcessing || images.length === 0} className={`px-5 py-3 rounded font-medium text-white ${isProcessing || images.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {isProcessing ? t("imagepdf_processing") : t("imagepdf_convert_button", { count: images.length })}
            </button>
            <button onClick={clearImages} disabled={isProcessing || images.length === 0} className={`px-5 py-3 rounded font-medium ${images.length === 0 || isProcessing ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-gray-800"}`}>
              {t("imagepdf_clear_all")}
            </button>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-semibold">{t("imagepdf_uploaded_images", { count: images.length })}</h2>
              {statusMessage && <span className="text-sm text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1">{statusMessage}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {images.map((item, index) => (
              <div
                key={item.id}
                className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-move"
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDropCard(index)}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">#{index + 1}</span>
                  <div className="flex items-center space-x-1">
                    <button onClick={() => moveImage(index, index - 1)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title={t("imagepdf_move_up")}>↑</button>
                    <button onClick={() => moveImage(index, index + 1)} disabled={index === images.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title={t("imagepdf_move_down")}>↓</button>
                    <button onClick={() => removeImage(index)} className="p-1 text-red-500 hover:text-red-700" title={t("imagepdf_delete")}>×</button>
                  </div>
                </div>
                <div className="aspect-[4/3] bg-white rounded border border-gray-200 overflow-hidden flex items-center justify-center mb-2">
                  <img src={item.previewUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
                </div>
                <p className="text-sm font-medium text-gray-700 truncate" title={item.name}>{item.name}</p>
                <p className="text-xs text-gray-500 mt-1">{item.width} × {item.height}</p>
                <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">{t("imagepdf_order_hint")}</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} type={modalType}>
        <div className="text-gray-700 whitespace-pre-line">{modalMessage}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {t("imagepdf_confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
