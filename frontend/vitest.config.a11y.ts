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
    setupFiles: ['./src/test/setup-a11y.ts'],
    globals: true,
    css: true,
    include: [
      'src/**/*.a11y.{test,spec}.{js,ts,jsx,tsx}',
      'src/test/a11y/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.git/',
      '.cache/',
    ],
    testTimeout: 15000, // Longer timeout for accessibility tests
    hookTimeout: 15000,
    teardownTimeout: 5000,
    // Run accessibility tests with threading
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        useAtomics: true,
      },
    },
    reporter: process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: {
      junit: './coverage/a11y-junit-report.xml',
    },
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:3001',
      A11Y_TEST: 'true',
    },
  },
})