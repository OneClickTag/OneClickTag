/**
 * MSW server for E2E testing with realistic response delays
 */

import { setupServer } from 'msw/node'
import { delay, http } from 'msw'
import { authHandlers } from './handlers/auth'
import { customerHandlers } from './handlers/customers'
import { campaignHandlers } from './handlers/campaigns'
import { analyticsHandlers } from './handlers/analytics'
import { tenantHandlers } from './handlers/tenants'

// Add realistic delays to handlers for E2E testing
const addDelayToHandlers = (handlers: any[]) => {
  return handlers.map(handler => {
    const originalHandler = handler.resolver
    return {
      ...handler,
      resolver: async (input: any) => {
        // Add random delay between 100-500ms to simulate network latency
        await delay(100 + Math.random() * 400)
        return originalHandler(input)
      }
    }
  })
}

// E2E specific handlers with realistic delays
export const e2eHandlers = [
  ...addDelayToHandlers(authHandlers),
  ...addDelayToHandlers(customerHandlers),
  ...addDelayToHandlers(campaignHandlers),
  ...addDelayToHandlers(analyticsHandlers),
  ...addDelayToHandlers(tenantHandlers),
  
  // Add some E2E specific scenarios
  http.get('/api/health', async () => {
    await delay(50)
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
  }),
  
  http.get('/api/slow-endpoint', async () => {
    await delay(2000) // Simulate slow response
    return Response.json({ message: 'This was slow' })
  }),
]

export const server = setupServer(...e2eHandlers)