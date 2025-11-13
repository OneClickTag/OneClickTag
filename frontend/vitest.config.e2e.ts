/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup-e2e.ts'],
    globals: true,
    css: true,
    include: [
      'src/**/*.e2e.{test,spec}.{js,ts,jsx,tsx}',
      'src/test/e2e/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.git/',
      '.cache/',
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}', // Exclude unit tests
    ],
    testTimeout: 30000, // Longer timeout for e2e tests
    hookTimeout: 30000,
    teardownTimeout: 10000,
    // Run e2e tests sequentially to avoid conflicts
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    reporter: process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: {
      junit: './coverage/e2e-junit-report.xml',
    },
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:3001',
      E2E_TEST: 'true',
    },
  },
})