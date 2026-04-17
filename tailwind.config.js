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
      },
      animation: {
        "card-in": "card-in 300ms ease-out forwards",
        "sheet-up": "sheet-up 250ms ease-out forwards",
      },
    },
  },
  plugins: [],
};
