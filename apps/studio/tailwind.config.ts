import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#D4F85A',
        background: '#111210',
        surface: '#1E201D',
        text: '#E1E5DF',
        muted: '#6B7067',
        accent: '#FF453A',
        border: '#383C35',
      },
      fontFamily: {
        heading: ['Archivo', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
        body: ['Archivo', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0px',
      },
      spacing: {
        unit: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
