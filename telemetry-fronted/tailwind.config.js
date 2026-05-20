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
        "surface-container-low": "#1a1c1f",
        "secondary": "#ffdf9e",
        "inverse-on-surface": "#2f3034",
        "surface-container": "#1e2023",
        "on-primary": "#003258",
        "inverse-surface": "#e2e2e6",
        "on-secondary-fixed": "#261a00",
        "on-primary-fixed": "#001d36",
        "on-error-container": "#ffdad6",
        "error": "#ffb4ab",
        "tertiary": "#ffb4a9",
        "surface-variant": "#333538",
        "secondary-fixed-dim": "#fabd00",
        "surface": "#111316",
        "tertiary-container": "#9d0006",
        "on-primary-fixed-variant": "#00497d",
        "surface-dim": "#111316",
        "primary-fixed": "#d1e4ff",
        "surface-container-lowest": "#0c0e11",
        "tertiary-fixed": "#ffdad5",
        "on-tertiary": "#690002",
        "primary-fixed-dim": "#9ecaff",
        "secondary-container": "#fabd00",
        "background": "#111316",
        "on-tertiary-fixed": "#410001",
        "on-tertiary-fixed-variant": "#930005",
        "on-primary-container": "#8ac0ff",
        "surface-container-highest": "#333538",
        "on-error": "#690005",
        "on-secondary": "#3f2e00",
        "outline-variant": "#434652",
        "on-secondary-fixed-variant": "#5b4300",
        "on-background": "#e2e2e6",
        "surface-container-high": "#282a2d",
        "outline": "#8d909d",
        "on-surface": "#e2e2e6",
        "inverse-primary": "#0061a4",
        "error-container": "#93000a",
        "primary": "#9ecaff",
        "secondary-fixed": "#ffdf9e",
        "on-secondary-container": "#6a4e00",
        "surface-tint": "#9ecaff",
        "surface-bright": "#37393d",
        "tertiary-fixed-dim": "#ffb4a9",
        "primary-container": "#004e85",
        "on-tertiary-container": "#ffa599",
        "on-surface-variant": "#c3c6d4"
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