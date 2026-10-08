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
        // All colors reference CSS variables set by themes.ts via useTheme.ts
        // These colors automatically adapt to the current theme
        'theme': {
          'background': 'var(--background)',
          'cardBg': 'var(--cardBg)',
          'textPrimary': 'var(--textPrimary)',
          'textSecondary': 'var(--textSecondary)',
          'accent': 'var(--accent)',
          'secondary': 'var(--secondary)',
          'border': 'var(--border)',
        },
      },
      // Font weights reference CSS variables in style.css, which Bold text mode shifts
      fontWeight: {
        'normal': 'var(--weight-normal)',
        'medium': 'var(--weight-medium)',
        'semibold': 'var(--weight-semibold)',
        'bold': 'var(--weight-bold)',
      },
    },
  },
  plugins: [],
} satisfies Config
