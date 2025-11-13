/**
 * MSW handlers for authentication endpoints
 */

import { http, HttpResponse } from 'msw'
import { generateMockUser, generateMockTenant } from '../../fixtures/auth'

export const authHandlers = [
  // Login
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as any
    const { email, password } = body

    // Mock successful login
    if (email === 'test@example.com' && password === 'password123') {
      const user = generateMockUser({ email })
      const tenant = generateMockTenant()
      
      return HttpResponse.json({
        user,
        tenant,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      })
    }

    // Mock failed login
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  // Register
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as any
    const { email, password, name } = body

    // Mock successful registration
    if (email && password && name) {
      const user = generateMockUser({ email, name })
      const tenant = generateMockTenant()

      return HttpResponse.json({
        user,
        tenant,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }, { status: 201 })
    }

    // Mock validation errors
    return HttpResponse.json(
      { 
        message: 'Validation failed',
        errors: {
          email: email ? undefined : 'Email is required',
          password: password ? undefined : 'Password is required',
          name: name ? undefined : 'Name is required',
        }
      },
      { status: 400 }
    )
  }),

  // Refresh token
  http.post('/api/auth/refresh', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (authHeader?.includes('mock-refresh-token')) {
      return HttpResponse.json({
        accessToken: 'new-mock-access-token',
        refreshToken: 'new-mock-refresh-token',
      })
    }

    return HttpResponse.json(
      { message: 'Invalid refresh token' },
      { status: 401 }
    )
  }),

  // Logout
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' })
  }),

  // Get current user
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (authHeader?.includes('mock-access-token')) {
      const user = generateMockUser()
      const tenant = generateMockTenant()
      
      return HttpResponse.json({ user, tenant })
    }

    return HttpResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }),

  // Firebase authentication
  http.post('/api/auth/firebase', async ({ request }) => {
    const body = await request.json() as any
    const { idToken, tenantId } = body

    if (idToken === 'valid-firebase-token') {
      const user = generateMockUser()
      const tenant = generateMockTenant({ id: tenantId })

      return HttpResponse.json({
        user,
        tenant,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      })
    }

    return HttpResponse.json(
      { message: 'Invalid Firebase token' },
      { status: 401 }
    )
  }),

  // Password reset
  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await request.json() as any
    const { email } = body

    if (email) {
      return HttpResponse.json({
        message: 'Password reset email sent',
      })
    }

    return HttpResponse.json(
      { message: 'Email is required' },
      { status: 400 }
    )
  }),

  // Reset password
  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = await request.json() as any
    const { token, password } = body

    if (token === 'valid-reset-token' && password) {
      return HttpResponse.json({
        message: 'Password reset successfully',
      })
    }

    return HttpResponse.json(
      { message: 'Invalid reset token or password' },
      { status: 400 }
    )
  }),

  // Verify email
  http.post('/api/auth/verify-email', async ({ request }) => {
    const body = await request.json() as any
    const { token } = body

    if (token === 'valid-verification-token') {
      return HttpResponse.json({
        message: 'Email verified successfully',
      })
    }

    return HttpResponse.json(
      { message: 'Invalid verification token' },
      { status: 400 }
    )
  }),

  // Google OAuth
  http.get('/api/auth/google', () => {
    return HttpResponse.redirect('/api/auth/google/callback?code=mock-auth-code')
  }),

  http.get('/api/auth/google/callback', ({ request }) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    if (code === 'mock-auth-code') {
      const user = generateMockUser({ email: 'google-user@example.com' })
      const tenant = generateMockTenant()

      return HttpResponse.json({
        user,
        tenant,
        accessToken: 'mock-google-access-token',
        refreshToken: 'mock-google-refresh-token',
      })
    }

    return HttpResponse.json(
      { message: 'OAuth callback failed' },
      { status: 400 }
    )
  }),
]