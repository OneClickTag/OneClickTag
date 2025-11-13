import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      // Bundle analyzer for production builds
      mode === 'production' && visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@shared': resolve(__dirname, '../shared'),
      },
    },

    // Build configuration optimized for Vercel
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
      
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-toast',
              '@radix-ui/react-select'
            ],
            'data-vendor': [
              '@tanstack/react-query',
              '@tanstack/react-table',
              'axios'
            ],
            'form-vendor': [
              'react-hook-form',
              '@hookform/resolvers',
              'zod'
            ],
            'chart-vendor': ['recharts'],
            'utils': ['clsx', 'tailwind-merge', 'class-variance-authority']
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },

      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
    },

    // Development server configuration
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      }
    },

    // Preview server for production builds
    preview: {
      port: 3000,
      host: true
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || 'dev'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV || 'development'),
    },

    // CSS configuration
    css: {
      devSourcemap: mode === 'development',
      postcss: './postcss.config.js'
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        '@tanstack/react-table',
        'axios',
        'clsx',
        'tailwind-merge'
      ],
      exclude: ['@shared']
    },

    // ESBuild configuration
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    }
  }
})