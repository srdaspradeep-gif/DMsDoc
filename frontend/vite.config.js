import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.VITE_SERVER_HOST || '0.0.0.0',
    port: parseInt(process.env.VITE_SERVER_PORT || '3000', 10),
    proxy: {
      '/api': {
        // Use environment variable for API target, fallback to Docker service name or localhost
        target: process.env.VITE_API_PROXY_TARGET || process.env.VITE_API_URL || 'http://api:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})

