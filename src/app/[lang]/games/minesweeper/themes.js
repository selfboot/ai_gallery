export const THEME_OPTIONS = (t) => [
  { value: 'classic', label: t('theme_classic') },
  { value: 'dark', label: t('theme_dark') },
  { value: 'pastel', label: t('theme_pastel') },
  { value: 'green', label: t('theme_green') },
  { value: 'yellow', label: t('theme_yellow') },
  { value: 'ocean', label: t('theme_ocean') },
  { value: 'sunset', label: t('theme_sunset') },
];

export const THEMES = {
  classic: {
    name: "classic",
    cellBackground: "#C0C0C0",
    revealedBackground: "#C0C0C0",
    borderBright: "#FFFFFF",
    borderDark: "#808080",
    numberColors: ["", "#0000FF", "#008000", "#FF0000", "#000080", "#800000", "#008080", "#000000", "#808080"],
    mineColor: "#000000",
    flagColor: "#FF0000",
    explodedBackground: "#FF0000",
    outerBackground: "#C0C0C0",
    mineHighlight: "#FFFFFF",
    revealedBorder: "#808080",
  },
  dark: {
    name: "dark",
    cellBackground: "#424242",
    revealedBackground: "#303030",
    borderBright: "#626262",
    borderDark: "#212121",
    numberColors: ["", "#4FC3F7", "#81C784", "#E57373", "#64B5F6", "#BA68C8", "#4DB6AC", "#F06292", "#FFB74D"],
    mineColor: "#E0E0E0",
    flagColor: "#EF5350",
    explodedBackground: "#D32F2F",
    outerBackground: "#424242",
    mineHighlight: "#AAAAAA",
    revealedBorder: "#767676",
  },
  pastel: {
    name: "pastel",
    cellBackground: "#E6E6FA",
    revealedBackground: "#F0F8FF",
    borderBright: "#FFFFFF",
    borderDark: "#B0C4DE",
    numberColors: ["", "#6A5ACD", "#20B2AA", "#DB7093", "#4682B4", "#DDA0DD", "#5F9EA0", "#8B4513", "#BC8F8F"],
    mineColor: "#483D8B",
    flagColor: "#DB7093",
    explodedBackground: "#FFB6C1",
    outerBackground: "#E6E6FA",
    mineHighlight: "#FFFFFF",
    revealedBorder: "#B0C4DE",
  },
  green: {
    name: "green",
    cellBackground: "#A8D5BA",
    revealedBackground: "#E8F5E9",
    borderBright: "#C8E6C9",
    borderDark: "#2E7D32",
    revealedBorder: "#81C784",
    numberColors: [
      "", // 0 - No color
      "#1B5E20", // 1 - Dark green
      "#0277BD", // 2 - Blue
      "#C62828", // 3 - Red
      "#006064", // 4 - Dark cyan
      "#4A148C", // 5 - Purple
      "#00695C", // 6 - Dark cyan green
      "#3E2723", // 7 - Dark brown
      "#37474F", // 8 - Dark gray
    ],
    mineColor: "#1B5E20",
    mineHighlight: "#FFFFFF",
    flagColor: "#D32F2F",
    explodedBackground: "#EF5350",
    outerBackground: "#A8D5BA",
  },
  yellow: {
    name: "yellow",
    cellBackground: "#FFE082",
    revealedBackground: "#FFF8E1",
    borderBright: "#FFECB3",
    borderDark: "#8D6E63",
    revealedBorder: "#BCAAA4",
    numberColors: [
      "", // 0 - No color
      "#5D4037", // 1 - Dark brown
      "#0277BD", // 2 - Blue
      "#C62828", // 3 - Red
      "#2E7D32", // 4 - Dark green
      "#4527A0", // 5 - Dark purple
      "#00695C", // 6 - Dark cyan
      "#263238", // 7 - Dark gray blue
      "#424242", // 8 - Dark gray
    ],
    mineColor: "#4E342E",
    mineHighlight: "#FFFFFF",
    flagColor: "#D32F2F",
    explodedBackground: "#EF5350",
    outerBackground: "#FFE082",
  },
  ocean: {
    name: "ocean",
    cellBackground: "#81D4FA",
    revealedBackground: "#E1F5FE",
    borderBright: "#B3E5FC",
    borderDark: "#0288D1",
    revealedBorder: "#4FC3F7",
    numberColors: [
      "",
      "#01579B",  // Deep blue
      "#00695C",  // Dark cyan
      "#D32F2F",  // Red
      "#1A237E",  // Indigo
      "#4A148C",  // Purple
      "#004D40",  // Dark cyan green
      "#263238",  // Dark gray blue
      "#37474F"   // Dark gray
    ],
    mineColor: "#01579B",
    mineHighlight: "#E1F5FE",
    flagColor: "#F44336",
    explodedBackground: "#EF5350",
    outerBackground: "#81D4FA"
  },
  sunset: {
    name: "sunset",
    cellBackground: "#FFB74D",
    revealedBackground: "#FFF3E0",
    borderBright: "#FFE0B2",
    borderDark: "#F4511E",
    revealedBorder: "#FF8A65",
    numberColors: [
      "",
      "#BF360C",  // Deep orange
      "#0277BD",  // Blue
      "#C62828",  // Red
      "#1B5E20",  // Dark green
      "#4A148C",  // Purple
      "#006064",  // Dark cyan
      "#3E2723",  // Dark brown
      "#212121"   // Dark gray
    ],
    mineColor: "#D84315",
    mineHighlight: "#FFFFFF",
    flagColor: "#D32F2F",
    explodedBackground: "#EF5350",
    outerBackground: "#FFB74D"
  },
};
