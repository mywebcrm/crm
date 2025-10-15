import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bar: {
          background: '#111111',
          surface: '#1c1c1f',
          accent: '#ff006a',
          accentMuted: '#ff4f94'
        }
      },
      boxShadow: {
        neon: '0 0 10px rgba(255, 0, 106, 0.6)'
      }
    }
  },
  plugins: [forms]
};

export default config;
