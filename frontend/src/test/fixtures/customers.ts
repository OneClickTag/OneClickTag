/**
 * Mock data generators for customers
 */

import { faker } from '@faker-js/faker'

export interface MockCustomer {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  company?: string
  phone?: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  tags: string[]
  notes?: string
  customFields: Record<string, any>
  googleAccountId?: string
  googleEmail?: string
  googleAdsAccounts?: MockGoogleAdsAccount[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  tenantId: string
}

export interface MockGoogleAdsAccount {
  id: string
  customerId: string
  accountId: string
  name: string
  currency: string
  timeZone: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  lastSync?: string
  syncStatus?: 'synced' | 'pending' | 'error'
}

export function generateMockCustomer(overrides: Partial<MockCustomer> = {}): MockCustomer {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const fullName = `${firstName} ${lastName}`
  const company = faker.datatype.boolean() ? faker.company.name() : undefined

  return {
    id: faker.string.uuid(),
    email: faker.internet.email({ firstName, lastName }),
    firstName,
    lastName,
    fullName,
    company,
    phone: faker.datatype.boolean() ? faker.phone.number() : undefined,
    status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    tags: faker.helpers.arrayElements([
      'vip', 'enterprise', 'small-business', 'premium', 'trial',
      'high-value', 'new-customer', 'returning', 'at-risk'
    ], { min: 0, max: 3 }),
    notes: faker.datatype.boolean() ? faker.lorem.paragraph() : undefined,
    customFields: generateCustomFields(),
    googleAccountId: faker.datatype.boolean() ? faker.string.alphanumeric(10) : undefined,
    googleEmail: faker.datatype.boolean() ? faker.internet.email() : undefined,
    googleAdsAccounts: faker.datatype.boolean() ? generateMockGoogleAdsAccounts(faker.number.int({ min: 1, max: 3 })) : [],
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    createdBy: faker.datatype.boolean() ? faker.string.uuid() : undefined,
    updatedBy: faker.datatype.boolean() ? faker.string.uuid() : undefined,
    tenantId: faker.string.uuid(),
    ...overrides,
  }
}

export function generateMockGoogleAdsAccount(overrides: Partial<MockGoogleAdsAccount> = {}): MockGoogleAdsAccount {
  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    accountId: faker.string.numeric(10),
    name: faker.company.name() + ' Ads Account',
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
    timeZone: faker.helpers.arrayElement([
      'America/New_York', 'America/Los_Angeles', 'Europe/London', 
      'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'
    ]),
    status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    lastSync: faker.datatype.boolean() ? faker.date.recent().toISOString() : undefined,
    syncStatus: faker.helpers.arrayElement(['synced', 'pending', 'error']),
    ...overrides,
  }
}

export function generateMockGoogleAdsAccounts(count: number): MockGoogleAdsAccount[] {
  return Array.from({ length: count }, () => generateMockGoogleAdsAccount())
}

function generateCustomFields(): Record<string, any> {
  const fields: Record<string, any> = {}
  
  // Randomly add some common custom fields
  if (faker.datatype.boolean()) fields.department = faker.commerce.department()
  if (faker.datatype.boolean()) fields.industry = faker.helpers.arrayElement([
    'Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing'
  ])
  if (faker.datatype.boolean()) fields.companySize = faker.helpers.arrayElement([
    '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  ])
  if (faker.datatype.boolean()) fields.leadScore = faker.number.int({ min: 1, max: 100 })
  if (faker.datatype.boolean()) fields.source = faker.helpers.arrayElement([
    'Website', 'Social Media', 'Referral', 'Advertisement', 'Trade Show'
  ])
  if (faker.datatype.boolean()) fields.annualRevenue = faker.number.int({ min: 10000, max: 10000000 })
  if (faker.datatype.boolean()) fields.lastContactDate = faker.date.recent().toISOString()
  if (faker.datatype.boolean()) fields.preferredContactMethod = faker.helpers.arrayElement([
    'email', 'phone', 'text', 'mail'
  ])
  
  return fields
}

export function generateMockCustomers(count: number): MockCustomer[] {
  return Array.from({ length: count }, () => generateMockCustomer())
}

// Predefined test customers for consistent testing
export const testCustomers = {
  active: generateMockCustomer({
    id: 'active-customer-id',
    email: 'active@customer.com',
    firstName: 'Active',
    lastName: 'Customer',
    fullName: 'Active Customer',
    status: 'ACTIVE',
    company: 'Active Corp',
    tags: ['vip', 'premium'],
  }),
  inactive: generateMockCustomer({
    id: 'inactive-customer-id',
    email: 'inactive@customer.com',
    firstName: 'Inactive',
    lastName: 'Customer',
    fullName: 'Inactive Customer',
    status: 'INACTIVE',
    company: 'Inactive Corp',
    tags: ['trial-ended'],
  }),
  withGoogleAds: generateMockCustomer({
    id: 'google-customer-id',
    email: 'google@customer.com',
    firstName: 'Google',
    lastName: 'Customer',
    fullName: 'Google Customer',
    status: 'ACTIVE',
    googleAccountId: 'google-123456',
    googleEmail: 'google@customer.com',
    googleAdsAccounts: [
      generateMockGoogleAdsAccount({
        accountId: '123-456-7890',
        name: 'Main Ads Account',
        status: 'ACTIVE',
        syncStatus: 'synced',
      })
    ],
    tags: ['google-ads', 'enterprise'],
  }),
  suspended: generateMockCustomer({
    id: 'suspended-customer-id',
    email: 'suspended@customer.com',
    firstName: 'Suspended',
    lastName: 'Customer',
    fullName: 'Suspended Customer',
    status: 'SUSPENDED',
    tags: ['payment-failed'],
  }),
}

// Customer analytics mock data
export interface MockCustomerAnalytics {
  customerId: string
  campaigns: number
  conversions: number
  revenue: number
  clickThroughRate: string
  conversionRate: string
  avgOrderValue: string
  lastActivity: string
  performanceData: {
    date: string
    impressions: number
    clicks: number
    conversions: number
    revenue: number
  }[]
}

export function generateMockCustomerAnalytics(customerId: string, days: number = 30): MockCustomerAnalytics {
  return {
    customerId,
    campaigns: faker.number.int({ min: 1, max: 20 }),
    conversions: faker.number.int({ min: 10, max: 1000 }),
    revenue: faker.number.int({ min: 1000, max: 100000 }),
    clickThroughRate: (faker.number.float({ min: 1, max: 10 })).toFixed(2),
    conversionRate: (faker.number.float({ min: 0.5, max: 15 })).toFixed(2),
    avgOrderValue: (faker.number.float({ min: 50, max: 500 })).toFixed(2),
    lastActivity: faker.date.recent().toISOString(),
    performanceData: Array.from({ length: days }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - index - 1))

      return {
        date: date.toISOString().split('T')[0],
        impressions: faker.number.int({ min: 100, max: 5000 }),
        clicks: faker.number.int({ min: 10, max: 500 }),
        conversions: faker.number.int({ min: 1, max: 50 }),
        revenue: faker.number.int({ min: 50, max: 5000 }),
      }
    }),
  }
}

