import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        // Pillar accents from the MP072 palette:
        //   VE = Blue Fantastic #2C3B4D · VR = Truffle Trouble #A35139 · CS = Burning Flame #FFB162.
        ve: {
          50: "#eef1f4",
          100: "#d9dfe5",
          200: "#b7c2cd",
          300: "#8b9aaa",
          400: "#5c6e80",
          500: "#3c4e60",
          600: "#2c3b4d",
          700: "#243040",
          800: "#1d2733",
          900: "#151c25",
        },
        vr: {
          50: "#fbf0ec",
          100: "#f5dacf",
          200: "#e9b7a4",
          300: "#d98e74",
          400: "#c56a4e",
          500: "#b15a40",
          600: "#a35139",
          700: "#86402c",
          800: "#6a3323",
          900: "#4f261a",
        },
        cs: {
          50: "#fff6ec",
          100: "#ffe8ce",
          200: "#ffd4a3",
          300: "#ffc488",
          400: "#ffb162",
          500: "#f59b44",
          600: "#e07e2a",
          700: "#b45e1c",
          800: "#8a4715",
          900: "#663410",
        },
        // Primary accent = Burning Flame #FFB162 (rail active bar/icon, logo).
        bmc: {
          50: "#fff6ec",
          100: "#ffe8ce",
          200: "#ffd4a3",
          400: "#ffb162",
          500: "#f59b44",
          600: "#e07e2a",
          700: "#b45e1c",
        },
        // Left rail = Abyssal Anchorfish Blue; muted nav text reads on it.
        rail: "#1b2632",
        railfg: "#aeb7bf",
        // Neutral: warm greige (Palladian/Oatmeal) grading to a cool ink at the dark end.
        ink: {
          50: "#f4f1e9",
          100: "#eae4d8",
          200: "#dad3c6",
          300: "#c3bbab",
          400: "#9a9284",
          500: "#6e685c",
          600: "#4c4e50",
          700: "#363f49",
          800: "#26303b",
          900: "#1b2632",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(27,38,50,.04), 0 1px 3px rgba(27,38,50,.06)",
        card: "0 1px 2px rgba(27,38,50,.04), 0 6px 16px -6px rgba(27,38,50,.10)",
        "card-hover": "0 10px 28px -8px rgba(27,38,50,.16), 0 3px 8px -3px rgba(27,38,50,.08)",
        pop: "0 12px 34px -10px rgba(27,38,50,.22)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up .28s cubic-bezier(.2,.7,.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
