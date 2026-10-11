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
  server: {
    watch: {
      // The Ski map's 21,000 square files only change when npm run import-ski-map regenerates them
      ignored: ['**/public/skimap/**']
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
