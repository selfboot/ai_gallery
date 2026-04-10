export const DEFAULT_KMP_EXAMPLE = {
  text: "ababcabcabababd",
  pattern: "ababd",
};

const RANDOM_KMP_TEMPLATE_FAMILIES = [
  {
    pattern: "ababd",
    coreText: "ababcabcabababd",
    leadingNoise: ["", "c", "bc"],
    trailingNoise: ["", "c", "ab"],
  },
  {
    pattern: "ababaca",
    coreText: "abababacababaca",
    leadingNoise: ["", "c", "ac"],
    trailingNoise: ["", "ba", "c"],
  },
  {
    pattern: "aaab",
    coreText: "aaaaabaaab",
    leadingNoise: ["", "b", "ab"],
    trailingNoise: ["", "aa", "b"],
  },
  {
    pattern: "abaaba",
    coreText: "abaabaeabaaba",
    leadingNoise: ["", "e", "be"],
    trailingNoise: ["", "ab", "e"],
  },
];

const RANDOM_KMP_CHARACTER_SETS = [
  ["a", "b", "c", "d", "e"],
  ["x", "y", "z", "w", "v"],
  ["m", "n", "o", "p", "q"],
  ["r", "s", "t", "u", "v"],
];

const TEMPLATE_CHARACTER_INDEX = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
};

const cloneArray = (value) => [...value];
const pickFromList = (list, randomFn) => list[Math.floor(randomFn() * list.length)] ?? list[0];

const remapTemplateValue = (value, characters) =>
  value
    .split("")
    .map((character) => {
      const mappedIndex = TEMPLATE_CHARACTER_INDEX[character];
      return mappedIndex === undefined ? character : characters[mappedIndex];
    })
    .join("");

export function getRandomKmpExample(randomFn = Math.random) {
  const family = pickFromList(RANDOM_KMP_TEMPLATE_FAMILIES, randomFn);
  const characters = pickFromList(RANDOM_KMP_CHARACTER_SETS, randomFn);
  const leadingNoise = pickFromList(family.leadingNoise, randomFn);
  const trailingNoise = pickFromList(family.trailingNoise, randomFn);
  const example = {
    text: remapTemplateValue(`${leadingNoise}${family.coreText}${trailingNoise}`, characters),
    pattern: remapTemplateValue(family.pattern, characters),
  };

  return getMatchPositions(example.text, example.pattern).length > 0 ? example : DEFAULT_KMP_EXAMPLE;
}

export function buildLpsSteps(pattern) {
  if (!pattern) {
    return [];
  }

  const lps = Array(pattern.length).fill(0);
  const steps = [
    {
      action: "initialize",
      index: 0,
      length: 0,
      compareIndices: [0, 0],
      lps: cloneArray(lps),
    },
  ];

  let length = 0;
  let index = 1;

  while (index < pattern.length) {
    if (pattern[index] === pattern[length]) {
      length += 1;
      lps[index] = length;
      steps.push({
        action: "match",
        index,
        length,
        compareIndices: [length - 1, index],
        lps: cloneArray(lps),
      });
      index += 1;
      continue;
    }

    if (length !== 0) {
      const fromLength = length;
      length = lps[length - 1];
      steps.push({
        action: "fallback",
        index,
        length,
        fromLength,
        toLength: length,
        compareIndices: [Math.max(fromLength - 1, 0), index],
        lps: cloneArray(lps),
      });
      continue;
    }

    lps[index] = 0;
    steps.push({
      action: "set-zero",
      index,
      length: 0,
      compareIndices: [0, index],
      lps: cloneArray(lps),
    });
    index += 1;
  }

  steps.push({
    action: "complete",
    index: pattern.length - 1,
    length,
    compareIndices: [Math.max(length - 1, 0), pattern.length - 1],
    lps: cloneArray(lps),
  });

  return steps;
}

export function getFinalLps(pattern) {
  if (!pattern) {
    return [];
  }

  const steps = buildLpsSteps(pattern);
  return steps.length === 0 ? [] : cloneArray(steps[steps.length - 1].lps);
}

