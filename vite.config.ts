import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',      // allow network access from other devices
    port: 5173,
    strictPort: true,      // prevents silent port changes
    allowedHosts: ['conceptacular-supereminently-kamala.ngrok-free.dev'],
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
    proxy: {
      '/ngrok': {
        target: 'conceptacular-supereminently-kamala.ngrok-free.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ngrok/, ''),
      },
    },
  },
})