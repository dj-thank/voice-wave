import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 },
  server: { host: '127.0.0.1', port: 4317, strictPort: true },
});
