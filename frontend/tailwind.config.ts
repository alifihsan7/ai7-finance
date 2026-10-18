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
        abyss: "#0a1c22",
        trench: "#0f262d",
        shelf: "#15323a",
        line: "#244650",
        foam: "#e4eeea",
        mist: "#8fa9aa",
        sodium: "#f2b84b",
        rise: "#5fd3a5",
        fall: "#ff7a66",
      },
      fontFamily: {
        sans: ["'Hanken Grotesk'", "var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Familjen Grotesk'", "'Hanken Grotesk'", "sans-serif"],
      },
      borderWidth: {
        hairline: "0.5px",
      },
    },
  },
  plugins: [],
};
export default config;