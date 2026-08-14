/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07080c',
          900: '#0b0d14',
          850: '#0f121b',
          800: '#141824',
          700: '#1c2131',
        },
        accent: {
          DEFAULT: '#6ee7ff',
          soft: '#38bdf8',
          glow: '#22d3ee',
        },
        lime: {
          neon: '#c6f24e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(56, 189, 248, 0.45)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gridpan: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 40px' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        gridpan: 'gridpan 20s linear infinite',
      },
    },
  },
  plugins: [],
}
