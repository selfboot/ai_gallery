import {
  DEFAULT_KMP_EXAMPLE,
  buildLpsSteps,
  buildMatchSteps,
  getClassicNext,
  getFinalLps,
  getMatchPositions,
  getNextval,
  getRandomKmpExample,
} from "../kmp";

describe("KMP logic helpers", () => {
  test("builds the final lps array for ababaca", () => {
    expect(getFinalLps("ababaca")).toEqual([0, 0, 1, 2, 3, 0, 1]);
  });

  test("builds the final lps array for repeated characters", () => {
    expect(getFinalLps("aaaa")).toEqual([0, 1, 2, 3]);
  });

  test("returns the correct match positions", () => {
    expect(getMatchPositions("ababcabcabababd", "ababd")).toEqual([10]);
  });

  test("builds the classic next array with the -1 convention", () => {
    expect(getClassicNext("ababd")).toEqual([-1, 0, 0, 1, 2]);
  });

  test("builds the optimized nextval array", () => {
    expect(getNextval("ababd")).toEqual([-1, 0, -1, 0, 2]);
  });

  test("nextval skips repeated fallback positions for repeated characters", () => {
    expect(getClassicNext("aaaa")).toEqual([-1, 0, 1, 2]);
    expect(getNextval("aaaa")).toEqual([-1, -1, -1, -1]);
  });

  test("returns the default teaching example for the first deterministic random choice", () => {
    expect(getRandomKmpExample(() => 0)).toEqual(DEFAULT_KMP_EXAMPLE);
  });

  test("returns a deterministic teaching-friendly random example with a real match", () => {
    const example = getRandomKmpExample(() => 0.74);

    expect(example).toEqual({
      text: "mnmmmmnmmmnn",
      pattern: "mmmn",
    });
    expect(example.pattern).not.toBe("");
    expect(example.text.length).toBeGreaterThanOrEqual(example.pattern.length);
    expect(getMatchPositions(example.text, example.pattern)).toEqual([6]);
  });

  test("handles empty pattern without matches", () => {
    expect(getFinalLps("")).toEqual([]);
    expect(getMatchPositions("abc", "")).toEqual([]);
    expect(buildLpsSteps("")).toEqual([]);
    expect(buildMatchSteps("abc", "", [])).toEqual([]);
  });

  test("records fallback steps while building lps", () => {
    const steps = buildLpsSteps("ababaca");
    const fallbackStep = steps.find(
      (step) => step.action === "fallback" && step.fromLength === 3 && step.toLength === 1,
    );

    expect(fallbackStep).toBeDefined();
    expect(fallbackStep.index).toBe(5);
  });

  test("records fallback and successful matches during kmp matching", () => {
    const lps = getFinalLps("ababd");
    const steps = buildMatchSteps("ababcabcabababd", "ababd", lps);

    const fallbackStep = steps.find(
      (step) => step.action === "fallback" && step.fromPatternIndex === 4 && step.toPatternIndex === 2,
    );
    const matchStep = steps.find((step) => step.action === "match-found");

    expect(fallbackStep).toBeDefined();
    expect(matchStep).toBeDefined();
    expect(matchStep.matches).toEqual([10]);
  });
});
