import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The Flask backend (backend/app.py) handles /api — proxied so the app stays same-origin.
const api = {
  '/api': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: false,
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        console.warn('[Vite Proxy] Backend connection error at http://127.0.0.1:5000:', err.message);
        if (res && !res.headersSent && typeof res.writeHead === 'function') {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: false,
            error: 'Backend connection refused. Please start Flask backend: python backend/app.py (port 5000).',
          }));
        }
      });
    },
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
  test: {
    // Normalize the root path to avoid the Windows drive-letter casing mismatch
    // that causes Vitest 5 workers to lose runner context ('config' is undefined).
    root: fileURLToPath(new URL('./', import.meta.url)),
    environment: 'jsdom',
    globals: false, // keep explicit imports from 'vitest'
    // vmThreads keeps jsdom alive across files in the same worker, and also
    // avoids the Windows drive-letter ESM path issue that makes 'config' undefined.
    pool: 'vmThreads',
  },
});
