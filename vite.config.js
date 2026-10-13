import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import clarityLocalApi from './lib/clarity/vitePlugin.js'

export default defineConfig({
  plugins: [react(), clarityLocalApi()],
  server: {
    host: 'localhost',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
