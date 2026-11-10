/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // 3D libraries are only reachable from the lazily-loaded explorer route.
          groups: [
            { name: 'three-core', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            { name: 'r3f', test: /node_modules[\\/](@react-three|three-stdlib|three-mesh-bvh|camera-controls|maath|troika[^\\/]*|meshline|stats-gl|@monogrid|@use-gesture|its-fine|suspend-react|react-use-measure|tunnel-rat|detect-gpu|hls\.js|gsap)[\\/]/, priority: 20 },
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|zustand|use-sync-external-store|cookie|set-cookie-parser)[\\/]/, priority: 40 },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
