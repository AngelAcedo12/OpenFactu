/** @type {import('tailwindcss').Config} */
import animated from 'tailwindcss-animated'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:         'rgb(var(--color-primary-rgb) / <alpha-value>)',
        'primary-fg':    'rgb(var(--color-primary-fg-rgb) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover-rgb) / <alpha-value>)',
        accent:          'rgb(var(--color-accent-rgb) / <alpha-value>)',
        'accent-fg':     'rgb(var(--color-accent-fg-rgb) / <alpha-value>)',
      },
      fontFamily: {
        app: 'var(--font-sans)',
      },
    },
  },
  plugins: [animated],
}
