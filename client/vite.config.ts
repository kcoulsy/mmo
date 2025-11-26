import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild'
  },
  server: {
    host: true,
    port: 3000,
    hmr: {
      port: 3001
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../shared/src')
    }
  },
  optimizeDeps: {
    include: ['msgpackr', 'tiny-ecs']
  }
})
