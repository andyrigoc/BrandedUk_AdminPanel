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
        target: 'https://api.brandeduk.com',
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: 'https://admin.brandeduk.com',
        },
      },
      '/assets': {
        target: 'https://api.brandeduk.com',
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: 'https://admin.brandeduk.com',
        },
      },
      '/uploads': {
        target: 'https://api.brandeduk.com',
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: 'https://admin.brandeduk.com',
        },
      }
    }
  }
})
