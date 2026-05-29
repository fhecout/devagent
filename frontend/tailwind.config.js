/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        surface: {
          900: '#0b0f14',
          800: '#111820',
          700: '#1a2332',
          600: '#243044',
        },
        accent: {
          DEFAULT: '#3b82f6',
          glow: '#60a5fa',
        },
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.35)',
        glow: '0 0 40px rgba(59, 130, 246, 0.15)',
      },
    },
  },
  plugins: [],
};
