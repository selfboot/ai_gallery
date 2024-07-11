module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
        scale: "transform",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.5)", opacity: "0.5" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        pop: "pop 0.3s ease-out forwards",
      },
    },
  },
  variants: {
    extend: {
      animation: ["responsive", "motion-safe", "motion-reduce"],
    },
  },
  plugins: [require("@tailwindcss/aspect-ratio")],
};
