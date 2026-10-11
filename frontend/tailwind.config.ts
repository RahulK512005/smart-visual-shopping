import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1A2B",
        paper: "#F5F7FA",
        line: "#D9DFE8",
        muted: "#4B5A70",
        brand: { DEFAULT: "#1F4FD8", dark: "#173BA6", tint: "#E8EEFC" },
        ok: { DEFAULT: "#0F7B4F", tint: "#E3F4EC" },
        bad: { DEFAULT: "#B42318", tint: "#FCE9E7" },
        warn: { DEFAULT: "#8A5200", tint: "#FFF1D6" },
      },
      fontFamily: {
        sans: ['ui-sans-serif', '"Segoe UI"', 'system-ui', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
