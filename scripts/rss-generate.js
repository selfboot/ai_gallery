#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const pagesDirectory = path.join(__dirname, "../src/pages");
const outputMetadataFile = path.join(__dirname, "../page-metadata.json");

function convertToRFC822(dateStr) {
  const date = new Date(dateStr);
  return date.toUTCString(); // 返回 RFC-822 格式的日期字符串
}

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
      const publishedDateMatch = content.match(/publishedDate="([^"]+)"/);
      const updatedDateMatch = content.match(/updatedDate="([^"]+)"/);

      const title = titleMatch ? titleMatch[1] : "";
      const description = descriptionMatch ? descriptionMatch[1] : "";
      const url = canonicalMatch
        ? canonicalMatch[1]
        : path.relative(pagesDirectory, filePath).replace(/\.js$/, "").replace(/\\/g, "/");
        const publishedDate = publishedDateMatch ? publishedDateMatch[1] : "";
        const updatedDate = updatedDateMatch ? updatedDateMatch[1] : "";

      if (title && description) {
        metadataList.push({
          title: title,
          description: description,
          url: url,
          publishedDate: publishedDate ? convertToRFC822(publishedDate) : "",
          updatedDate: updatedDate ? convertToRFC822(updatedDate) : ""
        });
      }
    }
  });

  return metadataList;
}

const metadata = extractMetadata(pagesDirectory);
fs.writeFileSync(outputMetadataFile, JSON.stringify(metadata, null, 2), "utf8");
console.log("Page metadata extracted and saved.");
