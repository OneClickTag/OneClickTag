/**
 * E2E test setup for Vitest
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { server } from './mocks/server-e2e'

// Establish API mocking before all tests with realistic data
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // More permissive for e2e tests
  })
})

// Reset any request handlers that were added during tests
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Clean up after the tests are finished
afterAll(() => {
  server.close()
})

// E2E specific mocks - more realistic behavior
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => {
    // More realistic matchMedia implementation for e2e tests
    const mediaQuery = {
      matches: query === '(min-width: 768px)', // Default to desktop
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    return mediaQuery
  }),
})

// More realistic ResizeObserver for e2e tests
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((element) => {
    // Simulate resize observation
    setTimeout(() => {
      callback([{
        target: element,
        contentRect: {
          width: 1024,
          height: 768,
        },
      }])
    }, 0)
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Realistic IntersectionObserver for e2e tests
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((element) => {
    // Simulate intersection
    setTimeout(() => {
      callback([{
        target: element,
        isIntersecting: true,
        intersectionRatio: 1,
      }])
    }, 0)
  }),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock realistic element dimensions
Object.defineProperties(window.HTMLElement.prototype, {
  offsetHeight: {
    get() {
      return parseFloat(this.style.height) || 100 // More realistic default
    },
  },
  offsetWidth: {
    get() {
      return parseFloat(this.style.width) || 200 // More realistic default
    },
  },
  clientHeight: {
    get() {
      return parseFloat(this.style.height) || 100
    },
  },
  clientWidth: {
    get() {
      return parseFloat(this.style.width) || 200
    },
  },
  scrollHeight: {
    get() {
      return parseFloat(this.style.height) || 100
    },
  },
  scrollWidth: {
    get() {
      return parseFloat(this.style.width) || 200
    },
  },
})

// Mock fetch with timeout for e2e tests
const originalFetch = global.fetch
global.fetch = vi.fn().mockImplementation(async (input, init) => {
  // Add realistic network delay for e2e tests
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
  return originalFetch(input, init)
})

// Mock realistic user agent
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
})

// E2E environment variables
process.env.NODE_ENV = 'test'
process.env.E2E_TEST = 'true'
process.env.VITE_API_BASE_URL = 'http://localhost:3001'