/**
 * Mock data generators for authentication
 */

import { faker } from '@faker-js/faker'

export interface MockUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  avatar?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  emailVerified: boolean
  twoFactorEnabled: boolean
}

export interface MockTenant {
  id: string
  name: string
  domain: string
  plan: 'starter' | 'premium' | 'enterprise'
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export function generateMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(['admin', 'manager', 'viewer']),
    status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
    avatar: faker.image.avatar(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    lastLoginAt: faker.date.recent().toISOString(),
    emailVerified: faker.datatype.boolean(),
    twoFactorEnabled: faker.datatype.boolean(),
    ...overrides,
  }
}

export function generateMockTenant(overrides: Partial<MockTenant> = {}): MockTenant {
  const companyName = faker.company.name()
  const domain = `${companyName.toLowerCase().replace(/\s+/g, '')}.com`

  return {
    id: faker.string.uuid(),
    name: companyName,
    domain,
    plan: faker.helpers.arrayElement(['starter', 'premium', 'enterprise']),
    status: faker.helpers.arrayElement(['active', 'inactive', 'suspended']),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    isActive: true,
    ...overrides,
  }
}

export function generateMockUsers(count: number): MockUser[] {
  return Array.from({ length: count }, () => generateMockUser())
}

export function generateMockTenants(count: number): MockTenant[] {
  return Array.from({ length: count }, () => generateMockTenant())
}

// Predefined test users for consistent testing
export const testUsers = {
  admin: generateMockUser({
    id: 'admin-user-id',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    twoFactorEnabled: false,
  }),
  manager: generateMockUser({
    id: 'manager-user-id',
    email: 'manager@test.com',
    name: 'Manager User',
    role: 'manager',
    status: 'active',
    emailVerified: true,
    twoFactorEnabled: true,
  }),
  viewer: generateMockUser({
    id: 'viewer-user-id',
    email: 'viewer@test.com',
    name: 'Viewer User',
    role: 'viewer',
    status: 'active',
    emailVerified: true,
    twoFactorEnabled: false,
  }),
  inactive: generateMockUser({
    id: 'inactive-user-id',
    email: 'inactive@test.com',
    name: 'Inactive User',
    role: 'viewer',
    status: 'inactive',
    emailVerified: false,
    twoFactorEnabled: false,
  }),
}

// Predefined test tenants
export const testTenants = {
  active: generateMockTenant({
    id: 'active-tenant-id',
    name: 'Active Test Tenant',
    domain: 'active.test.com',
    plan: 'premium',
    status: 'active',
    isActive: true,
  }),
  inactive: generateMockTenant({
    id: 'inactive-tenant-id',
    name: 'Inactive Test Tenant',
    domain: 'inactive.test.com',
    plan: 'starter',
    status: 'inactive',
    isActive: false,
  }),
  suspended: generateMockTenant({
    id: 'suspended-tenant-id',
    name: 'Suspended Test Tenant',
    domain: 'suspended.test.com',
    plan: 'premium',
    status: 'suspended',
    isActive: false,
  }),
}

// Authentication response helpers
export function mockLoginResponse(user: MockUser = testUsers.admin, tenant: MockTenant = testTenants.active) {
  return {
    user,
    tenant,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
  }
}

export function mockRegisterResponse(userData: Partial<MockUser> = {}) {
  const user = generateMockUser({
    status: 'pending',
    emailVerified: false,
    ...userData,
  })
  
  return {
    user,
    tenant: generateMockTenant(),
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    message: 'Registration successful. Please verify your email.',
  }
}

export function mockTokenRefreshResponse() {
  return {
    accessToken: 'new-mock-access-token',
    refreshToken: 'new-mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
  }
}

// OAuth response helpers
export function mockOAuthResponse(provider: 'google' | 'github' = 'google') {
  return {
    user: generateMockUser({
      email: `${provider}user@example.com`,
      emailVerified: true,
    }),
    tenant: generateMockTenant(),
    accessToken: `mock-${provider}-access-token`,
    refreshToken: `mock-${provider}-refresh-token`,
    provider,
  }
}

// Password reset helpers
export function mockPasswordResetRequest() {
  return {
    message: 'Password reset email sent successfully',
    resetToken: 'mock-reset-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
  }
}

export function mockPasswordResetConfirm() {
  return {
    message: 'Password reset successfully',
    user: generateMockUser(),
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }
}

// Error responses
export const authErrors = {
  invalidCredentials: {
    message: 'Invalid email or password',
    code: 'INVALID_CREDENTIALS',
  },
  userNotFound: {
    message: 'User not found',
    code: 'USER_NOT_FOUND',
  },
  emailAlreadyExists: {
    message: 'User with this email already exists',
    code: 'EMAIL_EXISTS',
  },
  tokenExpired: {
    message: 'Token has expired',
    code: 'TOKEN_EXPIRED',
  },
  invalidToken: {
    message: 'Invalid or malformed token',
    code: 'INVALID_TOKEN',
  },
  accountSuspended: {
    message: 'Account has been suspended',
    code: 'ACCOUNT_SUSPENDED',
  },
  emailNotVerified: {
    message: 'Please verify your email address',
    code: 'EMAIL_NOT_VERIFIED',
  },
  twoFactorRequired: {
    message: 'Two-factor authentication required',
    code: 'TWO_FACTOR_REQUIRED',
  },
}