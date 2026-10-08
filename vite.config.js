import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
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

