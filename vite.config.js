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
        '/backend': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/backend/, ''),
        }
      }
    } : undefined,
  }
})
