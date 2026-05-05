import { analyzeText, countChineseCharacters, countEnglishWords, countParagraphs, getLimitStatus } from "../logic";

describe("wordcount logic", () => {
  test("counts Chinese characters and English words separately", () => {
    const text = "你好 world, this is GPT-5.\n第二段 text.";
    expect(countChineseCharacters(text)).toBe(5);
    expect(countEnglishWords(text)).toBe(5);
  });

  test("analyzes text structure", () => {
    const stats = analyzeText("第一句。Second sentence!\n\nNew paragraph.");
    expect(stats.paragraphs).toBe(2);
    expect(stats.sentences).toBe(3);
    expect(stats.charsNoSpaces).toBeLessThan(stats.chars);
    expect(stats.readingMinutes).toBe(1);
  });

  test("counts paragraphs and social limits", () => {
    expect(countParagraphs("a\n\nb\n\n\nc")).toBe(3);
    const status = getLimitStatus(analyzeText("hello"), { metric: "chars", limit: 3 });
    expect(status.exceeded).toBe(true);
    expect(status.remaining).toBe(-2);
  });
});
