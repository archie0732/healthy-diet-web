import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://120.110.113.111:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // 把 /api 拔掉再送給 Rust
      }
    }
  }
})
