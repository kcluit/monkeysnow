import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        // The Resort list changes only when it is regenerated, so it gets its own
        // chunk that stays cached across app deploys
        manualChunks(id) {
          if (id.replace(/\\/g, '/').endsWith('/src/data/resorts/resorts.json')) return 'resorts';
        }
      }
    }
  }
})
