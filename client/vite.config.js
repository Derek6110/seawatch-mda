import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api and the socket to the backend on :4000 so the
// client can use same-origin URLs in development and production alike.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow access via tunnel hostnames (e.g. *.trycloudflare.com) for sharing.
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
