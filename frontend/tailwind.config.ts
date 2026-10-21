import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: "#090A0D",
          panel: "#111217",
          card: "#16171F",
          hover: "#1E202B",
          border: "#242630",
          borderStrong: "#343746",
        },
        slateText: {
          primary: "#FFFFFF",
          secondary: "#D4D4D8",
          muted: "#71717A",
        },
        amberGold: "#FACC15",
        mintRise: "#2ED8B6",
        coralFall: "#FF6B4A",
        cyanHub: "#38BDF8",
        purpleLock: "#A78BFA",
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
