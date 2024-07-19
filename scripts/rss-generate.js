#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const pagesDirectory = path.join(__dirname, "../src/pages");
const outputMetadataFile = path.join(__dirname, "../page-metadata.json");

function extractMetadata(directory) {
  const files = fs.readdirSync(directory);
  const metadataList = [];

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      // 递归处理子目录
      metadataList.push(...extractMetadata(filePath));
    } else if (path.extname(file) === ".js") {
      // 处理 JavaScript 文件
      const content = fs.readFileSync(filePath, "utf8");

      // 使用正则表达式匹配 title 和 description
      const titleMatch = content.match(/title="([^"]+)"/);
      const descriptionMatch = content.match(/description="([^"]+)"/);
      const canonicalMatch = content.match(/canonicalUrl="([^"]+)"/); // 匹配完整 URL

      const title = titleMatch ? titleMatch[1] : "";
      const description = descriptionMatch ? descriptionMatch[1] : "";
      const url = canonicalMatch
        ? canonicalMatch[1]
        : path.relative(pagesDirectory, filePath).replace(/\.js$/, "").replace(/\\/g, "/");

      if (title && description) {
        metadataList.push({ title, description, url });
      }
    }
  });

  return metadataList;
}

const metadata = extractMetadata(pagesDirectory);
fs.writeFileSync(outputMetadataFile, JSON.stringify(metadata, null, 2), "utf8");
console.log("Page metadata extracted and saved.");
