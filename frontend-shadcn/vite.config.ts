import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split stable third-party libs into their own chunks so they cache
        // independently of app code, and so heavy deps only used by lazy
        // routes (xgplayer/photoswipe/chart.js) stay out of the entry chunk.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion-vendor': ['framer-motion'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'player-vendor': ['xgplayer'],
          'photoswipe-vendor': ['photoswipe', 'react-photoswipe-gallery'],
        },
      },
    },
  },
});
