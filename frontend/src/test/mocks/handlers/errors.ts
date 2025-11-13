/**
 * MSW handlers for error simulation and testing
 */

import { http, HttpResponse } from 'msw'

export const errorHandlers = [
  // Simulate network timeout
  http.get('/api/test/timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 30000)) // 30 second timeout
    return HttpResponse.json({ message: 'This will timeout' })
  }),

  // Simulate server error
  http.get('/api/test/server-error', () => {
    return HttpResponse.json(
      { 
        message: 'Internal server error',
        error: 'Something went wrong on the server',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }),

  // Simulate bad request
  http.post('/api/test/bad-request', () => {
    return HttpResponse.json(
      { 
        message: 'Bad request',
        errors: {
          field1: 'This field is required',
          field2: 'Invalid format',
        },
      },
      { status: 400 }
    )
  }),

  // Simulate unauthorized
  http.get('/api/test/unauthorized', () => {
    return HttpResponse.json(
      { message: 'Unauthorized access' },
      { status: 401 }
    )
  }),

  // Simulate forbidden
  http.get('/api/test/forbidden', () => {
    return HttpResponse.json(
      { message: 'Access forbidden' },
      { status: 403 }
    )
  }),

  // Simulate not found
  http.get('/api/test/not-found', () => {
    return HttpResponse.json(
      { message: 'Resource not found' },
      { status: 404 }
    )
  }),

  // Simulate rate limiting
  http.get('/api/test/rate-limit', () => {
    return HttpResponse.json(
      { 
        message: 'Rate limit exceeded',
        retryAfter: 60,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 60000),
        },
      }
    )
  }),

  // Simulate validation error
  http.post('/api/test/validation-error', () => {
    return HttpResponse.json(
      {
        message: 'Validation failed',
        errors: [
          {
            field: 'email',
            message: 'Invalid email format',
            code: 'INVALID_FORMAT',
          },
          {
            field: 'password',
            message: 'Password must be at least 8 characters',
            code: 'MIN_LENGTH',
          },
        ],
      },
      { status: 422 }
    )
  }),

  // Simulate conflict error
  http.post('/api/test/conflict', () => {
    return HttpResponse.json(
      {
        message: 'Resource already exists',
        conflictingField: 'email',
        conflictingValue: 'user@example.com',
      },
      { status: 409 }
    )
  }),

  // Simulate maintenance mode
  http.get('/api/test/maintenance', () => {
    return HttpResponse.json(
      {
        message: 'Service temporarily unavailable',
        maintenanceUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      { status: 503 }
    )
  }),

  // Simulate network error (no response)
  http.get('/api/test/network-error', () => {
    return HttpResponse.error()
  }),

  // Simulate malformed JSON response
  http.get('/api/test/malformed-json', () => {
    return new HttpResponse('{ invalid json response', {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }),

  // Simulate quota exceeded
  http.get('/api/test/quota-exceeded', () => {
    return HttpResponse.json(
      {
        message: 'Quota exceeded',
        quotaType: 'api_calls',
        quotaLimit: 1000,
        quotaUsed: 1000,
        quotaResetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { status: 429 }
    )
  }),

  // Simulate database connection error
  http.get('/api/test/database-error', () => {
    return HttpResponse.json(
      {
        message: 'Database connection failed',
        error: 'Unable to connect to database',
        code: 'DATABASE_ERROR',
        retryable: true,
      },
      { status: 503 }
    )
  }),

  // Simulate partial success (mixed results)
  http.post('/api/test/partial-success', () => {
    return HttpResponse.json({
      message: 'Operation completed with some failures',
      results: [
        { id: '1', status: 'success', data: { name: 'Item 1' } },
        { id: '2', status: 'error', error: 'Validation failed' },
        { id: '3', status: 'success', data: { name: 'Item 3' } },
        { id: '4', status: 'error', error: 'Duplicate entry' },
      ],
      summary: {
        total: 4,
        successful: 2,
        failed: 2,
      },
    })
  }),
]