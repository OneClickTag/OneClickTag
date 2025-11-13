# Frontend Testing Guide

This document provides comprehensive guidance for testing the OneClickTag frontend application using Vitest, React Testing Library, MSW, and accessibility testing tools.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Testing Patterns](#testing-patterns)
- [Accessibility Testing](#accessibility-testing)
- [API Mocking](#api-mocking)
- [Best Practices](#best-practices)
- [CI/CD Integration](#ci-cd-integration)

## Overview

Our testing strategy follows the testing pyramid approach:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and user flows
- **E2E Tests**: Test complete user journeys
- **Accessibility Tests**: Ensure WCAG compliance

## Testing Stack

### Core Tools

- **[Vitest](https://vitest.dev/)**: Fast unit test framework
- **[React Testing Library](https://testing-library.com/react)**: Component testing utilities
- **[MSW](https://mswjs.io/)**: API mocking for realistic network requests
- **[jest-axe](https://github.com/nickcolley/jest-axe)**: Accessibility testing
- **[@faker-js/faker](https://fakerjs.dev/)**: Test data generation

### Supporting Libraries

- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom DOM matchers
- **jsdom**: DOM implementation for testing
- **@axe-core/react**: Runtime accessibility checking

## Project Structure

```
src/
├── test/
│   ├── setup.ts                    # Global test setup
│   ├── setup-e2e.ts               # E2E test setup
│   ├── setup-a11y.ts              # Accessibility test setup
│   ├── utils/
│   │   ├── test-utils.tsx          # Custom render functions
│   │   └── accessibility-utils.ts  # A11y testing utilities
│   ├── fixtures/
│   │   ├── auth.ts                 # Authentication test data
│   │   ├── customers.ts            # Customer test data
│   │   └── campaigns.ts            # Campaign test data
│   ├── mocks/
│   │   ├── server.ts               # MSW server setup
│   │   ├── server-e2e.ts           # E2E MSW server
│   │   └── handlers/               # API request handlers
│   ├── e2e/                        # Integration/E2E tests
│   └── a11y/                       # Accessibility-specific tests
├── components/
│   └── **/*.{test,spec,a11y.test}.{ts,tsx}  # Component tests
└── pages/
    └── **/*.{test,spec,a11y.test}.{ts,tsx}    # Page tests
```

## Running Tests

### Available Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run with coverage report
npm run test:coverage

# Run E2E tests only
npm run test:e2e

# Run accessibility tests only
npm run test:a11y
```

### Configuration Files

- `vitest.config.ts` - Main Vitest configuration
- `vitest.config.e2e.ts` - E2E test configuration
- `vitest.config.a11y.ts` - Accessibility test configuration

## Writing Tests

### Basic Component Test

```typescript
// components/ui/button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { renderWithUser } from '@/test/utils/test-utils'
import { Button } from './button'

describe('Button', () => {
  it('renders and handles click events', async () => {
    const handleClick = vi.fn()
    const { user, getByRole } = renderWithUser(
      <Button onClick={handleClick}>Click me</Button>
    )
    
    const button = getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Integration Test Example

```typescript
// test/e2e/customer-flow.e2e.test.tsx
import { describe, it, expect } from 'vitest'
import { renderWithUser, waitForLoadingToFinish } from '@/test/utils/test-utils'
import { CustomerManagement } from '@/pages/CustomerManagement'

describe('Customer Management Flow', () => {
  it('creates a new customer successfully', async () => {
    const { user, getByTestId, getByRole } = renderWithUser(
      <CustomerManagement />
    )

    // Open create dialog
    await user.click(getByTestId('create-customer-btn'))
    
    // Fill form
    await user.type(getByRole('textbox', { name: /name/i }), 'John Doe')
    await user.type(getByRole('textbox', { name: /email/i }), 'john@example.com')
    
    // Submit
    await user.click(getByRole('button', { name: /create/i }))
    await waitForLoadingToFinish()
    
    // Verify result
    expect(getByTestId('customer-list')).toHaveTextContent('John Doe')
  })
})
```

### Accessibility Test Example

```typescript
// components/ui/button.a11y.test.tsx
import { describe, it } from 'vitest'
import { renderForA11y, testAccessibility } from '@/test/utils/test-utils'
import { KeyboardNavigationTester } from '@/test/utils/accessibility-utils'
import { Button } from './button'

describe('Button Accessibility', () => {
  it('meets WCAG 2.1 AA standards', async () => {
    const renderResult = renderForA11y(<Button>Accessible Button</Button>)
    await testAccessibility(renderResult)
  })

  it('supports keyboard navigation', async () => {
    const { container } = renderForA11y(<Button>Keyboard Button</Button>)
    
    const navTester = new KeyboardNavigationTester(container)
    await navTester.testTabNavigation()
    await navTester.testKeyboardActivation()
  })
})
```

## Testing Patterns

### Custom Render Functions

We provide several custom render functions with common providers:

```typescript
import { renderWithUser, renderForA11y, renderWithProviders } from '@/test/utils/test-utils'

// Basic render with React Query and Router
const { getByRole } = renderWithProviders(<MyComponent />)

// With user event utilities
const { user, getByRole } = renderWithUser(<MyComponent />)

// Optimized for accessibility testing
const renderResult = renderForA11y(<MyComponent />)
```

### Mock Data Generation

Use our fixture generators for consistent test data:

```typescript
import { generateMockCustomer, testCustomers } from '@/test/fixtures/customers'

// Generate random customer
const customer = generateMockCustomer()

// Use predefined test customers
const activeCustomer = testCustomers.active
```

### Form Testing

```typescript
import { formHelpers } from '@/test/utils/test-utils'

const { user, getByRole } = renderWithUser(<MyForm />)

// Fill form using helpers
await formHelpers.fillInput(user, getByRole('textbox', { name: /name/i }), 'John Doe')
await formHelpers.selectOption(user, getByRole('combobox'), 'option-value')
await formHelpers.submitForm(user, getByRole('form'))
```

## Accessibility Testing

### Automatic Testing

```typescript
import { testAccessibility, a11yTestConfigs } from '@/test/utils/accessibility-utils'

// Basic WCAG 2.1 AA compliance
await testAccessibility(renderResult, a11yTestConfigs.wcag21aa)

// Form-specific accessibility
await testAccessibility(renderResult, a11yTestConfigs.forms)

// Navigation accessibility
await testAccessibility(renderResult, a11yTestConfigs.navigation)
```

### Manual Testing Utilities

```typescript
import { 
  KeyboardNavigationTester, 
  ScreenReaderTester,
  ariaUtils 
} from '@/test/utils/accessibility-utils'

// Test keyboard navigation
const navTester = new KeyboardNavigationTester(container)
await navTester.testTabNavigation()

// Test screen reader announcements
const screenReader = new ScreenReaderTester(container)
await screenReader.waitForAnnouncement('Loading complete')

// Test ARIA attributes
const hasProperLabeling = ariaUtils.hasProperLabeling(element)
```

## API Mocking

### MSW Setup

Our MSW configuration provides realistic API responses:

```typescript
// Automatic mocking in tests
import { server } from '@/test/mocks/server'

// Override specific endpoints
server.use(
  http.get('/api/customers', () => {
    return HttpResponse.json(mockCustomers)
  })
)

// Simulate errors
server.use(
  http.post('/api/customers', () => {
    return HttpResponse.json(
      { message: 'Email already exists' },
      { status: 409 }
    )
  })
)
```

### Available Mock Handlers

- **Authentication**: Login, logout, registration, token refresh
- **Customers**: CRUD operations, search, bulk operations
- **Campaigns**: Management, analytics, GTM sync
- **Analytics**: Dashboard data, reports, exports
- **Tenants**: Settings, users, billing
- **Errors**: Various error scenarios for testing

## Best Practices

### Test Organization

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    // Test rendering logic
  })

  describe('Interactions', () => {
    // Test user interactions
  })

  describe('Edge Cases', () => {
    // Test error states and boundaries
  })

  describe('Accessibility', () => {
    // Test a11y compliance
  })
})
```

### Async Testing

```typescript
// Wait for async operations
import { waitFor, waitForElementToBeRemoved } from '@testing-library/react'

// Wait for element to appear
await waitFor(() => {
  expect(getByText('Loading complete')).toBeInTheDocument()
})

// Wait for loading to finish
await waitForElementToBeRemoved(() => getByTestId('loading'))

// Use custom utility
await waitForLoadingToFinish()
```

### Error Testing

```typescript
// Test error boundaries
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Test with error boundary
const { rerender } = renderWithProviders(
  <ErrorBoundary>
    <ThrowError shouldThrow={false} />
  </ErrorBoundary>
)

rerender(
  <ErrorBoundary>
    <ThrowError shouldThrow={true} />
  </ErrorBoundary>
)

expect(getByText('Something went wrong')).toBeInTheDocument()
```

### Performance Testing

```typescript
// Test loading states
it('shows loading state during API calls', async () => {
  // Mock slow API
  server.use(
    http.get('/api/data', async () => {
      await delay(2000)
      return HttpResponse.json(data)
    })
  )

  const { getByTestId } = renderWithUser(<MyComponent />)
  
  expect(getByTestId('loading')).toBeInTheDocument()
  
  await waitForElementToBeRemoved(() => getByTestId('loading'))
})
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:a11y
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout in test config
2. **MSW not intercepting**: Check server setup in test files
3. **React Query cache issues**: Use fresh QueryClient per test
4. **Focus management**: Use `act()` for focus-related assertions
5. **Async state updates**: Use `waitFor` or `findBy` queries

### Debug Tools

```typescript
// Debug rendered component
import { screen } from '@testing-library/react'
screen.debug() // Prints current DOM

// Debug specific element
screen.debug(getByTestId('my-element'))

// Use testing-library queries
screen.logTestingPlaygroundURL() // Get Testing Playground URL
```

### Performance Optimization

```typescript
// Optimize test execution
// Use concurrent tests where safe
test.concurrent('test name', async () => {
  // Test implementation
})

// Mock heavy dependencies
vi.mock('@/lib/heavy-library', () => ({
  heavyFunction: vi.fn(() => 'mocked-result'),
}))
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

For questions or issues with testing, please refer to this guide or reach out to the development team.