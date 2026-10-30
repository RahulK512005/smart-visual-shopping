import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0F",
        paper: "#0F0F1A",
        surface: "#141420",
        "surface-2": "#1C1C2E",
        line: "#ffffff12",
        muted: "#8B8FA8",
        brand: { DEFAULT: "#7C3AED", dark: "#5B21B6", tint: "#7C3AED20" },
        volt: { DEFAULT: "#A78BFA", dark: "#7C3AED", tint: "#A78BFA15" },
        neon: { DEFAULT: "#06FFA5", dark: "#00CC84", tint: "#06FFA510" },
        coral: "#FF6B6B",
        "coral-tint": "#FF6B6B15",
        electric: { DEFAULT: "#00D9FF", tint: "#00D9FF15" },
        ok: { DEFAULT: "#06FFA5", tint: "#06FFA510" },
        bad: { DEFAULT: "#FF4444", tint: "#FF444415" },
        warn: { DEFAULT: "#FFB800", tint: "#FFB80015" },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', "ui-sans-serif", '"Segoe UI"', "system-ui", "Roboto", "Arial", "sans-serif"],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      opacity: {
        "3": "0.03",
        "6": "0.06",
        "8": "0.08",
      },
      boxShadow: {
        lift: "0 24px 60px -12px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)",
        glow: "0 0 0 4px rgba(167,139,250,.3)",
        "glow-neon": "0 0 0 4px rgba(6,255,165,.3)",
        "glow-electric": "0 0 30px rgba(0,217,255,.4)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,.08)",
        neon: "0 0 40px rgba(167,139,250,.25)",
        card: "0 4px 24px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.06)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #7C3AED 0%, #A78BFA 50%, #06FFA5 100%)",
        "gradient-hero": "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,217,255,.2) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(6,255,165,.15) 0%, transparent 50%)",
        "gradient-card": "linear-gradient(145deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.01) 100%)",
        "gradient-volt": "linear-gradient(135deg, #A78BFA, #7C3AED)",
        "gradient-neon": "linear-gradient(135deg, #06FFA5, #00D9FF)",
      },
      animation: {
        "gradient-shift": "gradientShift 8s ease infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "slide-up": "slideUp 0.5s cubic-bezier(.16,1,.3,1) both",
        "slide-in-right": "slideInRight 0.4s cubic-bezier(.16,1,.3,1) both",
        orbit: "orbit 20s linear infinite",
      },
      keyframes: {
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(167,139,250,.4)" },
          "50%": { boxShadow: "0 0 40px rgba(167,139,250,.8)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-800px 0" },
          "100%": { backgroundPosition: "800px 0" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(140px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(140px) rotate(-360deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
