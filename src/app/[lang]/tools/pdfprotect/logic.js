export const PDF_PROTECT_ACCEPT = ".pdf";

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function makePdfId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

export function makeProtectedPdfName(fileName) {
  const baseName = String(fileName || "document.pdf").replace(/\.pdf$/i, "") || "document";
  return `${baseName}-protected.pdf`;
}

export function makeProtectedZipName() {
  return `protected_pdfs_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
}

export function makeUniqueFileName(fileName, usedNames) {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const extensionMatch = fileName.match(/(\.[^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  let index = 2;
  let candidate = `${baseName}_${index}${extension}`;
  while (usedNames.has(candidate)) {
    index += 1;
    candidate = `${baseName}_${index}${extension}`;
  }
  usedNames.add(candidate);
  return candidate;
}

export function validatePassword(password) {
  const text = String(password || "");
  if (text.length < 4) {
    return { ok: false, reason: "tooShort" };
  }
  if (text.length > 127) {
    return { ok: false, reason: "tooLong" };
  }
  return { ok: true };
}

export function summarizeResults(results) {
  return results.reduce(
    (summary, item) => ({
      count: summary.count + 1,
      originalSize: summary.originalSize + item.originalSize,
      outputSize: summary.outputSize + item.outputSize,
    }),
    { count: 0, originalSize: 0, outputSize: 0 }
  );
}
