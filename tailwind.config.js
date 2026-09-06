/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        "3xl": "2560px", // 2K (2560×1440)
        "4xl": "3840px", // 4K (3840×2160)
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        blob: "blob 7s infinite",
        shimmer: "shimmer 2s infinite",
        "fade-in-down": "fadeInDown 0.5s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "scale-in": "scaleIn 150ms ease-out",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-150%) skewX(-45deg)" },
          "100%": { transform: "translateX(150%) skewX(-45deg)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
