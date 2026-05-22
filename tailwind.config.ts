import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        salvia: {
          50:  "#f2f5f2",
          100: "#e4ebe4",
          200: "#c8d6c9",
          300: "#a3b8a4",
          400: "#7a947c",
          500: "#5e7064",
          600: "#4b5d51",
          700: "#3a4a3f",
          800: "#2e3b32",
          900: "#1e2820",
        },
        azul: {
          50:  "#f0f4f8",
          100: "#dce8f2",
          200: "#b9d1e5",
          300: "#8ab3d1",
          400: "#5a8fb8",
          500: "#3a6f9a",
          600: "#2d587c",
          700: "#224261",
          800: "#192e44",
          900: "#0e1c2b",
        },
        bone:  "#faf6ee",
        ink:   "#1a1a18",
        "ink-2": "#4a4a44",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans:  ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono:  ["var(--font-jetbrains-mono)", "monospace"],
      },
      maxWidth: {
        wrap: "1280px",
      },
    },
  },
  plugins: [],
}

export default config
