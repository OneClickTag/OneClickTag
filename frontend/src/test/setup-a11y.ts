/**
 * Accessibility test setup for Vitest
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { server } from './mocks/server'
import { configureAxe } from 'jest-axe'

// Configure axe-core for accessibility testing
const axe = configureAxe({
  rules: {
    // Disable some rules that may not be relevant for testing
    'color-contrast': { enabled: true }, // Keep color contrast checking
    'landmark-one-main': { enabled: false }, // May not be relevant for component testing
    'page-has-heading-one': { enabled: false }, // May not be relevant for component testing
    'region': { enabled: false }, // May not be relevant for component testing
  },
  tags: [
    'wcag2a',
    'wcag2aa',
    'wcag21aa',
    'best-practice',
  ],
})

// Make axe available globally for tests
global.axe = axe

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
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

// Enhanced accessibility-focused mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => {
    // Support prefers-reduced-motion and other a11y media queries
    const matches = (() => {
      if (query === '(prefers-reduced-motion: reduce)') return false
      if (query === '(prefers-color-scheme: dark)') return false
      if (query === '(min-width: 768px)') return true
      return false
    })()

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  }),
})

// Mock focus management for accessibility testing
const focusMock = {
  focus: vi.fn(),
  blur: vi.fn(),
}

Element.prototype.focus = focusMock.focus
Element.prototype.blur = focusMock.blur

// Enhanced scrollIntoView for accessibility
Element.prototype.scrollIntoView = vi.fn().mockImplementation(function(this: Element, options) {
  // Simulate focus management during scroll
  if (this instanceof HTMLElement) {
    this.focus()
  }
})

// Mock Screen Reader APIs
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    onvoiceschanged: null,
  },
})

// Mock high contrast mode detection
Object.defineProperty(window, 'CSS', {
  writable: true,
  value: {
    supports: vi.fn().mockImplementation((property, value) => {
      if (property === '-ms-high-contrast' && value === 'active') return false
      if (property === 'forced-colors' && value === 'active') return false
      return true
    }),
  },
})

// Mock Clipboard API for accessibility tests
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
})

// Mock aria-live regions
const announcements: string[] = []
const mockAriaLive = {
  announce: vi.fn((message: string) => {
    announcements.push(message)
  }),
  clear: vi.fn(() => {
    announcements.length = 0
  }),
  getAnnouncements: vi.fn(() => [...announcements]),
}

global.mockAriaLive = mockAriaLive

// Accessibility testing utilities
global.a11yUtils = {
  getAnnouncedMessages: () => mockAriaLive.getAnnouncements(),
  clearAnnouncements: () => mockAriaLive.clear(),
  simulateScreenReader: (element: HTMLElement) => {
    // Simulate screen reader navigation
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const el = node as HTMLElement
          if (el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true') {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )
    
    const focusableElements: HTMLElement[] = []
    let node = walker.nextNode() as HTMLElement
    
    while (node) {
      if (node.tabIndex >= 0 || 
          ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName) ||
          node.hasAttribute('role')) {
        focusableElements.push(node)
      }
      node = walker.nextNode() as HTMLElement
    }
    
    return focusableElements
  },
}

// A11y environment variables
process.env.NODE_ENV = 'test'
process.env.A11Y_TEST = 'true'
process.env.VITE_API_BASE_URL = 'http://localhost:3001'

// Extend expect with axe matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }
  }
  
  var axe: any
  var mockAriaLive: typeof mockAriaLive
  var a11yUtils: typeof global.a11yUtils
}