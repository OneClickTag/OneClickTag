/**
 * Test utilities and custom render functions
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Types
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  queryClient?: QueryClient
  user?: ReturnType<typeof userEvent.setup>
}

export interface RenderWithUserResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>
}

// Create a custom render function that includes providers
function createWrapper(options: CustomRenderOptions = {}) {
  const { initialEntries = ['/'], queryClient } = options

  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={client}>
          {children}
        </QueryClientProvider>
      </BrowserRouter>
    )
  }
}

// Custom render function
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { queryClient, user, ...renderOptions } = options
  
  const Wrapper = createWrapper({ queryClient })
  
  return render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  })
}

// Custom render function with user event setup
export function renderWithUser(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderWithUserResult {
  const userEventInstance = options.user || userEvent.setup()
  
  const result = renderWithProviders(ui, options)
  
  return {
    user: userEventInstance,
    ...result,
  }
}

// Render component for accessibility testing
export function renderForA11y(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  return renderWithProviders(ui, {
    ...options,
    container: document.body, // Render in body for better a11y testing
  })
}

// Mock implementations for common hooks and services
export const mockHooks = {
  useAuth: () => ({
    user: { 
      id: 'test-user', 
      email: 'test@example.com', 
      name: 'Test User',
      role: 'admin',
    },
    tenant: { 
      id: 'test-tenant', 
      name: 'Test Tenant',
      plan: 'premium',
    },
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
  }),

  useCustomers: () => ({
    customers: [],
    isLoading: false,
    error: null,
    fetchCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
  }),

  useCampaigns: () => ({
    campaigns: [],
    isLoading: false,
    error: null,
    fetchCampaigns: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    deleteCampaign: vi.fn(),
  }),

  useAnalytics: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}

// Wait for React Query loading states
export async function waitForLoadingToFinish() {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => expect(document.querySelector('[data-testid="loading"]')).not.toBeInTheDocument())
}

// Helper to wait for async operations
export async function waitForNextTick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Mock window properties
export function mockWindowProperty<T extends keyof Window>(
  property: T,
  value: Window[T]
): () => void {
  const originalValue = window[property]
  
  Object.defineProperty(window, property, {
    writable: true,
    value,
  })
  
  return () => {
    Object.defineProperty(window, property, {
      writable: true,
      value: originalValue,
    })
  }
}

// Mock console methods
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  }

  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
  console.info = vi.fn()

  return () => {
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    console.info = originalConsole.info
  }
}

// Create test query client
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  })
}

// Simulate form interactions
export const formHelpers = {
  fillInput: async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement, value: string) => {
    await user.clear(element)
    await user.type(element, value)
  },

  selectOption: async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement, option: string) => {
    await user.selectOptions(element, option)
  },

  checkBox: async (user: ReturnType<typeof userEvent.setup>, element: HTMLElement) => {
    await user.click(element)
  },

  submitForm: async (user: ReturnType<typeof userEvent.setup>, form: HTMLElement) => {
    await user.click(form.querySelector('button[type="submit"]') as HTMLElement)
  },
}

// Test data helpers
export const testData = {
  createMockEvent: (overrides: Partial<Event> = {}): Event => ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: document.createElement('div'),
    currentTarget: document.createElement('div'),
    type: 'click',
    bubbles: true,
    cancelable: true,
    ...overrides,
  } as Event),

  createMockFile: (name: string = 'test.txt', content: string = 'test content'): File => {
    return new File([content], name, { type: 'text/plain' })
  },

  createMockFormData: (data: Record<string, string>): FormData => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value)
    })
    return formData
  },
}

// Async testing helpers
export const asyncHelpers = {
  waitForElement: async (selector: string, timeout: number = 1000): Promise<Element | null> => {
    const { waitFor } = await import('@testing-library/react')
    let element: Element | null = null
    
    await waitFor(() => {
      element = document.querySelector(selector)
      return element !== null
    }, { timeout })
    
    return element
  },

  waitForElementToBeRemoved: async (selector: string, timeout: number = 1000): Promise<void> => {
    const { waitFor } = await import('@testing-library/react')
    
    await waitFor(() => {
      const element = document.querySelector(selector)
      return element === null
    }, { timeout })
  },

  flushPromises: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 0))
  },
}

// Custom matchers for better assertions
export const customMatchers = {
  toBeLoading: (element: HTMLElement) => {
    const isLoading = element.getAttribute('aria-busy') === 'true' ||
                     element.querySelector('[data-testid="loading"]') !== null ||
                     element.classList.contains('loading')
    
    return {
      pass: isLoading,
      message: () => `Expected element ${isLoading ? 'not ' : ''}to be loading`,
    }
  },

  toHaveErrorMessage: (element: HTMLElement, message?: string) => {
    const errorElement = element.querySelector('[role="alert"], .error-message')
    const hasError = errorElement !== null
    const errorText = errorElement?.textContent || ''
    const messageMatches = !message || errorText.includes(message)
    
    return {
      pass: hasError && messageMatches,
      message: () => {
        if (!hasError) return 'Expected element to have an error message'
        if (!messageMatches) return `Expected error message to contain "${message}", but got "${errorText}"`
        return `Expected element not to have error message "${message}"`
      },
    }
  },
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { userEvent }

// Default export
export { renderWithProviders as render }