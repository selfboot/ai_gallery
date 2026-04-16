'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import FileUploadBox from '@/app/components/FileUploadBox';
import { useI18n } from "@/app/i18n/client";
import Modal from '@/app/components/Modal';
import Link from 'next/link';
import { SideAdComponent } from "@/app/components/AdComponent";
import numfmt from 'numfmt';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const BODY_REGEX = /<w:body[^>]*>([\s\S]*?)<\/w:body>/;
const SECTION_PROPS_REGEX = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/g;
const TRAILING_SECTION_PROPS_REGEX = /([\s\S]*)(<w:sectPr\b[\s\S]*?<\/w:sectPr>)\s*$/;
const TYPE_NODE_REGEX = /<w:type\b[^>]*(?:\/>|>[\s\S]*?<\/w:type>)/;
const PAGE_NUMBER_NODE_REGEX = /<w:pgNumType\b[^>]*(?:\/>|>[\s\S]*?<\/w:pgNumType>)/;
const RELATIONSHIP_REGEX = /<Relationship\b[^>]*\/>/g;
const RELATIONSHIP_ID_REGEX = /\b(?:r:id|r:embed|r:link)="([^"]+)"/g;
const REL_ATTR_REGEX = /\s([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
const CONTENT_TYPE_OVERRIDE_REGEX = /<Override\b[^>]*\/>/g;
const NUMBERING_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering';
const NUMBERING_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml';
const TYPE_INSERT_MARKERS = [
  '<w:pgSz',
  '<w:pgMar',
  '<w:paperSrc',
  '<w:pgBorders',
  '<w:lnNumType',
  '<w:pgNumType',
  '<w:cols',
  '<w:formProt',
  '<w:vAlign',
  '<w:noEndnote',
  '<w:titlePg',
  '<w:textFlow',
  '<w:bidi',
  '<w:rtlGutter',
  '<w:docGrid',
  '<w:sectPrChange',
  '</w:sectPr>',
];
const SPECIAL_REFERENCE_PARTS = [
  {
    relType: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes',
    defaultPath: 'word/footnotes.xml',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml',
    rootTag: 'w:footnotes',
    itemTag: 'w:footnote',
    bodyReferenceTags: ['w:footnoteReference'],
    isReservedId: (id) => Number(id) < 1,
  },
  {
    relType: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes',
    defaultPath: 'word/endnotes.xml',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml',
    rootTag: 'w:endnotes',
    itemTag: 'w:endnote',
    bodyReferenceTags: ['w:endnoteReference'],
    isReservedId: (id) => Number(id) < 1,
  },
  {
    relType: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments',
    defaultPath: 'word/comments.xml',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml',
    rootTag: 'w:comments',
    itemTag: 'w:comment',
    bodyReferenceTags: ['w:commentRangeStart', 'w:commentRangeEnd', 'w:commentReference'],
    isReservedId: () => false,
  },
];

const getXmlAttrs = (xml) => {
  const attrs = {};
  let match;

  REL_ATTR_REGEX.lastIndex = 0;
  while ((match = REL_ATTR_REGEX.exec(xml)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
};

const getRelationshipRelsPath = (partPath) => {
  const lastSlashIndex = partPath.lastIndexOf('/');
  const directory = lastSlashIndex === -1 ? '' : partPath.slice(0, lastSlashIndex + 1);
  const fileName = lastSlashIndex === -1 ? partPath : partPath.slice(lastSlashIndex + 1);
  return `${directory}_rels/${fileName}.rels`;
};

const getDirectory = (path) => {
  const lastSlashIndex = path.lastIndexOf('/');
  return lastSlashIndex === -1 ? '' : path.slice(0, lastSlashIndex + 1);
};

const normalizeZipPath = (path) => {
  const parts = [];

  path.split('/').forEach((part) => {
    if (!part || part === '.') {
      return;
    }

    if (part === '..') {
      parts.pop();
      return;
    }

    parts.push(part);
  });

  return parts.join('/');
};

const resolveRelationshipTargetPath = (sourcePartPath, target) => {
  if (target.startsWith('/')) {
    return normalizeZipPath(target.slice(1));
  }

  return normalizeZipPath(`${getDirectory(sourcePartPath)}${target}`);
};

const getRelativeTargetPath = (fromPartPath, toPartPath) => {
  const fromParts = getDirectory(fromPartPath).split('/').filter(Boolean);
  const toParts = toPartPath.split('/').filter(Boolean);

  while (fromParts.length > 0 && toParts.length > 0 && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }

  return `${fromParts.map(() => '..').join('/')}${fromParts.length > 0 ? '/' : ''}${toParts.join('/')}`;
};

const getUniqueZipPath = (zip, preferredPath) => {
  if (!zip.files[preferredPath]) {
    return preferredPath;
  }

  const extensionIndex = preferredPath.lastIndexOf('.');
  const baseName = extensionIndex === -1 ? preferredPath : preferredPath.slice(0, extensionIndex);
  const extension = extensionIndex === -1 ? '' : preferredPath.slice(extensionIndex);
  let index = 1;
  let nextPath = `${baseName}_${index}${extension}`;

  while (zip.files[nextPath]) {
    index += 1;
    nextPath = `${baseName}_${index}${extension}`;
  }

  return nextPath;
};

const getNextNumberedPartPath = (zip, prefix, extension) => {
  let maxNumber = 0;
  const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)\\.${extension}$`);

  Object.keys(zip.files).forEach((fileName) => {
    const match = fileName.match(regex);
    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  });

  return `${prefix}${maxNumber + 1}.${extension}`;
};

const getPreferredPartPath = (targetZip, sourcePartPath) => {
  const fileName = sourcePartPath.split('/').pop() || 'part.xml';

  if (/^word\/header\d+\.xml$/.test(sourcePartPath)) {
    return getNextNumberedPartPath(targetZip, 'word/header', 'xml');
  }

  if (/^word\/footer\d+\.xml$/.test(sourcePartPath)) {
    return getNextNumberedPartPath(targetZip, 'word/footer', 'xml');
  }

  if (sourcePartPath.startsWith('word/media/')) {
    const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
    return getNextNumberedPartPath(targetZip, 'word/media/image', extension);
  }

  return getUniqueZipPath(targetZip, sourcePartPath);
};

const parseRelationships = (relsXml = '') => {
  const relationships = [];
  let match;

  RELATIONSHIP_REGEX.lastIndex = 0;
  while ((match = RELATIONSHIP_REGEX.exec(relsXml)) !== null) {
    relationships.push(getXmlAttrs(match[0]));
  }

  return relationships;
};

const serializeRelationship = ({ Id, Type, Target, TargetMode }) => {
  const targetModeAttr = TargetMode ? ` TargetMode="${TargetMode}"` : '';
  return `<Relationship Id="${Id}" Type="${Type}" Target="${Target}"${targetModeAttr}/>`;
};

const serializeRelationships = (relationships) => (
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `${relationships.map(serializeRelationship).join('')}` +
  `</Relationships>`
);

const getContentTypeOverrides = (zip) => {
  const contentTypesXml = zip.files['[Content_Types].xml']?.asText() || '';
  const overrides = new Map();
  let match;

  CONTENT_TYPE_OVERRIDE_REGEX.lastIndex = 0;
  while ((match = CONTENT_TYPE_OVERRIDE_REGEX.exec(contentTypesXml)) !== null) {
    const attrs = getXmlAttrs(match[0]);
    if (attrs.PartName && attrs.ContentType) {
      overrides.set(attrs.PartName.replace(/^\//, ''), attrs.ContentType);
    }
  }

  return overrides;
};

const ensureContentTypeOverride = (zip, partPath, contentType) => {
  if (!contentType) {
    return;
  }

  const contentTypesFile = zip.files['[Content_Types].xml'];
  if (!contentTypesFile) {
    return;
  }

  const partName = `/${partPath}`;
  const contentTypesXml = contentTypesFile.asText();
  if (contentTypesXml.includes(`PartName="${partName}"`)) {
    return;
  }

  zip.file(
    '[Content_Types].xml',
    contentTypesXml.replace('</Types>', `<Override PartName="${partName}" ContentType="${contentType}"/></Types>`)
  );
};

const getNextRelationshipId = (relationships) => {
  const maxId = relationships.reduce((max, relationship) => {
    const match = relationship.Id?.match(/^rId(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `rId${maxId + 1}`;
};

const createRelationshipManager = (targetZip, relsPath = 'word/_rels/document.xml.rels') => {
  const relationships = parseRelationships(targetZip.files[relsPath]?.asText());

  return {
    add(relationship) {
      const nextRelationship = {
        ...relationship,
        Id: getNextRelationshipId(relationships),
      };
      relationships.push(nextRelationship);
      targetZip.file(relsPath, serializeRelationships(relationships));
      return nextRelationship.Id;
    },
    findByType(type) {
      return relationships.find((relationship) => relationship.Type === type);
    },
  };
};

const clonePartRelationships = (sourceZip, targetZip, sourcePartPath, targetPartPath, sourceContentTypeOverrides) => {
  const sourceRelsPath = getRelationshipRelsPath(sourcePartPath);
  const sourceRelsFile = sourceZip.files[sourceRelsPath];

  if (!sourceRelsFile) {
    return;
  }

  const targetRelationships = parseRelationships(sourceRelsFile.asText()).map((relationship) => {
    if (relationship.TargetMode === 'External') {
      return relationship;
    }

    const sourceRelatedPartPath = resolveRelationshipTargetPath(sourcePartPath, relationship.Target);
    const targetRelatedPartPath = cloneRelatedPart(
      sourceZip,
      targetZip,
      sourceRelatedPartPath,
      sourceContentTypeOverrides
    );

    return {
      ...relationship,
      Target: getRelativeTargetPath(targetPartPath, targetRelatedPartPath),
    };
  });

  targetZip.file(getRelationshipRelsPath(targetPartPath), serializeRelationships(targetRelationships));
};

const cloneRelatedPart = (sourceZip, targetZip, sourcePartPath, sourceContentTypeOverrides) => {
  const sourceFile = sourceZip.files[sourcePartPath];
  if (!sourceFile || sourceFile.dir) {
    throw new Error(`Cannot find related docx part: ${sourcePartPath}`);
  }

  const targetPartPath = getPreferredPartPath(targetZip, sourcePartPath);
  targetZip.file(targetPartPath, sourceFile.asArrayBuffer());
  ensureContentTypeOverride(targetZip, targetPartPath, sourceContentTypeOverrides.get(sourcePartPath));
  clonePartRelationships(sourceZip, targetZip, sourcePartPath, targetPartPath, sourceContentTypeOverrides);

  return targetPartPath;
};

const rebasePartRelationships = (
  sourceZip,
  targetZip,
  partContent,
  sourcePartPath,
  targetPartPath,
  targetRelationshipManager,
  sourceContentTypeOverrides
) => {
  const sourceRelationships = parseRelationships(sourceZip.files[getRelationshipRelsPath(sourcePartPath)]?.asText());
  const sourceRelationshipMap = new Map(sourceRelationships.map((relationship) => [relationship.Id, relationship]));
  const relationshipIdMap = new Map();

  return partContent.replace(RELATIONSHIP_ID_REGEX, (fullMatch, relationshipId) => {
    if (!relationshipIdMap.has(relationshipId)) {
      const relationship = sourceRelationshipMap.get(relationshipId);
      if (!relationship) {
        return fullMatch;
      }

      if (relationship.TargetMode === 'External') {
        relationshipIdMap.set(relationshipId, targetRelationshipManager.add(relationship));
      } else {
        const sourceRelatedPartPath = resolveRelationshipTargetPath(sourcePartPath, relationship.Target);
        const targetRelatedPartPath = cloneRelatedPart(sourceZip, targetZip, sourceRelatedPartPath, sourceContentTypeOverrides);
        relationshipIdMap.set(
          relationshipId,
          targetRelationshipManager.add({
            ...relationship,
            Target: getRelativeTargetPath(targetPartPath, targetRelatedPartPath),
          })
        );
      }
    }

    return fullMatch.replace(`"${relationshipId}"`, `"${relationshipIdMap.get(relationshipId)}"`);
  });
};

const rebaseReferencedRelationships = (sourceZip, targetZip, bodyContent, documentRelationshipManager) => {
  return rebasePartRelationships(
    sourceZip,
    targetZip,
    bodyContent,
    'word/document.xml',
    'word/document.xml',
    documentRelationshipManager,
    getContentTypeOverrides(sourceZip)
  );
};

const getRelationshipPartPath = (relationship) => {
  return relationship && relationship.TargetMode !== 'External'
    ? resolveRelationshipTargetPath('word/document.xml', relationship.Target)
    : null;
};

const getPartItems = (xml, itemTag) => {
  const regex = new RegExp(`<${itemTag}\\b[\\s\\S]*?<\\/${itemTag}>`, 'g');
  return xml.match(regex) || [];
};

const getPartItemId = (itemXml) => {
  return itemXml.match(/\bw:id="([^"]+)"/)?.[1] || null;
};

const replacePartItemId = (itemXml, nextId) => {
  return itemXml.replace(/\bw:id="[^"]+"/, `w:id="${nextId}"`);
};

const getMaxPartItemId = (xml, itemTag) => {
  return getPartItems(xml, itemTag).reduce((maxId, itemXml) => {
    const id = getPartItemId(itemXml);
    const numericId = Number(id);
    return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId;
  }, 0);
};

const appendPartItems = (xml, rootTag, items) => {
  if (items.length === 0) {
    return xml;
  }

  return xml.replace(`</${rootTag}>`, `${items.join('')}</${rootTag}>`);
};

const rebaseBodySpecialReferenceIds = (bodyContent, tagNames, idMap) => {
  if (idMap.size === 0) {
    return bodyContent;
  }

  const tagAlternation = tagNames.map((tagName) => tagName.replace(':', '\\:')).join('|');
  const referenceRegex = new RegExp(`(<(?:${tagAlternation})\\b[^>]*\\bw:id=")([^"]+)(")`, 'g');

  return bodyContent.replace(referenceRegex, (fullMatch, prefix, oldId, suffix) => {
    return idMap.has(oldId) ? `${prefix}${idMap.get(oldId)}${suffix}` : fullMatch;
  });
};

const getNumberingItemId = (itemXml, attrName) => {
  return itemXml.match(new RegExp(`\\b${attrName}="([^"]+)"`))?.[1] || null;
};

const replaceNumberingItemId = (itemXml, attrName, nextId) => {
  return itemXml.replace(new RegExp(`\\b${attrName}="[^"]+"`), `${attrName}="${nextId}"`);
};

const getNumberingItemsById = (numberingXml, itemTag, attrName) => {
  return new Map(
    getPartItems(numberingXml, itemTag)
      .map((itemXml) => [getNumberingItemId(itemXml, attrName), itemXml])
      .filter(([id]) => id !== null)
  );
};

const getMaxNumberingId = (numberingXml, itemTag, attrName) => {
  return getPartItems(numberingXml, itemTag).reduce((maxId, itemXml) => {
    const id = getNumberingItemId(itemXml, attrName);
    const numericId = Number(id);
    return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId;
  }, 0);
};

const getReferencedNumberingIds = (xml) => {
  const referencedIds = new Set();
  const regex = /<w:numId\b[^>]*\bw:val="([^"]+)"/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    referencedIds.add(match[1]);
  }

  return referencedIds;
};

