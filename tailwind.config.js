import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, './index.html'),
    path.join(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1a3a52', light: '#2d5a7b', dark: '#0d1f2d' },
        gold: { DEFAULT: '#c9a961', dark: '#a88a47' },
      }
    }
  },
  plugins: [],
}
