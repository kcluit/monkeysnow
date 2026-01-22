import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'text-primary': '#1d1d1f',
        'text-secondary': '#86868b',
        'text-blue': '#007AFF',
        'dark-text-primary': '#f5f5f7',
        'dark-text-secondary': '#a1a1a6',
        'dark-text-blue': '#0A84FF',
        'dark-bg': '#000000',
      }
    },
  },
  plugins: [],
} satisfies Config
