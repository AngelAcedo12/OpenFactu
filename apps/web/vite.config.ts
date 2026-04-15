import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@openfactu/common': path.resolve(__dirname, '../../packages/common/src/index.ts'),
      '@openfactu/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@openfactu/pdf/browser': path.resolve(__dirname, '../../packages/pdf/src/browser.ts'),
    }
  }
})
