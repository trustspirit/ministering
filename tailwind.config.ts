import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Ensign:Sans', 'Roboto', 'Noto Sans KR', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
