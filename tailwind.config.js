/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        light: {
          bg: '#F4F3EF',
          surface: '#FFFFFF',
          text: '#1A1A1A',
          border: '#E2E0DA',
          muted: '#71716D'
        },
        dark: {
          bg: '#0B0B0B',
          surface: '#151515',
          text: '#F2F2F2',
          border: '#262626',
          muted: '#8E8E8E'
        }
      }
    },
  },
  plugins: [],
}
