import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

import googleAnalytics from './vite-plugins/googleAnalytics';

const src = (path) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Only deploy.yml sets this, so the tag ships in the production build alone.
    googleAnalytics(
      loadEnv(mode, process.cwd(), 'VITE_').VITE_GA_MEASUREMENT_ID
    ),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@apis': src('apis'),
      '@assets': src('assets'),
      '@components': src('components'),
      '@contexts': src('contexts'),
      '@hooks': src('hooks'),
      '@pages': src('pages'),
      '@styles': src('styles'),
      '@utils': src('utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  // 배포 파이프라인(deploy.yml)이 build/ 디렉토리를 업로드하므로 CRA와 동일하게 유지한다.
  build: {
    outDir: 'build',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
  },
}));
