import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'offline.html',
        'icons/favicon.ico',
        'icons/favicon-16.png',
        'icons/favicon-32.png',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-192-maskable.png',
        'icons/icon-512-maskable.png',
        'brand/logo-mark.png',
        'brand/logo-wordmark.png',
        'brand/mascot.png',
      ],
      manifest: {
        id: '/',
        name: 'Evocto — Marketing Operacional',
        short_name: 'Evocto',
        description: 'Hub operacional para times e agências de marketing e comunicação',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#ffffff',
        theme_color: '#6C47D8',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'evocto-static-assets',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' && !url.hostname.includes('appwrite.io'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'evocto-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/') ||
              url.pathname.startsWith('/v1/') ||
              url.hostname.includes('appwrite.io'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],

  server: {
    host: '127.0.0.1',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'utils-vendor': ['date-fns', 'framer-motion', 'recharts'],
          'form-vendor': ['react-hook-form', 'zod'],
        },
        chunkFileNames: () => `js/[name]-[hash].js`,
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset'
          const ext = name.split('.').pop()
          if (/\.(css)$/.test(name)) return `css/[name]-[hash].${ext}`
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(name)) return `images/[name]-[hash].${ext}`
          return `assets/[name]-[hash].${ext}`
        },
      },
    },
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV === 'development',
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
  },

  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      'date-fns',
      'framer-motion',
      'recharts',
      'react-hook-form',
      'zod',
      'sonner',
    ],
  },

  preview: {
    port: 4173,
    strictPort: true,
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
