export const SOCIAL_LIMITS = [
  { id: "x", labelKey: "wordcount_limit_x", limit: 280, metric: "chars" },
  { id: "threads", labelKey: "wordcount_limit_threads", limit: 500, metric: "chars" },
  { id: "metaTitle", labelKey: "wordcount_limit_meta_title", limit: 60, metric: "chars" },
  { id: "metaDescription", labelKey: "wordcount_limit_meta_description", limit: 160, metric: "chars" },
  { id: "xiaohongshuTitle", labelKey: "wordcount_limit_xhs_title", limit: 20, metric: "charsNoSpaces" },
  { id: "wechatTitle", labelKey: "wordcount_limit_wechat_title", limit: 64, metric: "charsNoSpaces" },
];

export function normalizeText(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function countChineseCharacters(text) {
  return normalizeText(text).match(/\p{Script=Han}/gu)?.length || 0;
}

export function countEnglishWords(text) {
  return normalizeText(text).match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g)?.length || 0;
}

export function countNumbers(text) {
  return normalizeText(text).match(/\b\d+(?:[.,]\d+)*\b/g)?.length || 0;
}

export function countParagraphs(text) {
  const normalized = normalizeText(text).trim();
  if (!normalized) return 0;
  return normalized.split(/\n\s*\n/g).filter((paragraph) => paragraph.trim()).length;
}

export function countSentences(text) {
  const normalized = normalizeText(text).trim();
  if (!normalized) return 0;
  const matches = normalized.match(/[^。！？!?。.]+[。！？!?。.]?/g) || [];
  return matches.filter((sentence) => sentence.trim()).length;
}

export function countLines(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;
  return normalized.split("\n").length;
}

export function estimateReadingTime(text) {
  const chineseCharacters = countChineseCharacters(text);
  const englishWords = countEnglishWords(text);
  const minutes = chineseCharacters / 300 + englishWords / 200;
  if (!normalizeText(text).trim()) return { minutes: 0, seconds: 0 };
  return {
    minutes: Math.max(1, Math.ceil(minutes)),
    seconds: Math.max(15, Math.round(minutes * 60)),
  };
}

export function analyzeText(text) {
  const normalized = normalizeText(text);
  const chars = normalized.length;
  const charsNoSpaces = normalized.replace(/\s/g, "").length;
  const chineseCharacters = countChineseCharacters(normalized);
  const englishWords = countEnglishWords(normalized);
  const numbers = countNumbers(normalized);
  const punctuation = normalized.match(/[\p{P}\p{S}]/gu)?.length || 0;
  const paragraphs = countParagraphs(normalized);
  const sentences = countSentences(normalized);
  const lines = countLines(normalized);
  const readingTime = estimateReadingTime(normalized);

  return {
    chars,
    charsNoSpaces,
    chineseCharacters,
    englishWords,
    numbers,
    punctuation,
    paragraphs,
    sentences,
    lines,
    mixedWordCount: chineseCharacters + englishWords,
    readingMinutes: readingTime.minutes,
    readingSeconds: readingTime.seconds,
  };
}

export function getLimitStatus(stats, limit) {
  const value = stats[limit.metric] || 0;
  const ratio = limit.limit > 0 ? value / limit.limit : 0;
  return {
    value,
    remaining: limit.limit - value,
    ratio,
    percent: Math.min(100, Math.round(ratio * 100)),
    exceeded: value > limit.limit,
  };
}

export function makeStatsReport(stats) {
  return JSON.stringify(stats, null, 2);
}
