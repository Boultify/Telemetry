/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-low": "var(--surface-container-low)",
        "secondary": "var(--secondary)",
        "inverse-on-surface": "#2f3034",
        "surface-container": "var(--surface-container)",
        "on-primary": "var(--on-primary)",
        "inverse-surface": "#e2e2e6",
        "on-secondary-fixed": "#261a00",
        "on-primary-fixed": "#001d36",
        "on-error-container": "var(--on-error-container)",
        "error": "var(--error)",
        "tertiary": "#ffb4a9",
        "surface-variant": "var(--surface-container-highest)",
        "secondary-fixed-dim": "#fabd00",
        "surface": "var(--surface)",
        "tertiary-container": "#9d0006",
        "on-primary-fixed-variant": "#00497d",
        "surface-dim": "var(--surface-dim)",
        "primary-fixed": "#d1e4ff",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "tertiary-fixed": "#ffdad5",
        "on-tertiary": "#690002",
        "primary-fixed-dim": "#9ecaff",
        "secondary-container": "var(--secondary-container)",
        "background": "var(--background)",
        "on-tertiary-fixed": "#410001",
        "on-tertiary-fixed-variant": "#930005",
        "on-primary-container": "var(--on-primary-container)",
        "surface-container-highest": "var(--surface-container-highest)",
        "on-error": "var(--on-error)",
        "on-secondary": "var(--on-secondary)",
        "outline-variant": "var(--outline-variant)",
        "border-theme": "var(--border-color)",
        "primary-border": "var(--primary-border)",
        "secondary-border": "var(--secondary-border)",
        "primary-opacity-5": "var(--primary-opacity-5)",
        "primary-opacity-10": "var(--primary-opacity-10)",
        "primary-opacity-20": "var(--primary-opacity-20)",
        "primary-opacity-30": "var(--primary-opacity-30)",
        "secondary-opacity-5": "var(--secondary-opacity-5)",
        "secondary-opacity-10": "var(--secondary-opacity-10)",
        "error-opacity-5": "var(--error-opacity-5)",
        "error-opacity-20": "var(--error-opacity-20)",
        "error-opacity-30": "var(--error-opacity-30)",
        "on-secondary-fixed-variant": "#5b4300",
        "on-background": "var(--on-background)",
        "surface-container-high": "var(--surface-container-high)",
        "outline": "var(--outline)",
        "on-surface": "var(--on-surface)",
        "inverse-primary": "#0061a4",
        "error-container": "var(--error-container)",
        "primary": "var(--primary)",
        "secondary-fixed": "var(--secondary-fixed)",
        "on-secondary-container": "var(--on-secondary-container)",
        "surface-tint": "var(--primary)",
        "surface-bright": "var(--surface-bright)",
        "tertiary-fixed-dim": "#ffb4a9",
        "primary-container": "var(--primary-container)",
        "on-tertiary-container": "#ffa599",
        "on-surface-variant": "var(--on-surface-variant)"
      },
      fontFamily: {
        "headline": ["Space Grotesk"],
        "body": ["Inter"],
        "label": ["Inter"]
      },
      borderRadius: { "DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem" },
      // Add inside theme.extend in your tailwind.config.js
      keyframes: {
        'pulse-red': {
          '0%, 100%': { backgroundColor: 'rgba(147, 0, 10, 0.4)' },
          '50%': { backgroundColor: 'rgba(147, 0, 10, 0.8)' },
        }
      },
      animation: {
        'pulse-red': 'pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}