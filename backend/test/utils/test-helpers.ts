/**
 * Test helper utilities
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Create a mock Prisma service
 */
export function createMockPrismaService(): DeepMockProxy<PrismaClient> {
  return mockDeep<PrismaClient>();
}

/**
 * Create a test module with common mocks
 */
export async function createTestModule(
  providers: any[] = [],
  imports: any[] = [],
  controllers: any[] = []
): Promise<TestingModule> {
  const mockPrismaService = createMockPrismaService();
  const mockJwtService = mockDeep<JwtService>();
  const mockConfigService = mockDeep<ConfigService>();

  return Test.createTestingModule({
    imports,
    controllers,
    providers: [
      ...providers,
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
      {
        provide: JwtService,
        useValue: mockJwtService,
      },
      {
        provide: ConfigService,
        useValue: mockConfigService,
      },
    ],
  }).compile();
}

/**
 * Generate test JWT token
 */
export function generateTestJWT(payload: any = {}, secret: string = 'test-secret'): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      sub: 'test-user-id',
      email: 'test@example.com',
      tenantId: 'test-tenant-id',
      ...payload,
    },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Create test user data
 */
export function createTestUser(overrides: any = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test tenant data
 */
export function createTestTenant(overrides: any = {}) {
  return {
    id: 'test-tenant-id',
    name: 'Test Tenant',
    domain: 'test.example.com',
    plan: 'premium',
    status: 'active',
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test customer data
 */
export function createTestCustomer(overrides: any = {}) {
  return {
    id: 'test-customer-id',
    name: 'Test Customer',
    email: 'customer@example.com',
    company: 'Test Company',
    status: 'active',
    tenantId: 'test-tenant-id',
    tags: ['test'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test campaign data
 */
export function createTestCampaign(overrides: any = {}) {
  return {
    id: 'test-campaign-id',
    name: 'Test Campaign',
    description: 'Test campaign description',
    customerId: 'test-customer-id',
    tenantId: 'test-tenant-id',
    type: 'page_view',
    status: 'active',
    config: {
      triggers: [{ type: 'url', value: 'https://example.com' }],
      actions: [{ type: 'conversion', value: 'purchase' }],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Mock Google APIs
 */
export function mockGoogleApis() {
  return {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' }),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: { access_token: 'new-mock-token' }
        }),
      })),
    },
    ads: {
      GoogleAdsApi: jest.fn().mockImplementation(() => ({
        Customer: jest.fn().mockReturnValue({
          query: jest.fn().mockResolvedValue([]),
          mutate: jest.fn().mockResolvedValue({ results: [] }),
        }),
      })),
    },
    firebase: {
      initializeApp: jest.fn(),
      auth: jest.fn().mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'test-firebase-uid',
          email: 'test@example.com',
        }),
      }),
    },
  };
}

/**
 * Mock Redis client
 */
export function mockRedisClient() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    flushall: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    ready: true,
  };
}

/**
 * Mock Bull queue
 */
export function mockBullQueue() {
  return {
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    clean: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    count: jest.fn(),
  };
}

/**
 * Assert that an error was thrown
 */
export async function expectError(
  fn: () => Promise<any>,
  expectedError?: string | RegExp | jest.Constructable
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else if (expectedError instanceof RegExp) {
        expect(error.message).toMatch(expectedError);
      } else {
        expect(error).toBeInstanceOf(expectedError);
      }
    }
    return error as Error;
  }
}

/**
 * Deep merge objects for test data
 */
export function deepMerge(target: any, source: any): any {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/**
 * Generate random test data
 */
export const random = {
  string: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  email: () => `${random.string()}@example.com`,
  number: (min = 0, max = 1000) => Math.floor(Math.random() * (max - min + 1)) + min,
  boolean: () => Math.random() > 0.5,
  date: () => new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }),
};