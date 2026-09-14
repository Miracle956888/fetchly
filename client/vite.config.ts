import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { siteMetaPlugin } from './vite-site-meta';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), siteMetaPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow preview proxy hosts (sandbox/live preview environments).
    allowedHosts: true,
    // The browser never talks to the API origin directly — requests go to
    // this dev server and are proxied, which also keeps previews working.
    // `xfwd` forwards the public host so the API's CSRF guard sees the same
    // origin the browser used (identical to the production Nginx setup).
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
    // Serve the API through the preview server too, so `vite preview`
    // exercises exactly the same relative-URL contract as production Nginx.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  build: {
    // Fail the build on chunks large enough to hurt first paint, rather than
    // letting bundle growth go unnoticed.
    chunkSizeWarningLimit: 250,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
