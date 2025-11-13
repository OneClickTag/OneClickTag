/**
 * MSW handlers for customer endpoints
 */

import { http, HttpResponse } from 'msw'
import { generateMockCustomer, generateMockCustomers } from '../../fixtures/customers'

// In-memory storage for customers (reset between tests)
let customersStore = generateMockCustomers(20)

export const customerHandlers = [
  // Get all customers with pagination and filtering
  http.get('/api/customers', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const company = url.searchParams.get('company')

    let filteredCustomers = [...customersStore]

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.firstName.toLowerCase().includes(searchLower) ||
        customer.lastName.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.company?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (status) {
      filteredCustomers = filteredCustomers.filter(customer => customer.status === status)
    }

    // Apply company filter
    if (company) {
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.company?.toLowerCase().includes(company.toLowerCase())
      )
    }

    // Pagination
    const total = filteredCustomers.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedCustomers = filteredCustomers.slice(offset, offset + limit)

    return HttpResponse.json({
      data: paginatedCustomers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        search,
        status,
        company,
      },
    })
  }),

  // Get customer by ID
  http.get('/api/customers/:id', ({ params }) => {
    const { id } = params
    const customer = customersStore.find(c => c.id === id)

    if (customer) {
      return HttpResponse.json(customer)
    }

    return HttpResponse.json(
      { message: 'Customer not found' },
      { status: 404 }
    )
  }),

  // Create customer
  http.post('/api/customers', async ({ request }) => {
    const body = await request.json() as any

    // Validate required fields
    if (!body.email || !body.firstName || !body.lastName) {
      return HttpResponse.json(
        { 
          message: 'Validation failed',
          errors: {
            email: body.email ? undefined : 'Email is required',
            firstName: body.firstName ? undefined : 'First name is required',
            lastName: body.lastName ? undefined : 'Last name is required',
          }
        },
        { status: 400 }
      )
    }

    // Check for duplicate email
    if (customersStore.some(c => c.email === body.email)) {
      return HttpResponse.json(
        { message: 'Customer with this email already exists' },
        { status: 409 }
      )
    }

    const newCustomer = generateMockCustomer({
      ...body,
      id: `customer-${Date.now()}`,
      fullName: `${body.firstName} ${body.lastName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    customersStore.push(newCustomer)

    return HttpResponse.json(newCustomer, { status: 201 })
  }),

  // Update customer
  http.put('/api/customers/:id', async ({ params, request }) => {
    const { id } = params
    const body = await request.json() as any
    const customerIndex = customersStore.findIndex(c => c.id === id)

    if (customerIndex === -1) {
      return HttpResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check for email conflict (excluding current customer)
    if (body.email && customersStore.some(c => c.email === body.email && c.id !== id)) {
      return HttpResponse.json(
        { message: 'Customer with this email already exists' },
        { status: 409 }
      )
    }

    // Update customer
    const updatedCustomer = {
      ...customersStore[customerIndex],
      ...body,
      fullName: body.firstName && body.lastName 
        ? `${body.firstName} ${body.lastName}`
        : customersStore[customerIndex].fullName,
      updatedAt: new Date().toISOString(),
    }

    customersStore[customerIndex] = updatedCustomer

    return HttpResponse.json(updatedCustomer)
  }),

  // Delete customer
  http.delete('/api/customers/:id', ({ params }) => {
    const { id } = params
    const customerIndex = customersStore.findIndex(c => c.id === id)

    if (customerIndex === -1) {
      return HttpResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      )
    }

    customersStore.splice(customerIndex, 1)

    return HttpResponse.json({ message: 'Customer deleted successfully' })
  }),

  // Bulk create customers
  http.post('/api/customers/bulk', async ({ request }) => {
    const body = await request.json() as any
    const { customers } = body

    if (!Array.isArray(customers)) {
      return HttpResponse.json(
        { message: 'Customers array is required' },
        { status: 400 }
      )
    }

    const results = customers.map((customerData: any) => {
      try {
        // Validate required fields
        if (!customerData.email || !customerData.firstName || !customerData.lastName) {
          return {
            success: false,
            customerId: customerData.email || 'unknown',
            error: 'Missing required fields',
          }
        }

        // Check for duplicate email
        if (customersStore.some(c => c.email === customerData.email)) {
          return {
            success: false,
            customerId: customerData.email,
            error: 'Email already exists',
          }
        }

        const newCustomer = generateMockCustomer({
          ...customerData,
          id: `customer-${Date.now()}-${Math.random()}`,
          fullName: `${customerData.firstName} ${customerData.lastName}`,
        })

        customersStore.push(newCustomer)

        return {
          success: true,
          customerId: newCustomer.id,
          result: newCustomer,
        }
      } catch (error) {
        return {
          success: false,
          customerId: customerData.email || 'unknown',
          error: 'Failed to create customer',
        }
      }
    })

    return HttpResponse.json(results)
  }),

  // Get customer statistics
  http.get('/api/customers/stats', () => {
    const total = customersStore.length
    const activeCount = customersStore.filter(c => c.status === 'ACTIVE').length
    const inactiveCount = customersStore.filter(c => c.status === 'INACTIVE').length
    const withGoogleAccount = customersStore.filter(c => c.googleAccountId).length
    const recentCount = customersStore.filter(c => {
      const createdAt = new Date(c.createdAt)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return createdAt > thirtyDaysAgo
    }).length

    return HttpResponse.json({
      total,
      byStatus: {
        active: activeCount,
        inactive: inactiveCount,
        suspended: total - activeCount - inactiveCount,
      },
      withGoogleAccount,
      withoutGoogleAccount: total - withGoogleAccount,
      recentlyCreated: recentCount,
      lastUpdated: new Date().toISOString(),
    })
  }),

  // Export customers
  http.get('/api/customers/export', ({ request }) => {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'csv'

    if (format === 'csv') {
      const csvContent = [
        'ID,First Name,Last Name,Email,Company,Status,Created At',
        ...customersStore.map(c => 
          `${c.id},"${c.firstName}","${c.lastName}","${c.email}","${c.company || ''}",${c.status},${c.createdAt}`
        )
      ].join('\n')

      return new HttpResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=customers.csv',
        },
      })
    }

    return HttpResponse.json(customersStore)
  }),

  // Customer analytics
  http.get('/api/customers/:id/analytics', ({ params }) => {
    const { id } = params
    const customer = customersStore.find(c => c.id === id)

    if (!customer) {
      return HttpResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      customerId: id,
      campaigns: Math.floor(Math.random() * 10) + 1,
      conversions: Math.floor(Math.random() * 100) + 10,
      revenue: Math.floor(Math.random() * 10000) + 1000,
      clickThroughRate: (Math.random() * 5 + 1).toFixed(2),
      conversionRate: (Math.random() * 10 + 2).toFixed(2),
      avgOrderValue: (Math.random() * 200 + 50).toFixed(2),
      lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }),

  // Reset customers store for testing
  http.post('/api/test/customers/reset', () => {
    customersStore = generateMockCustomers(20)
    return HttpResponse.json({ message: 'Customers store reset' })
  }),
]