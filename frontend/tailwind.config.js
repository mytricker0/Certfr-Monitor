/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#060d1f',
          900: '#0a1628',
          800: '#0f2140',
          700: '#163058',
        },
      },
    },
  },
  plugins: [],
};
