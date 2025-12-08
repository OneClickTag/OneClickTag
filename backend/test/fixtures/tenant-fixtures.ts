/**
 * Test fixtures for multi-tenant scenarios
 */

import { PrismaClient } from '@prisma/client';
import { random } from '../utils/test-helpers';
import { CustomerStatus } from '../../src/modules/customer/dto';
import { customAlphabet } from 'nanoid';

const generateSlug = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

export interface TenantFixtureData {
  tenant: any;
  users: any[];
  customers: any[];
  campaigns: any[];
  conversionActions: any[];
}

export class TenantFixtures {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a basic tenant with minimal data
   */
  async createBasicTenant(overrides: any = {}): Promise<TenantFixtureData> {
    const tenant = await this.prisma.tenant.create({
      data: {
        id: random.uuid(),
        name: 'Basic Test Tenant',
        domain: 'basic.test.com',
        plan: 'starter',
        status: CustomerStatus.ACTIVE,
        settings: {
          features: ['basic_tracking'],
          limits: {
            customers: 100,
            campaigns: 10,
          },
        },
        ...overrides,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        id: random.uuid(),
        email: `admin@${tenant.domain}`,
        name: 'Basic Admin',
        tenantId: tenant.id,
        firebaseId: random.string(),
      },
    });

    const customer = await this.prisma.customer.create({
      data: {
        id: random.uuid(),
        slug: generateSlug(),
        firstName: 'Basic',
        lastName: 'Customer',
        fullName: 'Basic Customer',
        email: 'customer@basic.test.com',
        company: 'Basic Company',
        status: CustomerStatus.ACTIVE,
        tenantId: tenant.id,
        tags: ['basic'],
      },
    });

    const campaign = await this.prisma.campaign.create({
      data: {
        id: random.uuid(),
        name: 'Basic Campaign',
        customerId: customer.id,
        tenantId: tenant.id,
        type: 'SEARCH',
        status: 'ENABLED',
        budget: '10000000',
      },
    });

    return {
      tenant,
      users: [user],
      customers: [customer],
      campaigns: [campaign],
      conversionActions: [],
    };
  }

  /**
   * Create a premium tenant with full features
   */
  async createPremiumTenant(overrides: any = {}): Promise<TenantFixtureData> {
    const tenant = await this.prisma.tenant.create({
      data: {
        id: random.uuid(),
        name: 'Premium Test Tenant',
        domain: 'premium.test.com',
        plan: 'premium',
        status: CustomerStatus.ACTIVE,
        settings: {
          features: [
            'advanced_tracking',
            'google_ads_integration',
            'real_time_sync',
            'custom_events',
            'bulk_operations',
          ],
          limits: {
            customers: 10000,
            campaigns: 1000,
            apiCalls: 100000,
          },
          integrations: {
            google: {
              clientId: 'premium-google-client-id',
              enabled: true,
            },
            firebase: {
              projectId: 'premium-firebase-project',
              enabled: true,
            },
          },
        },
        ...overrides,
      },
    });

    // Create multiple users with different roles
    const users = await Promise.all([
      this.prisma.user.create({
        data: {
          id: random.uuid(),
          email: `admin@${tenant.domain}`,
          name: 'Premium Admin',
            tenantId: tenant.id,
          firebaseId: random.string(),
        },
      }),
      this.prisma.user.create({
        data: {
          id: random.uuid(),
          email: `manager@${tenant.domain}`,
          name: 'Premium Manager',
            tenantId: tenant.id,
          firebaseId: random.string(),
        },
      }),
      this.prisma.user.create({
        data: {
          id: random.uuid(),
          email: `viewer@${tenant.domain}`,
          name: 'Premium Viewer',
            tenantId: tenant.id,
          firebaseId: random.string(),
        },
      }),
    ]);

    // Create multiple customers
    const customers = await Promise.all([
      this.prisma.customer.create({
        data: {
          id: random.uuid(),
          slug: generateSlug(),
          firstName: 'Enterprise',
          lastName: 'Customer',
          fullName: 'Enterprise Customer',
          email: 'enterprise@premium.test.com',
          company: 'Enterprise Corp',
          status: CustomerStatus.ACTIVE,
          tenantId: tenant.id,
          tags: ['enterprise', 'vip'],
        },
      }),
      this.prisma.customer.create({
        data: {
          id: random.uuid(),
          slug: generateSlug(),
          firstName: 'Mid-Market',
          lastName: 'Customer',
          fullName: 'Mid-Market Customer',
          email: 'midmarket@premium.test.com',
          company: 'Mid Corp',
          status: CustomerStatus.ACTIVE,
          tenantId: tenant.id,
          tags: ['midmarket'],
        },
      }),
      this.prisma.customer.create({
        data: {
          id: random.uuid(),
          slug: generateSlug(),
          firstName: 'Small Business',
          lastName: 'Customer',
          fullName: 'Small Business Customer',
          email: 'small@premium.test.com',
          company: 'Small LLC',
          status: CustomerStatus.ACTIVE,
          tenantId: tenant.id,
          tags: ['small-business'],
        },
      }),
    ]);

    // Create campaigns for each customer
    const campaigns = [];
    for (const customer of customers) {
      const customerCampaigns = await Promise.all([
        this.prisma.campaign.create({
          data: {
            id: random.uuid(),
            name: `${customer.firstName} ${customer.lastName} - Page View Campaign`,
            customerId: customer.id,
            tenantId: tenant.id,
            type: 'SEARCH',
            status: 'ENABLED',
            budget: '10000000',
          },
        }),
        this.prisma.campaign.create({
          data: {
            id: random.uuid(),
            name: `${customer.firstName} ${customer.lastName} - Purchase Campaign`,
            customerId: customer.id,
            tenantId: tenant.id,
            type: 'DISPLAY',
            status: 'ENABLED',
            budget: '5000000',
          },
        }),
      ]);
      campaigns.push(...customerCampaigns);
    }

    // Create conversion actions
    const conversionActions = await Promise.all(
      customers.map(async (customer) => {
        return this.prisma.conversionAction.create({
          data: {
            id: random.uuid(),
            name: `${customer.firstName} ${customer.lastName} Purchase`,
            customerId: customer.id,
            tenantId: tenant.id,
            type: 'WEBPAGE',
            status: 'ENABLED',
            category: 'PURCHASE',
          },
        });
      })
    );

    return {
      tenant,
      users,
      customers,
      campaigns,
      conversionActions,
    };
  }