// Customer bulk operation results
export interface MockBulkOperationResult {
  success: boolean
  customerId: string
  result?: MockCustomer
  error?: string
}

export function generateMockBulkOperationResults(
  operations: Array<{ success?: boolean; customerId?: string }>,
): MockBulkOperationResult[] {
  return operations.map(op => {
    const success = op.success ?? faker.datatype.boolean({ probability: 0.8 })
    const customerId = op.customerId ?? faker.string.uuid()

    if (success) {
      return {
        success: true,
        customerId,
        result: generateMockCustomer({ id: customerId }),
      }
    } else {
      return {
        success: false,
        customerId,
        error: faker.helpers.arrayElement([
          'Email already exists',
          'Invalid data format',
          'Missing required fields',
          'Validation failed',
          'Database error',
        ]),
      }
    }
  })
}

// Customer statistics
export interface MockCustomerStats {
  total: number
  byStatus: {
    active: number
    inactive: number
    suspended: number
  }
  withGoogleAccount: number
  withoutGoogleAccount: number
  recentlyCreated: number
  lastUpdated: string
}

export function generateMockCustomerStats(customers: MockCustomer[] = []): MockCustomerStats {
  const total = customers.length || faker.number.int({ min: 50, max: 500 })
  const active = customers.filter(c => c.status === 'ACTIVE').length || 
    faker.number.int({ min: Math.floor(total * 0.6), max: Math.floor(total * 0.8) })
  const inactive = customers.filter(c => c.status === 'INACTIVE').length || 
    faker.number.int({ min: Math.floor(total * 0.1), max: Math.floor(total * 0.3) })
  const suspended = total - active - inactive
  const withGoogle = customers.filter(c => c.googleAccountId).length || 
    faker.number.int({ min: Math.floor(total * 0.2), max: Math.floor(total * 0.4) })

  return {
    total,
    byStatus: {
      active,
      inactive,
      suspended,
    },
    withGoogleAccount: withGoogle,
    withoutGoogleAccount: total - withGoogle,
    recentlyCreated: faker.number.int({ min: 5, max: 50 }),
    lastUpdated: new Date().toISOString(),
  }
}

// Error responses for customer operations
export const customerErrors = {
  notFound: {
    message: 'Customer not found',
    code: 'CUSTOMER_NOT_FOUND',
  },
  emailExists: {
    message: 'Customer with this email already exists',
    code: 'EMAIL_EXISTS',
  },
  invalidData: {
    message: 'Invalid customer data',
    code: 'INVALID_DATA',
    errors: {
      email: 'Invalid email format',
      firstName: 'First name is required',
      lastName: 'Last name is required',
    },
  },
  bulkOperationFailed: {
    message: 'Bulk operation completed with errors',
    code: 'BULK_OPERATION_PARTIAL_FAILURE',
  },
  syncError: {
    message: 'Failed to sync with Google Ads',
    code: 'GOOGLE_SYNC_ERROR',
  },
}