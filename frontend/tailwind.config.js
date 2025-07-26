/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Playfair Display"', "serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        gold: "#b48a4a",
        dark: "#4c3a1a",
      },
      animation: {
        fadeInUp: "fadeInUp 1s ease-out",
        slideFadeOnce: "slideFadeOnce 0.4s ease-out both",
        fadeInDown: "fadeInDown 0.3s ease-out",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(30px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideFadeOnce: {
          "0%": { transform: "translateY(-20%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
