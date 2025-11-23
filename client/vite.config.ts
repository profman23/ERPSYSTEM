import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '*.replit.dev',
      'f7dd660b-f703-4da3-9d7c-ca3ca5d4c75a-00-2d1defatxzons.kirk.replit.dev',
    ],
    strictPort: true,
    hmr: {
      host: 'f7dd660b-f703-4da3-9d7c-ca3ca5d4c75a-00-2d1defatxzons.kirk.replit.dev',
      clientPort: 443,
      protocol: 'wss',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
