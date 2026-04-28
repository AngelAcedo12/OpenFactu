/** @type {import('tailwindcss').Config} */
import animated from 'tailwindcss-animated';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    // Necesario para que Tailwind JIT procese las clases arbitrarias
    // (rounded-[2px], bg-[var(--k-line)], etc.) de los componentes del paquete.
    '../../node_modules/@openfactu/ui/dist/**/*.{js,jsx}',
    './node_modules/@openfactu/ui/dist/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
        'primary-fg': 'rgb(var(--color-primary-fg-rgb) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover-rgb) / <alpha-value>)',
        accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
        'accent-fg': 'rgb(var(--color-accent-fg-rgb) / <alpha-value>)',
        // Tokens Keirost (alias directos a CSS vars, para uso en apps/web)
        line: 'var(--k-line)',
        'line-2': 'var(--k-line-2)',
        surface: 'var(--k-surface)',
        ink: {
          900: 'var(--k-ink-900)',
          800: 'var(--k-ink-800)',
          700: 'var(--k-ink-700)',
          500: 'var(--k-ink-500)',
          400: 'var(--k-ink-400)',
        },
        teal: {
          50: 'var(--k-teal-50)',
          100: 'var(--k-teal-100)',
          500: 'var(--k-teal-500)',
          600: 'var(--k-teal-600)',
        },
      },
      fontFamily: {
        app: 'var(--font-sans)',
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '8px',
      },
      fontSize: {
        display: ['48px', { lineHeight: '1.05', letterSpacing: '-1px', fontWeight: '800' }],
        h1: ['32px', { lineHeight: '1.1', letterSpacing: '-0.5px', fontWeight: '700' }],
        h2: ['22px', { lineHeight: '1.2', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.6' }],
        small: ['12px', { lineHeight: '1.5' }],
        label: ['10px', { lineHeight: '1.2', letterSpacing: '1.5px' }],
      },
    },
  },
  plugins: [animated],
};
