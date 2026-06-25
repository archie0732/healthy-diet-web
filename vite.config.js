/* global process */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = (env.VITE_API_BASE || '').trim().replace(/\/+$/, '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") }
    },
    server: proxyTarget ? {
      proxy: {
        '/auth': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/api/': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.startsWith('/api/admin/')
            ? requestPath.replace(/^\/api\/admin/, '/admin')
            : requestPath,
        },
        '/openapi.yml': {
          target: proxyTarget,
          changeOrigin: true,
        }
      }
    } : undefined,
  }
})
