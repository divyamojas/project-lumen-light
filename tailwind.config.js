/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        lumen: {
          base: "#0F1117",
          panel: "#141824",
          border: "#242938",
          text: "#E7E5E4",
          muted: "#A1A1AA",
        },
      },
      boxShadow: {
        glow: "0 18px 48px rgba(0, 0, 0, 0.28)",
      },
      keyframes: {
        "card-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateX(-50%) translateY(12px)" },
          "100%": { opacity: "1", transform: "translateX(-50%) translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "card-in": "card-in 300ms ease-out forwards",
        "sheet-up": "sheet-up 280ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "toast-in": "toast-in 220ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards",
        "fade-in": "fade-in 200ms ease-out forwards",
        "scale-in": "scale-in 200ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards",
        "shimmer": "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
