import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching and smaller initial bundle
        manualChunks: {
          // Core React libraries - rarely change, cache well
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data fetching layer
          'vendor-query': ['@tanstack/react-query'],
          // Heavy graph visualization libs - only loaded on /lineage route
          'vendor-graph': ['@xyflow/react', '@dagrejs/dagre'],
        },
      },
    },
  },
})
