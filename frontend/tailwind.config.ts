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
          bg: "#0B0D11",
          panel: "#12151D",
          card: "#181C26",
          hover: "#1F2432",
          border: "#252B3B",
          borderStrong: "#353D54",
        },
        slateText: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#64748B",
        },
        amberGold: "#F59E0B",
        mintRise: "#10B981",
        coralFall: "#F43F5E",
        cyanHub: "#06B6D4",
        purpleLock: "#8B5CF6",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderWidth: {
        hairline: "1px",
      },
    },
  },
  plugins: [],
};
export default config;
