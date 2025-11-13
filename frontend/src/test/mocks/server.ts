/**
 * MSW server for API mocking in tests
 */

import { setupServer } from 'msw/node'
import { authHandlers } from './handlers/auth'
import { customerHandlers } from './handlers/customers'
import { campaignHandlers } from './handlers/campaigns'
import { analyticsHandlers } from './handlers/analytics'
import { tenantHandlers } from './handlers/tenants'
import { errorHandlers } from './handlers/errors'

// Combine all request handlers
export const handlers = [
  ...authHandlers,
  ...customerHandlers,
  ...campaignHandlers,
  ...analyticsHandlers,
  ...tenantHandlers,
  ...errorHandlers,
]

// Setup requests interception using the given handlers
export const server = setupServer(...handlers)