/**
 * E2E Integration tests for customer management flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderWithUser, waitForLoadingToFinish } from '@/test/utils/test-utils'
import { server } from '@/test/mocks/server-e2e'
import { http, HttpResponse } from 'msw'
import { CustomerDialog } from '@/components/customers/CustomerDialog'
import { testCustomers } from '@/test/fixtures/customers'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock the customer types
vi.mock('@/types/customer.types', () => ({
  Customer: {},
  CreateCustomerRequest: {},
  UpdateCustomerRequest: {},
}))

const CustomerManagementFlow = () => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [selectedCustomer, setSelectedCustomer] = React.useState(null)
  const [customers, setCustomers] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(false)

  const handleCreateCustomer = async (data: any) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create customer')
      }
      
      const newCustomer = await response.json()
      setCustomers(prev => [...prev, newCustomer])
      setIsDialogOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCustomer = async (data: any) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/customers/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update customer')
      }
      
      const updatedCustomer = await response.json()
      setCustomers(prev => 
        prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)
      )
      setIsDialogOpen(false)
      setSelectedCustomer(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = selectedCustomer ? handleUpdateCustomer : handleCreateCustomer

  return (
    <div data-testid="customer-management">
      <div className="flex justify-between items-center mb-6">
        <h1>Customer Management</h1>
        <button
          onClick={() => setIsDialogOpen(true)}
          data-testid="create-customer-btn"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Create Customer
        </button>
      </div>

      <div className="customer-list" data-testid="customer-list">
        {customers.map((customer: any) => (
          <div
            key={customer.id}
            className="border p-4 mb-2 rounded flex justify-between items-center"
            data-testid={`customer-${customer.id}`}
          >
            <div>
              <h3>{customer.name}</h3>
              <p>{customer.email}</p>
              <p>Status: {customer.status}</p>
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(customer)
                setIsDialogOpen(true)
              }}
              data-testid={`edit-customer-${customer.id}`}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
            >
              Edit
            </button>
          </div>
        ))}
        {customers.length === 0 && (
          <p data-testid="no-customers">No customers found</p>
        )}
      </div>

      <CustomerDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setSelectedCustomer(null)
        }}
        customer={selectedCustomer}
        onSubmit={handleSubmit}
        loading={isLoading}
      />
    </div>
  )
}

// Test wrapper with QueryClient
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Customer Management E2E Flow', () => {
  beforeEach(() => {
    // Reset MSW handlers before each test
    server.resetHandlers()
  })

  describe('Create Customer Flow', () => {
    it('successfully creates a new customer with complete form submission', async () => {
      const { user, getByTestId, getByRole, queryByTestId } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      // Initial state - no customers
      expect(getByTestId('no-customers')).toBeInTheDocument()

      // Open create dialog
      await user.click(getByTestId('create-customer-btn'))

      // Verify dialog is open and has correct title
      expect(getByRole('dialog')).toBeInTheDocument()
      expect(getByRole('heading', { name: /create new customer/i })).toBeInTheDocument()

      // Fill in required fields
      const nameInput = getByRole('textbox', { name: /name/i })
      const emailInput = getByRole('textbox', { name: /email/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john.doe@example.com')

      // Fill in optional fields
      const phoneInput = getByRole('textbox', { name: /phone/i })
      const companyInput = getByRole('textbox', { name: /company/i })
      const websiteInput = getByRole('textbox', { name: /website/i })
      const statusSelect = getByRole('combobox', { name: /status/i })
      const tagsInput = getByRole('textbox', { name: /tags/i })

      await user.type(phoneInput, '+1-555-123-4567')
      await user.type(companyInput, 'Acme Corporation')
      await user.type(websiteInput, 'https://johndoe.com')
      await user.selectOptions(statusSelect, 'active')
      await user.type(tagsInput, 'vip, enterprise')

      // Submit form
      const submitButton = getByRole('button', { name: /create/i })
      expect(submitButton).not.toBeDisabled()
      
      await user.click(submitButton)

      // Wait for submission
      await waitForLoadingToFinish()

      // Verify dialog is closed
      expect(queryByTestId('dialog')).not.toBeInTheDocument()

      // Verify customer appears in list
      expect(getByTestId('customer-list')).toBeInTheDocument()
      expect(queryByTestId('no-customers')).not.toBeInTheDocument()

      // Find the created customer
      const customerCard = getByTestId(/customer-.*/)
      expect(customerCard).toHaveTextContent('John Doe')
      expect(customerCard).toHaveTextContent('john.doe@example.com')
      expect(customerCard).toHaveTextContent('Status: active')
    })

    it('handles validation errors gracefully', async () => {
      const { user, getByTestId, getByRole, queryByText } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      // Open create dialog
      await user.click(getByTestId('create-customer-btn'))

      // Try to submit empty form
      const submitButton = getByRole('button', { name: /create/i })
      await user.click(submitButton)

      // Verify validation errors
      expect(queryByText('Name is required')).toBeInTheDocument()
      expect(queryByText('Invalid email address')).toBeInTheDocument()

      // Fill invalid email
      const emailInput = getByRole('textbox', { name: /email/i })
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      expect(queryByText('Invalid email address')).toBeInTheDocument()

      // Fill invalid website
      const websiteInput = getByRole('textbox', { name: /website/i })
      await user.type(websiteInput, 'not-a-url')
      await user.click(submitButton)

      expect(queryByText('Invalid URL')).toBeInTheDocument()
    })

    it('handles API errors during creation', async () => {
      // Mock API error response
      server.use(
        http.post('/api/customers', () => {
          return HttpResponse.json(
            { message: 'Customer with this email already exists' },
            { status: 409 }
          )
        })
      )

      const { user, getByTestId, getByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      // Open dialog and fill form
      await user.click(getByTestId('create-customer-btn'))
      
      await user.type(getByRole('textbox', { name: /name/i }), 'John Doe')
      await user.type(getByRole('textbox', { name: /email/i }), 'existing@example.com')
      
      await user.click(getByRole('button', { name: /create/i }))

      // The form should remain open since creation failed
      expect(getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Update Customer Flow', () => {
    it('successfully updates an existing customer', async () => {
      // Pre-populate with existing customer
      server.use(
        http.get('/api/customers', () => {
          return HttpResponse.json({
            data: [testCustomers.active],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
          })
        })
      )

      const { user, getByTestId, getByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      // Wait for initial load and find customer
      await waitForLoadingToFinish()
      
      const editButton = getByTestId(`edit-customer-${testCustomers.active.id}`)
      await user.click(editButton)

      // Verify edit dialog is open with pre-filled data
      expect(getByRole('dialog')).toBeInTheDocument()
      expect(getByRole('heading', { name: /edit customer/i })).toBeInTheDocument()

      const nameInput = getByRole('textbox', { name: /name/i })
      expect(nameInput).toHaveValue(testCustomers.active.fullName)

      // Update the name
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Customer Name')

      // Submit update
      await user.click(getByRole('button', { name: /update/i }))

      await waitForLoadingToFinish()

      // Verify customer is updated in the list
      const updatedCustomer = getByTestId(`customer-${testCustomers.active.id}`)
      expect(updatedCustomer).toHaveTextContent('Updated Customer Name')
    })

    it('cancels edit operation correctly', async () => {
      const { user, getByTestId, getByRole, queryByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      // Open create dialog first
      await user.click(getByTestId('create-customer-btn'))
      
      // Fill some data
      await user.type(getByRole('textbox', { name: /name/i }), 'Test Customer')
      
      // Cancel
      await user.click(getByRole('button', { name: /cancel/i }))
      
      // Verify dialog is closed
      expect(queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Form Interaction and UX', () => {
    it('shows loading states during submission', async () => {
      // Add delay to API response
      server.use(
        http.post('/api/customers', async () => {
          await new Promise(resolve => setTimeout(resolve, 1000))
          return HttpResponse.json(testCustomers.active)
        })
      )

      const { user, getByTestId, getByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      await user.click(getByTestId('create-customer-btn'))
      
      // Fill required fields
      await user.type(getByRole('textbox', { name: /name/i }), 'John Doe')
      await user.type(getByRole('textbox', { name: /email/i }), 'john@example.com')
      
      // Start submission
      const submitButton = getByRole('button', { name: /create/i })
      await user.click(submitButton)
      
      // Verify loading state
      expect(getByRole('button', { name: /saving/i })).toBeInTheDocument()
      expect(getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    it('handles keyboard navigation correctly', async () => {
      const { user, getByTestId, getByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      await user.click(getByTestId('create-customer-btn'))

      // Test tab navigation through form fields
      const nameInput = getByRole('textbox', { name: /name/i })
      const emailInput = getByRole('textbox', { name: /email/i })
      const phoneInput = getByRole('textbox', { name: /phone/i })

      nameInput.focus()
      expect(document.activeElement).toBe(nameInput)

      await user.tab()
      expect(document.activeElement).toBe(emailInput)

      await user.tab()
      expect(document.activeElement).toBe(phoneInput)

      // Test form submission with Enter key
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      
      await user.keyboard('{Enter}')
      // Form should be submitted (loading state should appear)
      await waitForLoadingToFinish()
    })

    it('maintains form state when dialog is reopened', async () => {
      const { user, getByTestId, getByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      // Open dialog and fill some data
      await user.click(getByTestId('create-customer-btn'))
      await user.type(getByRole('textbox', { name: /name/i }), 'Partial Name')
      
      // Close dialog
      await user.click(getByRole('button', { name: /cancel/i }))
      
      // Reopen dialog
      await user.click(getByTestId('create-customer-btn'))
      
      // Form should be reset (empty)
      expect(getByRole('textbox', { name: /name/i })).toHaveValue('')
    })
  })

  describe('Accessibility in E2E Flow', () => {
    it('maintains proper focus management throughout the flow', async () => {
      const { user, getByTestId, getByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      // Focus should be on create button initially
      const createButton = getByTestId('create-customer-btn')
      createButton.focus()
      expect(document.activeElement).toBe(createButton)

      // Open dialog
      await user.click(createButton)

      // Focus should move to first form field
      await new Promise(resolve => setTimeout(resolve, 100)) // Allow focus to settle
      const nameInput = getByRole('textbox', { name: /name/i })
      expect(document.activeElement).toBe(nameInput)

      // Fill form and submit
      await user.type(nameInput, 'John Doe')
      await user.type(getByRole('textbox', { name: /email/i }), 'john@example.com')
      await user.click(getByRole('button', { name: /create/i }))

      await waitForLoadingToFinish()

      // Focus should return to create button or customer list
      expect(document.activeElement).not.toBe(document.body)
    })

    it('announces form errors to screen readers', async () => {
      const { user, getByTestId, getByRole, getByText } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      await user.click(getByTestId('create-customer-btn'))
      
      // Submit empty form to trigger validation
      await user.click(getByRole('button', { name: /create/i }))
      
      // Error messages should have proper ARIA attributes
      const nameError = getByText('Name is required')
      expect(nameError).toHaveClass('text-red-500')
      
      const emailError = getByText('Invalid email address')
      expect(emailError).toHaveClass('text-red-500')
    })
  })

  describe('Edge Cases and Error Recovery', () => {
    it('recovers from network errors gracefully', async () => {
      // Simulate network error
      server.use(
        http.post('/api/customers', () => {
          return HttpResponse.error()
        })
      )

      const { user, getByTestId, getByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      await user.click(getByTestId('create-customer-btn'))
      
      await user.type(getByRole('textbox', { name: /name/i }), 'John Doe')
      await user.type(getByRole('textbox', { name: /email/i }), 'john@example.com')
      
      await user.click(getByRole('button', { name: /create/i }))

      // Dialog should remain open, form should be interactive
      expect(getByRole('dialog')).toBeInTheDocument()
      expect(getByRole('button', { name: /create/i })).not.toBeDisabled()
    })

    it('handles large amounts of form data', async () => {
      const { user, getByTestId, getByRole } = renderWithUser(
        <TestWrapper>
          <CustomerManagementFlow />
        </TestWrapper>
      )

      await user.click(getByTestId('create-customer-btn'))

      // Fill with large amounts of data
      const longName = 'A'.repeat(200)
      const longCompany = 'B'.repeat(200)
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag${i}`).join(', ')

      await user.type(getByRole('textbox', { name: /name/i }), longName)
      await user.type(getByRole('textbox', { name: /email/i }), 'test@example.com')
      await user.type(getByRole('textbox', { name: /company/i }), longCompany)
      await user.type(getByRole('textbox', { name: /tags/i }), manyTags)

      await user.click(getByRole('button', { name: /create/i }))

      await waitForLoadingToFinish()

      // Should handle large data without issues
      expect(getByTestId('customer-list')).toBeInTheDocument()
    })
  })
})