export function getClassicNext(pattern) {
  if (!pattern) {
    return [];
  }

  const next = Array(pattern.length).fill(0);
  next[0] = -1;

  let index = 0;
  let fallback = -1;

  while (index < pattern.length - 1) {
    if (fallback === -1 || pattern[index] === pattern[fallback]) {
      index += 1;
      fallback += 1;
      next[index] = fallback;
    } else {
      fallback = next[fallback];
    }
  }

  return next;
}

export function getNextval(pattern) {
  if (!pattern) {
    return [];
  }

  const nextval = Array(pattern.length).fill(0);
  nextval[0] = -1;

  let index = 0;
  let fallback = -1;

  while (index < pattern.length - 1) {
    if (fallback === -1 || pattern[index] === pattern[fallback]) {
      index += 1;
      fallback += 1;

      if (pattern[index] !== pattern[fallback]) {
        nextval[index] = fallback;
      } else {
        nextval[index] = nextval[fallback];
      }
    } else {
      fallback = nextval[fallback];
    }
  }

  return nextval;
}

export function buildMatchSteps(text, pattern, lps = getFinalLps(pattern)) {
  if (!pattern) {
    return [];
  }

  const safeText = text ?? "";
  const steps = [
    {
      action: "initialize",
      textIndex: 0,
      patternIndex: 0,
      comparedTextIndex: 0,
      comparedPatternIndex: 0,
      alignmentStart: 0,
      matches: [],
    },
  ];

  let textIndex = 0;
  let patternIndex = 0;
  const matches = [];

  while (textIndex < safeText.length) {
    const alignmentStart = textIndex - patternIndex;

    if (safeText[textIndex] === pattern[patternIndex]) {
      const nextTextIndex = textIndex + 1;
      const nextPatternIndex = patternIndex + 1;

      if (nextPatternIndex === pattern.length) {
        const matchStart = nextTextIndex - nextPatternIndex;
        matches.push(matchStart);
        const fallbackTarget = lps[nextPatternIndex - 1] ?? 0;
        steps.push({
          action: "match-found",
          textIndex,
          patternIndex,
          comparedTextIndex: textIndex,
          comparedPatternIndex: patternIndex,
          alignmentStart,
          matchStart,
          matches: cloneArray(matches),
          nextTextIndex,
          nextPatternIndex: fallbackTarget,
        });
        textIndex = nextTextIndex;
        patternIndex = fallbackTarget;
      } else {
        steps.push({
          action: "advance",
          textIndex,
          patternIndex,
          comparedTextIndex: textIndex,
          comparedPatternIndex: patternIndex,
          alignmentStart,
          matches: cloneArray(matches),
          nextTextIndex,
          nextPatternIndex,
        });
        textIndex = nextTextIndex;
        patternIndex = nextPatternIndex;
      }

      continue;
    }

    if (patternIndex !== 0) {
      const fallbackTarget = lps[patternIndex - 1] ?? 0;
      steps.push({
        action: "fallback",
        textIndex,
        patternIndex,
        fromPatternIndex: patternIndex,
        toPatternIndex: fallbackTarget,
        comparedTextIndex: textIndex,
        comparedPatternIndex: patternIndex,
        alignmentStart,
        matches: cloneArray(matches),
      });
      patternIndex = fallbackTarget;
      continue;
    }

    steps.push({
      action: "shift",
      textIndex,
      patternIndex: 0,
      fromPatternIndex: 0,
      toPatternIndex: 0,
      comparedTextIndex: textIndex,
      comparedPatternIndex: 0,
      alignmentStart,
      matches: cloneArray(matches),
      nextTextIndex: textIndex + 1,
      nextPatternIndex: 0,
    });
    textIndex += 1;
  }

  steps.push({
    action: "complete",
    textIndex,
    patternIndex,
    comparedTextIndex: Math.max(textIndex - 1, 0),
    comparedPatternIndex: Math.max(patternIndex - 1, 0),
    alignmentStart: Math.max(textIndex - patternIndex, 0),
    matches: cloneArray(matches),
  });

  return steps;
}

export function getMatchPositions(text, pattern) {
  if (!pattern) {
    return [];
  }

  const steps = buildMatchSteps(text, pattern, getFinalLps(pattern));
  return steps
    .filter((step) => step.action === "match-found")
    .map((step) => step.matchStart);
}
