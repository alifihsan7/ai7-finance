import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: "rgb(var(--obsidian-bg-rgb) / <alpha-value>)",
          panel: "rgb(var(--obsidian-panel-rgb) / <alpha-value>)",
          card: "rgb(var(--obsidian-card-rgb) / <alpha-value>)",
          hover: "rgb(var(--obsidian-hover-rgb) / <alpha-value>)",
          border: "rgb(var(--obsidian-border-rgb) / <alpha-value>)",
          borderStrong: "rgb(var(--obsidian-border-strong-rgb) / <alpha-value>)",
        },
        slateText: {
          primary: "rgb(var(--slate-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--slate-secondary-rgb) / <alpha-value>)",
          muted: "rgb(var(--slate-muted-rgb) / <alpha-value>)",
        },
        amberGold: "rgb(var(--amber-gold-rgb) / <alpha-value>)",
        mintRise: "rgb(var(--mint-rise-rgb) / <alpha-value>)",
        coralFall: "rgb(var(--coral-fall-rgb) / <alpha-value>)",
        cyanHub: "rgb(var(--cyan-hub-rgb) / <alpha-value>)",
        purpleLock: "rgb(var(--purple-lock-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderWidth: {
        hairline: "1px",
      },
      spacing: {
        "8.5": "2.125rem",
      },
    },
  },
  plugins: [],
};
export default config;
