export const IMAGE_METADATA_ACCEPT = ".jpg,.jpeg,.png,.webp,.avif,.heic,.heif,.tif,.tiff";

export const EDITABLE_FIELDS = [
  { key: "imageDescription", labelKey: "imagemetadata_field_description" },
  { key: "artist", labelKey: "imagemetadata_field_artist" },
  { key: "copyright", labelKey: "imagemetadata_field_copyright" },
  { key: "make", labelKey: "imagemetadata_field_make" },
  { key: "model", labelKey: "imagemetadata_field_model" },
  { key: "dateTimeOriginal", labelKey: "imagemetadata_field_date_time_original" },
];

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function getImageType(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  if (type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "jpeg";
  }
  if (type === "image/png" || name.endsWith(".png")) {
    return "png";
  }
  if (type === "image/webp" || name.endsWith(".webp")) {
    return "webp";
  }
  if (type === "image/avif" || name.endsWith(".avif")) {
    return "avif";
  }
  if (type.includes("heic") || type.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif")) {
    return "heic";
  }
  if (type === "image/tiff" || name.endsWith(".tif") || name.endsWith(".tiff")) {
    return "tiff";
  }
  return "unknown";
}

export function canPreviewType(file) {
  return ["jpeg", "png", "webp", "avif"].includes(getImageType(file));
}

export function canEditExif(file) {
  return getImageType(file) === "jpeg";
}

export function makeImageId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

export function makeMetadataFileName(fileName) {
  const baseName = String(fileName || "image").replace(/\.[^.]+$/, "") || "image";
  return `${baseName}-metadata.json`;
}

export function makeEditedFileName(fileName) {
  const baseName = String(fileName || "image").replace(/\.[^.]+$/, "") || "image";
  return `${baseName}-metadata-edited.jpg`;
}

export function formatMetadataValue(value) {
  if (value == null) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (ArrayBuffer.isView(value)) {
    return `[${value.constructor.name}, ${value.byteLength} bytes]`;
  }
  if (value instanceof ArrayBuffer) {
    return `[ArrayBuffer, ${value.byteLength} bytes]`;
  }
  if (Array.isArray(value)) {
    return value.map(formatMetadataValue).join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function flattenMetadata(value, prefix = "") {
  if (value == null || typeof value !== "object" || value instanceof Date || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return prefix ? [{ key: prefix, value }] : [];
  }

  const entries = [];
  Object.entries(value).forEach(([key, childValue]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (childValue && typeof childValue === "object" && !(childValue instanceof Date) && !Array.isArray(childValue) && !ArrayBuffer.isView(childValue) && !(childValue instanceof ArrayBuffer)) {
      entries.push(...flattenMetadata(childValue, nextKey));
    } else {
      entries.push({ key: nextKey, value: childValue });
    }
  });

  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

export function getEditableValues(metadata = {}) {
  return {
    imageDescription: formatMetadataValue(metadata.ImageDescription || metadata.description || ""),
    artist: formatMetadataValue(metadata.Artist || metadata.artist || ""),
    copyright: formatMetadataValue(metadata.Copyright || metadata.copyright || ""),
    make: formatMetadataValue(metadata.Make || ""),
    model: formatMetadataValue(metadata.Model || ""),
    dateTimeOriginal: formatMetadataValue(metadata.DateTimeOriginal || metadata.CreateDate || metadata.ModifyDate || ""),
  };
}

const METADATA_EXPLANATION_KEYS = {
  imagedescription: "imagemetadata_explain_image_description",
  artist: "imagemetadata_explain_artist",
  copyright: "imagemetadata_explain_copyright",
  make: "imagemetadata_explain_make",
  model: "imagemetadata_explain_model",
  lensmodel: "imagemetadata_explain_lens_model",
  software: "imagemetadata_explain_software",
  datetime: "imagemetadata_explain_datetime",
  datetimeoriginal: "imagemetadata_explain_datetime_original",
  createdate: "imagemetadata_explain_create_date",
  modifydate: "imagemetadata_explain_modify_date",
  orientation: "imagemetadata_explain_orientation",
  exposuretime: "imagemetadata_explain_exposure_time",
  fnumber: "imagemetadata_explain_f_number",
  iso: "imagemetadata_explain_iso",
  focallength: "imagemetadata_explain_focal_length",
  flash: "imagemetadata_explain_flash",
  whitebalance: "imagemetadata_explain_white_balance",
  meteringmode: "imagemetadata_explain_metering_mode",
  exposureprogram: "imagemetadata_explain_exposure_program",
  exposurecompensation: "imagemetadata_explain_exposure_compensation",
  shutterspeedvalue: "imagemetadata_explain_shutter_speed",
  aperturevalue: "imagemetadata_explain_aperture",
  colorspace: "imagemetadata_explain_color_space",
  profiledescription: "imagemetadata_explain_profile_description",
  imagewidth: "imagemetadata_explain_width",
  imageheight: "imagemetadata_explain_height",
  pixelxdimension: "imagemetadata_explain_width",
  pixelydimension: "imagemetadata_explain_height",
  compression: "imagemetadata_explain_compression",
  bitspersample: "imagemetadata_explain_bits_per_sample",
  makerNote: "imagemetadata_explain_maker_note",
  makernote: "imagemetadata_explain_maker_note",
  usercomment: "imagemetadata_explain_user_comment",
  gpslatitude: "imagemetadata_explain_gps_latitude",
  gpslongitude: "imagemetadata_explain_gps_longitude",
  gpsaltitude: "imagemetadata_explain_gps_altitude",
  gpsdatestamp: "imagemetadata_explain_gps_date",
};

export function getMetadataExplanationKey(fieldPath) {
  const path = String(fieldPath || "");
  const parts = path.split(".");
  const rawName = parts[parts.length - 1] || path;
  const normalized = rawName.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (METADATA_EXPLANATION_KEYS[rawName] || METADATA_EXPLANATION_KEYS[normalized]) {
    return METADATA_EXPLANATION_KEYS[rawName] || METADATA_EXPLANATION_KEYS[normalized];
  }

  const lowerPath = path.toLowerCase();
  if (lowerPath.includes("gps")) {
    return "imagemetadata_explain_gps_generic";
  }
  if (lowerPath.includes("xmp")) {
    return "imagemetadata_explain_xmp_generic";
  }
  if (lowerPath.includes("iptc")) {
    return "imagemetadata_explain_iptc_generic";
  }
  if (lowerPath.includes("icc")) {
    return "imagemetadata_explain_icc_generic";
  }
  if (lowerPath.includes("jfif")) {
    return "imagemetadata_explain_jfif_generic";
  }
  if (lowerPath.includes("ihdr")) {
    return "imagemetadata_explain_ihdr_generic";
  }
  if (lowerPath.includes("exif") || lowerPath.includes("ifd")) {
    return "imagemetadata_explain_exif_generic";
  }
  if (lowerPath.includes("tiff")) {
    return "imagemetadata_explain_tiff_generic";
  }
  return "imagemetadata_explain_generic";
}
