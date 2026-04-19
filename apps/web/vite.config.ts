import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Con paquetes @openfactu/* linkados localmente (symlinks), cada uno trae
  // su propio react/react-dom en node_modules y React detecta varias copias
  // (rompe hooks). Forzamos una única copia resuelta desde la app.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // Paquetes @openfactu/* se publican como CommonJS. Cuando están linkados
  // localmente (symlink en node_modules), Vite los trata como fuente y falla
  // al resolver named exports. Forzamos pre-bundling para que esbuild los
  // convierta a ESM igual que cuando vienen del registry.
  optimizeDeps: {
    include: [
      '@openfactu/common',
      '@openfactu/pdf',
      '@openfactu/pdf/browser',
      '@openfactu/ui',
      '@openfactu/plugin-sdk',
    ],
  },
});
