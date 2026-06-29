import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Pass an explicit config path so Tailwind is found even when the dev server's
// working directory is not the client folder.
const here = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [
    tailwindcss({ config: path.join(here, 'tailwind.config.js') }),
    autoprefixer,
  ],
};
