import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Forces a single shared React instance app-wide, even if some
  // dependency's node_modules ends up with its own nested copy (this is
  // what caused "Invalid hook call" inside @visx/tooltip — its useState
  // call was hitting a different React than the rest of the app).
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // In local dev, the Vite dev server (port 5173) and the Express API
    // (server.js, port 5000) are two separate processes. This proxy makes
    // any /api/* request from the frontend transparently forward to
    // server.js, so App.jsx can use plain relative paths ("/api/signals")
    // that work identically in dev AND in production (where Express serves
    // both from the same origin) — no environment-specific URL logic needed.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})