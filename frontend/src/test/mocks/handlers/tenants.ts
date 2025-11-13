/**
 * MSW handlers for tenant endpoints
 */

import { http, HttpResponse } from 'msw'
import { generateMockTenant } from '../../fixtures/auth'

export const tenantHandlers = [
  // Get current tenant
  http.get('/api/tenants/current', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenant = generateMockTenant()
    
    return HttpResponse.json({
      ...tenant,
      users: Math.floor(Math.random() * 50 + 5),
      customers: Math.floor(Math.random() * 200 + 20),
      campaigns: Math.floor(Math.random() * 100 + 10),
      settings: {
        features: ['advanced_tracking', 'google_ads_integration'],
        limits: {
          customers: 1000,
          campaigns: 500,
          users: 50,
        },
        branding: {
          logo: '/api/tenants/current/logo',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
        },
        integrations: {
          googleAds: {
            enabled: true,
            accountId: 'ads-account-123',
          },
          googleAnalytics: {
            enabled: true,
            trackingId: 'GA-123456789',
          },
        },
      },
    })
  }),

  // Update current tenant
  http.put('/api/tenants/current', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as any
    const updatedTenant = {
      ...generateMockTenant(),
      ...body,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(updatedTenant)
  }),

  // Get tenant users
  http.get('/api/tenants/current/users', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    const users = Array.from({ length: Math.min(limit, 20) }, (_, index) => ({
      id: `user-${index + 1}`,
      email: `user${index + 1}@example.com`,
      name: `User ${index + 1}`,
      role: index === 0 ? 'admin' : index < 3 ? 'manager' : 'viewer',
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      lastLoginAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    }))

    return HttpResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total: 45,
        totalPages: Math.ceil(45 / limit),
        hasNext: page * limit < 45,
        hasPrev: page > 1,
      },
    })
  }),

  // Invite user to tenant
  http.post('/api/tenants/current/users/invite', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as any
    const { email, role } = body

    if (!email || !role) {
      return HttpResponse.json(
        { 
          message: 'Validation failed',
          errors: {
            email: email ? undefined : 'Email is required',
            role: role ? undefined : 'Role is required',
          }
        },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      id: `invitation-${Date.now()}`,
      email,
      role,
      status: 'pending',
      invitedBy: 'current-user-id',
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { status: 201 })
  }),

  // Update user role
  http.put('/api/tenants/current/users/:userId', async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params
    const body = await request.json() as any

    return HttpResponse.json({
      id: userId,
      email: `user@example.com`,
      name: 'Updated User',
      role: body.role,
      status: body.status || 'active',
      updatedAt: new Date().toISOString(),
    })
  }),

  // Remove user from tenant
  http.delete('/api/tenants/current/users/:userId', ({ params, request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params

    if (userId === 'current-user-id') {
      return HttpResponse.json(
        { message: 'Cannot remove yourself from tenant' },
        { status: 400 }
      )
    }

    return HttpResponse.json({ message: 'User removed successfully' })
  }),

  // Get tenant settings
  http.get('/api/tenants/current/settings', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      general: {
        name: 'Test Tenant',
        domain: 'test.example.com',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
      },
      features: {
        advancedTracking: true,
        googleAdsIntegration: true,
        realtimeSync: false,
        customEvents: true,
        bulkOperations: true,
      },
      limits: {
        customers: 1000,
        campaigns: 500,
        users: 50,
        apiCalls: 10000,
      },
      integrations: {
        googleAds: {
          enabled: true,
          accountId: 'ads-account-123',
          clientId: 'google-client-id',
        },
        googleAnalytics: {
          enabled: true,
          trackingId: 'GA-123456789',
        },
        firebase: {
          enabled: true,
          projectId: 'firebase-project-123',
        },
      },
      notifications: {
        email: {
          campaignAlerts: true,
          performanceReports: true,
          systemUpdates: false,
        },
        slack: {
          enabled: false,
          webhookUrl: '',
        },
      },
      security: {
        twoFactorRequired: false,
        passwordPolicy: {
          minLength: 8,
          requireSpecialChars: true,
          requireNumbers: true,
        },
        sessionTimeout: 3600,
      },
    })
  }),

  // Update tenant settings
  http.put('/api/tenants/current/settings', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as any

    return HttpResponse.json({
      ...body,
      updatedAt: new Date().toISOString(),
      message: 'Settings updated successfully',
    })
  }),

  // Get tenant billing info
  http.get('/api/tenants/current/billing', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      plan: 'premium',
      status: 'active',
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 299,
      currency: 'USD',
      paymentMethod: {
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
      },
      usage: {
        customers: 150,
        campaigns: 45,
        users: 8,
        apiCalls: 7500,
      },
      limits: {
        customers: 1000,
        campaigns: 500,
        users: 50,
        apiCalls: 10000,
      },
      invoices: Array.from({ length: 12 }, (_, index) => {
        const date = new Date()
        date.setMonth(date.getMonth() - index)
        
        return {
          id: `invoice-${index + 1}`,
          amount: 299,
          status: index === 0 ? 'pending' : 'paid',
          date: date.toISOString(),
          downloadUrl: `/api/tenants/current/billing/invoices/invoice-${index + 1}/download`,
        }
      }),
    })
  }),

  // Get tenant logo
  http.get('/api/tenants/current/logo', () => {
    // Return a mock SVG logo
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#3B82F6"/>
      <text x="50" y="55" text-anchor="middle" fill="white" font-size="20">Logo</text>
    </svg>`

    return new HttpResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    })
  }),

  // Upload tenant logo
  http.post('/api/tenants/current/logo', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.includes('mock-access-token')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      message: 'Logo uploaded successfully',
      logoUrl: '/api/tenants/current/logo',
      uploadedAt: new Date().toISOString(),
    })
  }),
]