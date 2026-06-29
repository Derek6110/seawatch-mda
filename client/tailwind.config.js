import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve content globs against this file's directory so Tailwind generates the
// same utilities regardless of the process working directory (e.g. when the dev
// server is launched from the repo root rather than the client folder).
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(here, 'index.html'), path.join(here, 'src/**/*.{js,jsx}')],
  theme: {
    extend: {
      colors: {
        // Naval command dark theme with Ghana national accents.
        navy: {
          950: '#05080f',
          900: '#0a0f1a',
          850: '#0e1524',
          800: '#121b2e',
          700: '#1a2740',
          600: '#243453',
        },
        ghana: {
          red: '#ce1126',
          gold: '#fcd116',
          green: '#006b3f',
        },
        threat: {
          high: '#ff3b3b',
          medium: '#ffa726',
          low: '#ffd54f',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