const rebaseNumberingIdsInContent = (xml, numberingIdMap) => {
  if (!numberingIdMap || numberingIdMap.size === 0) {
    return xml;
  }

  return xml.replace(/(<w:numId\b[^>]*\bw:val=")([^"]+)(")/g, (fullMatch, prefix, oldId, suffix) => {
    return numberingIdMap.has(oldId) ? `${prefix}${numberingIdMap.get(oldId)}${suffix}` : fullMatch;
  });
};

const rebaseNumberingDefinitions = (sourceZip, targetZip, bodyContent, documentRelationshipManager) => {
  const sourceDocumentRelationships = parseRelationships(sourceZip.files['word/_rels/document.xml.rels']?.asText());
  const sourceRelationship = sourceDocumentRelationships.find((relationship) => relationship.Type === NUMBERING_REL_TYPE);
  const sourceNumberingPath = getRelationshipPartPath(sourceRelationship);
  const sourceNumberingFile = sourceNumberingPath ? sourceZip.files[sourceNumberingPath] : null;

  if (!sourceNumberingFile || sourceNumberingFile.dir) {
    return { bodyContent, numberingIdMap: new Map() };
  }

  const sourceContentTypeOverrides = getContentTypeOverrides(sourceZip);
  const targetRelationship = documentRelationshipManager.findByType(NUMBERING_REL_TYPE);
  const targetNumberingPath = getRelationshipPartPath(targetRelationship);
  const targetNumberingFile = targetNumberingPath ? targetZip.files[targetNumberingPath] : null;

  if (!targetRelationship || !targetNumberingFile || targetNumberingFile.dir) {
    const nextTargetNumberingPath = getUniqueZipPath(targetZip, 'word/numbering.xml');
    targetZip.file(nextTargetNumberingPath, sourceNumberingFile.asArrayBuffer());
    ensureContentTypeOverride(
      targetZip,
      nextTargetNumberingPath,
      sourceContentTypeOverrides.get(sourceNumberingPath) || NUMBERING_CONTENT_TYPE
    );
    clonePartRelationships(sourceZip, targetZip, sourceNumberingPath, nextTargetNumberingPath, sourceContentTypeOverrides);
    documentRelationshipManager.add({
      ...sourceRelationship,
      Target: getRelativeTargetPath('word/document.xml', nextTargetNumberingPath),
    });
    return { bodyContent, numberingIdMap: new Map() };
  }

  const relatedReferencePartsXml = SPECIAL_REFERENCE_PARTS.map((config) => {
    const relationship = sourceDocumentRelationships.find((item) => item.Type === config.relType);
    const partPath = getRelationshipPartPath(relationship);
    const partFile = partPath ? sourceZip.files[partPath] : null;
    return partFile && !partFile.dir ? partFile.asText() : '';
  }).join('');
  const referencedNumIds = getReferencedNumberingIds(`${bodyContent}${relatedReferencePartsXml}`);
  if (referencedNumIds.size === 0) {
    return { bodyContent, numberingIdMap: new Map() };
  }

  const sourceNumberingXml = sourceNumberingFile.asText();
  const targetNumberingXml = targetNumberingFile.asText();
  const sourceNumsById = getNumberingItemsById(sourceNumberingXml, 'w:num', 'w:numId');
  const sourceAbstractNumsById = getNumberingItemsById(sourceNumberingXml, 'w:abstractNum', 'w:abstractNumId');
  const numberingRelationshipManager = createRelationshipManager(targetZip, getRelationshipRelsPath(targetNumberingPath));

  let nextNumId = getMaxNumberingId(targetNumberingXml, 'w:num', 'w:numId') + 1;
  let nextAbstractNumId = getMaxNumberingId(targetNumberingXml, 'w:abstractNum', 'w:abstractNumId') + 1;
  const numberingIdMap = new Map();
  const abstractNumberingIdMap = new Map();
  const rebasedNums = [];
  const rebasedAbstractNums = [];

  referencedNumIds.forEach((oldNumId) => {
    const sourceNumXml = sourceNumsById.get(oldNumId);
    if (!sourceNumXml) {
      return;
    }

    const sourceAbstractNumId = sourceNumXml.match(/<w:abstractNumId\b[^>]*\bw:val="([^"]+)"/)?.[1];
    if (!sourceAbstractNumId) {
      return;
    }

    if (!abstractNumberingIdMap.has(sourceAbstractNumId)) {
      const sourceAbstractNumXml = sourceAbstractNumsById.get(sourceAbstractNumId);
      if (!sourceAbstractNumXml) {
        return;
      }

      const nextAbstractNumIdString = String(nextAbstractNumId);
      nextAbstractNumId += 1;
      abstractNumberingIdMap.set(sourceAbstractNumId, nextAbstractNumIdString);

      const rebasedAbstractNumXml = rebasePartRelationships(
        sourceZip,
        targetZip,
        replaceNumberingItemId(sourceAbstractNumXml, 'w:abstractNumId', nextAbstractNumIdString),
        sourceNumberingPath,
        targetNumberingPath,
        numberingRelationshipManager,
        sourceContentTypeOverrides
      );
      rebasedAbstractNums.push(rebasedAbstractNumXml);
    }

    const nextNumIdString = String(nextNumId);
    nextNumId += 1;
    numberingIdMap.set(oldNumId, nextNumIdString);
    rebasedNums.push(
      replaceNumberingItemId(sourceNumXml, 'w:numId', nextNumIdString)
        .replace(/(<w:abstractNumId\b[^>]*\bw:val=")[^"]+(")/, `$1${abstractNumberingIdMap.get(sourceAbstractNumId)}$2`)
    );
  });

  if (rebasedNums.length === 0) {
    return { bodyContent, numberingIdMap: new Map() };
  }

  const nextNumberingXml = targetNumberingXml.replace(
    '</w:numbering>',
    `${rebasedAbstractNums.join('')}${rebasedNums.join('')}</w:numbering>`
  );
  targetZip.file(targetNumberingPath, nextNumberingXml);

  return {
    bodyContent: rebaseNumberingIdsInContent(bodyContent, numberingIdMap),
    numberingIdMap,
  };
};

const mergeSpecialReferencePart = (
  sourceZip,
  targetZip,
  bodyContent,
  config,
  documentRelationshipManager,
  sourceDocumentRelationships,
  sourceContentTypeOverrides,
  numberingIdMap
) => {
  const sourceRelationship = sourceDocumentRelationships.find((relationship) => relationship.Type === config.relType);
  const sourcePartPath = getRelationshipPartPath(sourceRelationship);
  const sourcePartFile = sourcePartPath ? sourceZip.files[sourcePartPath] : null;

  if (!sourcePartFile || sourcePartFile.dir) {
    return bodyContent;
  }

  const existingTargetRelationship = documentRelationshipManager.findByType(config.relType);
  const existingTargetPartPath = getRelationshipPartPath(existingTargetRelationship);
  const existingTargetPartFile = existingTargetPartPath ? targetZip.files[existingTargetPartPath] : null;

  if (!existingTargetRelationship || !existingTargetPartFile || existingTargetPartFile.dir) {
    const targetPartPath = getUniqueZipPath(targetZip, config.defaultPath);
    const rebasedPartXml = rebasePartRelationships(
      sourceZip,
      targetZip,
      rebaseNumberingIdsInContent(sourcePartFile.asText(), numberingIdMap),
      sourcePartPath,
      targetPartPath,
      createRelationshipManager(targetZip, getRelationshipRelsPath(targetPartPath)),
      sourceContentTypeOverrides
    );
    targetZip.file(targetPartPath, rebasedPartXml);
    ensureContentTypeOverride(targetZip, targetPartPath, sourceContentTypeOverrides.get(sourcePartPath) || config.contentType);
    documentRelationshipManager.add({
      ...sourceRelationship,
      Target: getRelativeTargetPath('word/document.xml', targetPartPath),
    });
    return bodyContent;
  }

  let nextId = getMaxPartItemId(existingTargetPartFile.asText(), config.itemTag) + 1;
  const targetPartRelationshipManager = createRelationshipManager(targetZip, getRelationshipRelsPath(existingTargetPartPath));
  const idMap = new Map();
  const rebasedItems = getPartItems(sourcePartFile.asText(), config.itemTag)
    .filter((itemXml) => {
      const oldId = getPartItemId(itemXml);
      return oldId !== null && !config.isReservedId(oldId);
    })
    .map((itemXml) => {
      const oldId = getPartItemId(itemXml);
      const newId = String(nextId);
      nextId += 1;
      idMap.set(oldId, newId);

      const renumberedItem = replacePartItemId(itemXml, newId);
      const rebasedRelationshipsItem = rebasePartRelationships(
        sourceZip,
        targetZip,
        renumberedItem,
        sourcePartPath,
        existingTargetPartPath,
        targetPartRelationshipManager,
        sourceContentTypeOverrides
      );
      return rebaseNumberingIdsInContent(rebasedRelationshipsItem, numberingIdMap);
    });

  targetZip.file(existingTargetPartPath, appendPartItems(existingTargetPartFile.asText(), config.rootTag, rebasedItems));
  return rebaseBodySpecialReferenceIds(bodyContent, config.bodyReferenceTags, idMap);
};

const mergeSpecialReferenceParts = (sourceZip, targetZip, bodyContent, documentRelationshipManager, numberingIdMap) => {
  const sourceDocumentRelationships = parseRelationships(sourceZip.files['word/_rels/document.xml.rels']?.asText());
  const sourceContentTypeOverrides = getContentTypeOverrides(sourceZip);

  return SPECIAL_REFERENCE_PARTS.reduce((updatedBodyContent, config) => {
    return mergeSpecialReferencePart(
      sourceZip,
      targetZip,
      updatedBodyContent,
      config,
      documentRelationshipManager,
      sourceDocumentRelationships,
      sourceContentTypeOverrides,
      numberingIdMap
    );
  }, bodyContent);
};

const insertSectionChildBefore = (sectPr, childXml, markers) => {
  const markerIndexes = markers
    .map((marker) => sectPr.indexOf(marker))
    .filter((index) => index !== -1);

  const insertIndex = markerIndexes.length > 0 ? Math.min(...markerIndexes) : sectPr.lastIndexOf('</w:sectPr>');
  if (insertIndex === -1) {
    return sectPr;
  }

  return `${sectPr.slice(0, insertIndex)}${childXml}${sectPr.slice(insertIndex)}`;
};

const ensureSectionBreakType = (sectPr, type = 'nextPage') => {
  const typeXml = `<w:type w:val="${type}"/>`;

  if (TYPE_NODE_REGEX.test(sectPr)) {
    return sectPr.replace(TYPE_NODE_REGEX, typeXml);
  }

  return insertSectionChildBefore(sectPr, typeXml, TYPE_INSERT_MARKERS);
};

const preserveDocumentSections = (bodyContent, { isLastDocument }) => {
  const cleanedBodyContent = bodyContent
    .replace(/<w:sectPrChange\b[\s\S]*?<\/w:sectPrChange>/g, '')
    .replace(SECTION_PROPS_REGEX, (sectPr) => sectPr.replace(PAGE_NUMBER_NODE_REGEX, ''));

  const trailingSectionMatch = cleanedBodyContent.match(TRAILING_SECTION_PROPS_REGEX);
  if (!trailingSectionMatch) {
    return isLastDocument
      ? cleanedBodyContent
      : `${cleanedBodyContent}<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }

  const [, mainContent, finalSectionProps] = trailingSectionMatch;
  if (isLastDocument) {
    return `${mainContent}${finalSectionProps}`;
  }

  const sectionBreakProps = ensureSectionBreakType(finalSectionProps, 'nextPage');
  return `${mainContent}<w:p><w:pPr>${sectionBreakProps}</w:pPr></w:p>`;
};

const mergeGeneratedDocxFiles = (generatedFiles) => {
  const zips = generatedFiles.map((file) => new PizZip(file.content));
  const documentRelationshipManager = createRelationshipManager(zips[0]);
  const xmlContents = zips.map((zip) => {
    const documentXml = zip.files['word/document.xml'];
    if (!documentXml) {
      throw new Error('Cannot find word/document.xml');
    }
    return documentXml.asText();
  });

  const mergedBodies = xmlContents.map((xml, index) => {
    const match = xml.match(BODY_REGEX);
    if (!match) {
      throw new Error('Cannot read document body');
    }

    let bodyContent = match[1];

    if (index > 0) {
      bodyContent = rebaseReferencedRelationships(zips[index], zips[0], bodyContent, documentRelationshipManager);
      const numberingResult = rebaseNumberingDefinitions(zips[index], zips[0], bodyContent, documentRelationshipManager);
      bodyContent = numberingResult.bodyContent;
      bodyContent = mergeSpecialReferenceParts(
        zips[index],
        zips[0],
        bodyContent,
        documentRelationshipManager,
        numberingResult.numberingIdMap
      );
    }

    return preserveDocumentSections(bodyContent, {
      isLastDocument: index === xmlContents.length - 1,
    });
  });

  zips[0].file('word/document.xml', xmlContents[0].replace(BODY_REGEX, () => `<w:body>${mergedBodies.join('')}</w:body>`));
  return zips[0].generate({
    type: 'blob',
    mimeType: DOCX_MIME,
  });
};

/**
 * Extract a plain string value from an ExcelJS cell, handling all value types:
 * formula objects, rich text, hyperlinks, error values, dates, and numbers.
 */
const getCellValue = (cell) => {
  let value = cell.value;

  // Unwrap formula objects: { formula, result }
  if (value && typeof value === 'object' && value.result !== undefined) {
    value = value.result;
  }

  // Unwrap rich text objects: { richText: [{ text, font }, ...] }
  if (value && typeof value === 'object' && value.richText !== undefined) {
    value = value.richText.map((rt) => rt.text || '').join('');
  }

  // Unwrap hyperlink objects: { hyperlink, text }
  if (value && typeof value === 'object' && value.hyperlink !== undefined) {
    value = value.text || value.hyperlink || '';
  }

  // Unwrap error objects: { error: '#DIV/0!' }
  if (value && typeof value === 'object' && value.error !== undefined) {
    value = '';
  }

  // Apply Excel number format (numFmt) for dates and numbers
  if (cell.numFmt && value !== null && value !== undefined) {
    try {
      if (value instanceof Date) {
        // Convert JS Date to Excel serial number for numfmt
        const excelDate = 25569.0 + ((value.getTime() - value.getTimezoneOffset() * 60 * 1000) / (1000 * 60 * 60 * 24));
        value = numfmt.format(cell.numFmt, excelDate);
      } else if (typeof value === 'number') {
        value = numfmt.format(cell.numFmt, value);
      }
    } catch (err) {
      console.warn('格式化失败:', err);
      if (value instanceof Date) {
        value = `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日`;
      } else {
        value = value !== null && value !== undefined ? value.toString() : '';
      }
    }
  } else if (value instanceof Date) {
    value = `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日`;
  } else {
    value = value !== null && value !== undefined ? value.toString() : '';
  }

  return value;
};

export default function GenDocx() {
  const { t } = useI18n();
  const [excelFile, setExcelFile] = useState(null);
  const [wordTemplate, setWordTemplate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipReady, setIsZipReady] = useState(false);
  const zipRef = useRef(null);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [excelSheetNames, setExcelSheetNames] = useState([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [previewUrls, setPreviewUrls] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [uploadBoxResetKey, setUploadBoxResetKey] = useState(0);
  const excelUploadRequestIdRef = useRef(0);
  const generatedFilesRef = useRef([]);

  const totalPages = Math.ceil(excelData.length / pageSize);

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return excelData.slice(start, end);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const showError = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const clearGeneratedOutputs = () => {
    Object.values(previewUrls).forEach((url) => {
      URL.revokeObjectURL(url);
    });

    zipRef.current = null;
    generatedFilesRef.current = [];
    setIsZipReady(false);
    setPreviewUrls({});
  };

  const parseExcelSheet = async ({ file, sheetName, requestId }) => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      if (excelUploadRequestIdRef.current !== requestId) {
        return null;
      }

      const worksheet = workbook.getWorksheet(sheetName);

      if (!worksheet) {
        throw new Error(t('gendocx_error_worksheet'));
      }

      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cell.value?.toString();
        if (header) {
          headers.push(header.trim());
        }
      });

      if (excelUploadRequestIdRef.current !== requestId) {
        return null;
      }

      const data = [];
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = {};
        headers.forEach((header, index) => {
          const cell = row.getCell(index + 1);
          rowData[header] = getCellValue(cell);
        });
        data.push({
          ...rowData,
          fileName: '',
          status: t('gendocx_status_pending'),
        });
      }

      if (excelUploadRequestIdRef.current !== requestId) {
        return null;
      }

      return { headers, data };
    } catch (error) {
      if (excelUploadRequestIdRef.current !== requestId) {
        return null;
      }

      console.error('Excel reading error:', error);
      showError(`${t('gendocx_error_excel')} ${error.message}`);
      return null;
    }
  };

  const handleExcelUpload = async (file) => {
    const requestId = excelUploadRequestIdRef.current + 1;
    excelUploadRequestIdRef.current = requestId;
    setExcelFile(file);
    clearGeneratedOutputs();
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      if (excelUploadRequestIdRef.current !== requestId) {
        return;
      }

      const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
      const initialSheetName = sheetNames[0] || '';

      if (!initialSheetName) {
        throw new Error(t('gendocx_error_worksheet'));
      }

      setExcelSheetNames(sheetNames);
      setSelectedSheetName(initialSheetName);

      const parsedResult = await parseExcelSheet({
        file,
        sheetName: initialSheetName,
        requestId,
      });

      if (!parsedResult || excelUploadRequestIdRef.current !== requestId) {
        return;
      }

      setCurrentPage(1);
      setExcelHeaders(parsedResult.headers);
      setExcelData(parsedResult.data);
    } catch (error) {
      if (excelUploadRequestIdRef.current !== requestId) {
        return;
      }

      console.error('Excel reading error:', error);
      showError(`${t('gendocx_error_excel')} ${error.message}`);
    }
  };

  const handleSheetChange = async (sheetName) => {
    if (!excelFile) {
      return;
    }

    const requestId = excelUploadRequestIdRef.current + 1;
    excelUploadRequestIdRef.current = requestId;
    setSelectedSheetName(sheetName);
    clearGeneratedOutputs();

    const parsedResult = await parseExcelSheet({
      file: excelFile,
      sheetName,
      requestId,
    });

    if (!parsedResult || excelUploadRequestIdRef.current !== requestId) {
      return;
    }

    setCurrentPage(1);
    setExcelHeaders(parsedResult.headers);
    setExcelData(parsedResult.data);
  };

  const handleWordTemplateUpload = (file) => {
    setWordTemplate(file);
  };

  const handleGenerate = async () => {
    if (!excelFile || !wordTemplate) {
      showError(t('gendocx_error_noFiles'));
      return;
    }

    try {
      setIsGenerating(true);
      zipRef.current = new PizZip();
      generatedFilesRef.current = [];
      const newPreviewUrls = {};

      const templateContent = await wordTemplate.arrayBuffer();
      const templateName = wordTemplate.name.replace(/\.[^/.]+$/, '');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await excelFile.arrayBuffer());
      const worksheet = workbook.getWorksheet(selectedSheetName || 1);

      if (!worksheet) {
        throw new Error(t('gendocx_error_worksheet'));
      }

      const newResults = [];

      // Get headers
      const headers = {};
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cell.value?.toString();
        if (header) {
          headers[colNumber] = header.trim();
        }
      });

      // Process each row
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        try {
          const rowData = {};

          Object.entries(headers).forEach(([colNumber, header]) => {
            const cell = row.getCell(Number(colNumber));
            rowData[header] = getCellValue(cell);
          });

        //   console.log(`Processing row ${rowNumber}:`, rowData);

          const doc = new Docxtemplater(new PizZip(templateContent), {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
              start: '{{',
              end: '}}',
            },
            parser: (tag) => ({
              get: (scope) => {
                let value = scope[tag.trim()];
                if (value === undefined) {
                  console.warn(`Warning: Variable "${tag}" not found in data`);
                  return '';
                }
                return value;
              },
            }),
          });

          doc.render(rowData);

          const generatedDoc = doc.getZip().generate({
            type: 'blob',
            mimeType: DOCX_MIME,
          });

          // 尝试从第一列获取文件名，如果没有则使用默认格式
          let fileName;
          const firstColumnValue = getCellValue(row.getCell(1));
          if (firstColumnValue && firstColumnValue.trim()) {
            // 清理文件名中的非法字符
            const cleanFileName = firstColumnValue.trim()
              .replace(/[<>:"/\\|?*]/g, '_')  // 替换Windows非法字符
              .replace(/\s+/g, '_');         // 替换空格为下划线
            fileName = `${cleanFileName}.docx`;
          } else {
            // 如果第一列为空，使用原来的默认格式
            fileName = `${templateName}_${rowNumber - 1}.docx`;
          }
          const generatedContent = await generatedDoc.arrayBuffer();
          zipRef.current.file(fileName, generatedContent);
          generatedFilesRef.current.push({ fileName, content: generatedContent });

          newPreviewUrls[fileName] = URL.createObjectURL(generatedDoc);

          newResults.push({
            key: `${rowNumber - 1}`,
            fileName,
            status: t('gendocx_status_generated'),
          });
        } catch (error) {
          console.error(`Row ${rowNumber} error:`, error);
          newResults.push({
            key: `error_${rowNumber}`,
            fileName: `${t('gendocx_row')} ${rowNumber}`,
            status: t('gendocx_status_failed'),
          });
        }
      }

      setPreviewUrls(newPreviewUrls);

      const updatedData = [...excelData];
      newResults.forEach((result, index) => {
        updatedData[index] = {
          ...updatedData[index],
          fileName: result.fileName,
          status: result.status,
        };
      });
      setExcelData(updatedData);

      setIsZipReady(true);
    } catch (error) {
      console.error('Generation error:', error);
      showError(`${t('gendocx_error_generate')} ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = () => {
    if (zipRef.current) {
      try {
        const content = zipRef.current.generate({ type: 'blob' });
        saveAs(content, 'generated_docs.zip');
      } catch (error) {
        showError(t('gendocx_error_download'));
      }
    }
  };

  const handleDownloadMerged = () => {
    if (generatedFilesRef.current.length === 0) {
      return;
    }

    try {
      const content = mergeGeneratedDocxFiles(generatedFilesRef.current);
      saveAs(content, 'generated_docs_merged.docx');
    } catch (error) {
      console.error('Merge generated documents error:', error);
      showError(t('gendocx_error_download'));
    }
  };

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  const handleDownloadSingle = (fileName) => {
    const url = previewUrls[fileName];
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClearAll = () => {
    excelUploadRequestIdRef.current += 1;
    clearGeneratedOutputs();

    setExcelFile(null);
    setWordTemplate(null);
    setIsGenerating(false);
    setExcelHeaders([]);
    setExcelData([]);
    setExcelSheetNames([]);
    setSelectedSheetName('');
    setCurrentPage(1);
    setPageSize(10);
    setUploadBoxResetKey((prev) => prev + 1);
  };

  return (
    <div className="w-full mx-auto mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
      <div className="w-full">
          <FileUploadBox
            key={`word-${uploadBoxResetKey}`}
            accept=".docx"
            onChange={handleWordTemplateUpload}
            title={t('gendocx_uploadWord')}
            maxSize={50}
            className="h-full"
          />
        </div>
        <div className="w-full">
          <FileUploadBox
            key={`excel-${uploadBoxResetKey}`}
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            title={t('gendocx_uploadExcel')}
            maxSize={50}
            className="h-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-end lg:justify-between">
        {excelSheetNames.length > 1 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:min-w-[360px] lg:max-w-[520px]">
            <div className="lg:flex lg:items-center lg:gap-3">
            <label htmlFor="gendocx-sheet-select" className="block text-sm font-medium text-gray-700 mb-2 lg:mb-0 whitespace-nowrap">
              {t('gendocx_sheetSelect')}
            </label>
            <select
              id="gendocx-sheet-select"
              value={selectedSheetName}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="w-full lg:flex-1 border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {excelSheetNames.map((sheetName) => (
                <option key={sheetName} value={sheetName}>
                  {sheetName}
                </option>
              ))}
            </select>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
        <Link 
          href="./gendocx/temp" 
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-gray-700 bg-white border 
            border-gray-300 rounded-md hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 
            transition-all shadow-sm hover:shadow w-full sm:w-auto group"
        >
          <span className="group-hover:translate-x-0.5 transition-transform">{t('more_templates')}</span>
        </Link>

        <button
          onClick={handleClearAll}
          disabled={isGenerating || (!excelFile && !wordTemplate && excelData.length === 0 && !isZipReady)}
          className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 
            hover:text-red-600 hover:border-red-300 disabled:bg-gray-100 disabled:text-gray-400 
            disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md w-full sm:w-auto"
        >
          {t('gendocx_clearAll')}
        </button>

        <button
          onClick={handleGenerate}
          disabled={!excelFile || !wordTemplate || isGenerating}
          className={`px-6 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 
            disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md 
            hover:translate-y-[-1px] active:translate-y-0 w-full sm:w-auto`}
        >
          {isGenerating ? t('gendocx_generating') : t('gendocx_generate')}
        </button>
        
        <button
          onClick={handleDownloadAll}
          disabled={!isZipReady}
          className="px-6 py-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 
            disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md 
            hover:translate-y-[-1px] active:translate-y-0 w-full sm:w-auto"
        >
          {t('gendocx_downloadAll')}
        </button>

        <button
          onClick={handleDownloadMerged}
          disabled={!isZipReady}
          className="px-6 py-2.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 
            disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md 
            hover:translate-y-[-1px] active:translate-y-0 w-full sm:w-auto"
        >
          {t('gendocx_downloadMerged')}
        </button>
        </div>
      </div>

      <div className="hidden mt-4 md:relative md:block w-full bg-gray-100">
        <SideAdComponent format='horizontal'/>
      </div>

      {excelHeaders.length > 0 && (
        <div className="border rounded-lg overflow-hidden shadow relative">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {excelHeaders.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-[100px] bg-gray-50 shadow-l">
                    <div className="flex flex-col">
                      <span>{t('gendocx_fileName')}</span>
                      <span className="text-xs text-gray-400 normal-case">{t('gendocx_fileName_hint')}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 shadow-l">
                    {t('gendocx_status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentPageData().map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {excelHeaders.map((header, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row[header]}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm sticky right-[100px] bg-white shadow-l">
                      {row.fileName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm sticky right-0 bg-white shadow-l">
                      {row.status === t('gendocx_status_generated') ? (
                        <button
                          onClick={() => handleDownloadSingle(row.fileName)}
                          className="px-2 py-1 text-sm rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                          {t('gendocx_download')}
                        </button>
                      ) : (
                        <span
                          className={`px-2 py-1 text-sm rounded ${
                            row.status === t('gendocx_status_failed')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {t('gendocx_prevPage')}
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {t('gendocx_nextPage')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="pageSize" className="text-sm text-gray-700">
                    {t('gendocx_pageSize')}
                  </label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <p className="text-sm text-gray-700">
                  {t('gendocx_showing')} <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>{' '}
                  {t('gendocx_to')}
                  <span className="font-medium">{Math.min(currentPage * pageSize, excelData.length)}</span>{' '}
                  {t('gendocx_total')}
                  <span className="font-medium">{excelData.length}</span> {t('gendocx_items')}
                </p>
              </div>

              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <span className="sr-only">{t('gendocx_prevPage')}</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => handlePageChange(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === index + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <span className="sr-only">{t('gendocx_nextPage')}</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p className="text-gray-700">{modalMessage}</p>
      </Modal>
    </div>
  );
}
