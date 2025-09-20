import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Otimizações do React
      babel: {
        plugins: [
          // Remover console.log em produção
          process.env.NODE_ENV === 'production' && [
            'transform-remove-console',
            { exclude: ['error', 'warn'] }
          ]
        ].filter(Boolean)
      }
    })
  ],
  
  server: {
    allowedHosts: true
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  
  // Otimizações de build
  build: {
    // Configurações de otimização
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      }
    },
    
    // Configurações de chunk
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'utils-vendor': ['date-fns', 'framer-motion', 'recharts'],
          'form-vendor': ['react-hook-form', 'zod'],
          
          // Feature chunks
          'auth': ['./src/components/auth'],
          'qa': ['./src/components/qa'],
          'monitoring': ['./src/components/monitoring'],
          'pwa': ['./src/components/pwa']
        },
        
        // Nomeação de arquivos
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    
    // Configurações de CSS
    cssCodeSplit: true,
    
    // Configurações de sourcemap
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Configurações de tamanho
    chunkSizeWarningLimit: 1000,
    
    // Configurações de assets
    assetsInlineLimit: 4096
  },
  
  // Otimizações de dependências
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
    
    // Incluir dependências que precisam ser pré-construídas
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
      'sonner'
    ],
    
    // Excluir dependências que não precisam ser otimizadas
    exclude: [
      'virtual:sw-inject'
    ]
  },
  
  // Configurações de preview
  preview: {
    port: 4173,
    strictPort: true
  },
  
  // Configurações de define
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})

