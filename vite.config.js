import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    },
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      port: 443,
      clientPort: 443
    }
  },
  preview: {
    port: 5173,
    host: true
  }
})
