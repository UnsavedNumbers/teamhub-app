import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'

function parseSimpleEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {}

  const content = fs.readFileSync(filePath, 'utf8')
  const result: Record<string, string> = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex < 1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

function hydrateDemoBuildEnvFromFile() {
  const demoEnvPath = path.resolve(__dirname, '.env.demo')
  const parsed = parseSimpleEnvFile(demoEnvPath)
  const requiredKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

  for (const key of requiredKeys) {
    const current = process.env[key]
    if ((current === undefined || current.trim() === '') && parsed[key]) {
      process.env[key] = parsed[key]
    }
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'demo') {
    hydrateDemoBuildEnvFromFile()
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['images/logo-icon.png'],
        manifest: {
          name: 'Youth Sports',
          short_name: 'YouthSports',
          description: 'Youth Sports Parent Portal',
          theme_color: '#0f172a',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/images/logo-icon.png',
              sizes: '1000x1000',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallbackDenylist: [
            /\/api\//,
            /\/rest\/v1\//,
            /\/realtime\/v1\//,
            /\/storage\/v1\//,
            /\/functions\/v1\//,
          ],
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.pathname.includes('/rest/v1/') ||
                url.pathname.includes('/realtime/v1/') ||
                url.pathname.includes('/storage/v1/') ||
                url.pathname.includes('/functions/v1/'),
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    optimizeDeps: {
      include: ['react-hook-form'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
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
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['node_modules', 'backups', 'supabase'],
      css: true,
      env: {
        VITE_USE_FAKE_DATA: 'true',
        VITE_SUPABASE_URL: 'https://demo.supabase.local',
        VITE_SUPABASE_ANON_KEY: 'demo-anon-key',
      },
    },
  }
})
