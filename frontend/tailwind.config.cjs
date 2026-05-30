/** @type {import('tailwindcss').Config} */
// Color values are bound to CSS variables (RGB triplets) so the night theme
// can override them, and `bg-brand-cream/30` style alpha utilities still work.
const c = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "3rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1320px",
      },
    },
    extend: {
      fontFamily: {
        heading: ['"Playfair Display"', "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        cinzel: ['"Cinzel"', "serif"],
      },
      colors: {
        brand: {
          espresso:    c("brand-espresso"),
          ink:         c("brand-ink"),
          muted:       c("brand-muted"),
          line:        c("brand-line"),
          cream:       c("brand-cream"),
          parchment:   c("brand-parchment"),
          white:       c("brand-white"),
          gold:        c("brand-gold"),
          "gold-dark": c("brand-gold-dark"),
          "gold-light":c("brand-gold-light"),
          sage:        c("brand-sage"),
          terracotta:  c("brand-terracotta"),
          // Dark-by-design surfaces that must NOT invert in night mode.
          deep:        c("brand-deep"),
          "on-deep":   c("brand-on-deep"),
        },
        gold: c("brand-gold"),
        dark: c("brand-ink"),
      },
      maxWidth: {
        prose: "44rem",
        section: "76rem",
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(45, 30, 16, 0.12)",
        card: "0 12px 32px -16px rgba(45, 30, 16, 0.18)",
        lift: "0 24px 64px -24px rgba(45, 30, 16, 0.28)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      letterSpacing: {
        eyebrow: "0.18em",
        wider: "0.08em",
      },
      animation: {
        fadeInUp: "fadeInUp 0.6s ease-out both",
        fadeIn: "fadeIn 0.5s ease-out both",
        slideDown: "slideDown 0.2s ease-out both",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideDown: {
          "0%": { opacity: 0, transform: "translateY(-8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
