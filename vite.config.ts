// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-pdf-worker',
      buildStart() {
        // Ensure public directory exists
        if (!existsSync('public')) {
          mkdirSync('public');
        }
        
        // Copy PDF worker
        try {
          copyFileSync(
            'node_modules/pdfjs-dist/build/pdf.worker.min.js',
            'public/pdf.worker.min.js'
          );
        } catch (error) {
          console.warn('Could not copy PDF worker:', error);
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist']
        }
      }
    }
  }
})