  /**
   * Create tenant with suspended status
   */
  async createSuspendedTenant(overrides: any = {}): Promise<TenantFixtureData> {
    const tenant = await this.prisma.tenant.create({
      data: {
        id: random.uuid(),
        name: 'Suspended Test Tenant',
        domain: 'suspended.test.com',
        plan: 'starter',
        status: 'suspended',
        settings: {
          features: [],
          limits: {
            customers: 0,
            campaigns: 0,
          },
          suspensionReason: 'payment_failed',
          suspendedAt: new Date(),
        },
        ...overrides,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        id: random.uuid(),
        email: `admin@${tenant.domain}`,
        name: 'Suspended Admin',
        tenantId: tenant.id,
        firebaseId: random.string(),
      },
    });

    return {
      tenant,
      users: [user],
      customers: [],
      campaigns: [],
      conversionActions: [],
    };
  }

  /**
   * Create multiple tenants for isolation testing
   */
  async createMultipleTenants(count: number = 3): Promise<TenantFixtureData[]> {
    const fixtures = [];
    
    for (let i = 0; i < count; i++) {
      const fixture = await this.createPremiumTenant({
        name: `Test Tenant ${i + 1}`,
        domain: `tenant${i + 1}.test.com`,
      });
      fixtures.push(fixture);
    }
    
    return fixtures;
  }

  /**
   * Create tenant with specific Google integration settings
   */
  async createTenantWithGoogleIntegration(
    googleSettings: any = {},
    overrides: any = {}
  ): Promise<TenantFixtureData> {
    const tenant = await this.prisma.tenant.create({
      data: {
        id: random.uuid(),
        name: 'Google Integration Tenant',
        domain: 'google.test.com',
        plan: 'premium',
        status: CustomerStatus.ACTIVE,
        settings: {
          features: ['google_ads_integration'],
          integrations: {
            google: {
              clientId: 'test-google-client-id',
              clientSecret: 'test-google-client-secret',
              refreshToken: 'test-refresh-token',
              enabled: true,
              ...googleSettings,
            },
          },
        },
        ...overrides,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        id: random.uuid(),
        email: `admin@${tenant.domain}`,
        name: 'Google Admin',
        tenantId: tenant.id,
        firebaseId: random.string(),
      },
    });

    const customer = await this.prisma.customer.create({
      data: {
        id: random.uuid(),
        slug: generateSlug(),
        firstName: 'Google',
        lastName: 'Customer',
        fullName: 'Google Customer',
        email: 'customer@google.test.com',
        company: 'Google Corp',
        status: CustomerStatus.ACTIVE,
        tenantId: tenant.id,
        tags: ['google-ads'],
      },
    });

    return {
      tenant,
      users: [user],
      customers: [customer],
      campaigns: [],
      conversionActions: [],
    };
  }

  /**
   * Clean up all fixture data
   */
  async cleanup(): Promise<void> {
    await this.prisma.conversionAction.deleteMany();
    await this.prisma.campaign.deleteMany();
    await this.prisma.customer.deleteMany();
    await this.prisma.user.deleteMany();
    await this.prisma.tenant.deleteMany();
  }

  /**
   * Create test data for tenant isolation testing
   */
  async createTenantIsolationTestData(): Promise<{
    tenant1: TenantFixtureData;
    tenant2: TenantFixtureData;
    sharedData: any;
  }> {
    const tenant1 = await this.createPremiumTenant({
      name: 'Tenant 1',
      domain: 'tenant1.test.com',
    });

    const tenant2 = await this.createPremiumTenant({
      name: 'Tenant 2',
      domain: 'tenant2.test.com',
    });

    // Create some shared reference data that shouldn't be tenant-specific
    const sharedData = {
      publicSettings: {
        appVersion: '1.0.0',
        maintenanceMode: false,
      },
    };

    return {
      tenant1,
      tenant2,
      sharedData,
    };
  }
}