import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'role-male': '#3b82f6',
        'role-female': '#ec4899',
        'role-household': '#6366f1',
        'status-companion': '#10b981',
        'status-recipient': '#f59e0b',
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
