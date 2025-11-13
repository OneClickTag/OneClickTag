import { faker } from '@faker-js/faker';
import axios from 'axios';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  tenantId: string;
  role: 'admin' | 'user' | 'viewer';
  firstName: string;
  lastName: string;
}

export interface TestCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  status: 'active' | 'inactive' | 'pending';
  tags: string[];
  tenantId: string;
}

export interface TestCampaign {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  gtmContainerId?: string;
  gtmWorkspaceId?: string;
  tenantId: string;
  customerId: string;
}

export class E2ETestData {
  private baseURL = 'http://localhost:3001/api';
  private adminToken: string | null = null;

  // Test users for different scenarios
  testUsers: TestUser[] = [
    {
      id: 'test-user-1',
      email: 'test@oneclicktag.com',
      password: 'TestPassword123!',
      tenantId: 'tenant-1',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin'
    },
    {
      id: 'tenant2-user-1',
      email: 'tenant2@oneclicktag.com',
      password: 'TenantPassword123!',
      tenantId: 'tenant-2',
      role: 'admin',
      firstName: 'Tenant',
      lastName: 'Admin'
    },
    {
      id: 'viewer-user-1',
      email: 'viewer@oneclicktag.com',
      password: 'ViewerPassword123!',
      tenantId: 'tenant-1',
      role: 'viewer',
      firstName: 'Test',
      lastName: 'Viewer'
    }
  ];

  // Test customers for different tenants
  testCustomers: TestCustomer[] = [
    {
      id: 'customer-1',
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '+1-555-0123',
      company: 'Acme Corporation',
      website: 'https://acme.com',
      status: 'active',
      tags: ['enterprise', 'priority'],
      tenantId: 'tenant-1'
    },
    {
      id: 'customer-2',
      name: 'Beta Industries',
      email: 'info@beta-industries.com',
      phone: '+1-555-0456',
      company: 'Beta Industries',
      website: 'https://beta-industries.com',
      status: 'active',
      tags: ['startup', 'tech'],
      tenantId: 'tenant-1'
    },
    {
      id: 'tenant2-customer-1',
      name: 'Gamma Solutions',
      email: 'hello@gamma.com',
      company: 'Gamma Solutions',
      status: 'pending',
      tags: ['new'],
      tenantId: 'tenant-2'
    }
  ];

  // Test campaigns
  testCampaigns: TestCampaign[] = [
    {
      id: 'campaign-1',
      name: 'Q1 Marketing Campaign',
      description: 'First quarter marketing push',
      status: 'active',
      gtmContainerId: 'GTM-TEST123',
      gtmWorkspaceId: 'WS-TEST456',
      tenantId: 'tenant-1',
      customerId: 'customer-1'
    },
    {
      id: 'campaign-2',
      name: 'Product Launch Campaign',
      description: 'New product launch tracking',
      status: 'paused',
      tenantId: 'tenant-1',
      customerId: 'customer-2'
    }
  ];

  async setupTestEnvironment(): Promise<void> {
    try {
      // Get admin token for setup
      await this.authenticateAdmin();

      // Create test tenants
      await this.createTestTenants();

      // Create test users
      await this.createTestUsers();

      // Create test customers
      await this.createTestCustomers();

      // Create test campaigns
      await this.createTestCampaigns();

      console.log('✅ Test data created successfully');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  async cleanupTestEnvironment(): Promise<void> {
    try {
      if (!this.adminToken) {
        await this.authenticateAdmin();
      }

      // Cleanup in reverse order
      await this.cleanupTestCampaigns();
      await this.cleanupTestCustomers();
      await this.cleanupTestUsers();
      await this.cleanupTestTenants();

      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Failed to cleanup test environment:', error);
      // Don't throw to avoid breaking test runs
    }
  }

  private async authenticateAdmin(): Promise<void> {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: 'admin@oneclicktag.com',
        password: 'AdminPassword123!'
      });
      this.adminToken = response.data.accessToken;
    } catch (error) {
      console.error('Failed to authenticate admin:', error);
      throw error;
    }
  }

  private async createTestTenants(): Promise<void> {
    const tenants = [
      { id: 'tenant-1', name: 'Test Tenant 1', slug: 'test-tenant-1' },
      { id: 'tenant-2', name: 'Test Tenant 2', slug: 'test-tenant-2' }
    ];

    for (const tenant of tenants) {
      try {
        await axios.post(`${this.baseURL}/tenants`, tenant, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      } catch (error: any) {
        // Ignore if tenant already exists
        if (error.response?.status !== 409) {
          throw error;
        }
      }
    }
  }

  private async createTestUsers(): Promise<void> {
    for (const user of this.testUsers) {
      try {
        await axios.post(`${this.baseURL}/auth/register`, {
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
          role: user.role
        }, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      } catch (error: any) {
        // Ignore if user already exists
        if (error.response?.status !== 409) {
          console.warn(`Failed to create user ${user.email}:`, error.message);
        }
      }
    }
  }

  private async createTestCustomers(): Promise<void> {
    for (const customer of this.testCustomers) {
      try {
        await axios.post(`${this.baseURL}/customers`, customer, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      } catch (error: any) {
        // Ignore if customer already exists
        if (error.response?.status !== 409) {
          console.warn(`Failed to create customer ${customer.name}:`, error.message);
        }
      }
    }
  }

  private async createTestCampaigns(): Promise<void> {
    for (const campaign of this.testCampaigns) {
      try {
        await axios.post(`${this.baseURL}/campaigns`, campaign, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      } catch (error: any) {
        // Ignore if campaign already exists
        if (error.response?.status !== 409) {
          console.warn(`Failed to create campaign ${campaign.name}:`, error.message);
        }
      }
    }
  }

  private async cleanupTestCampaigns(): Promise<void> {
    for (const campaign of this.testCampaigns) {
      try {
        await axios.delete(`${this.baseURL}/campaigns/${campaign.id}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private async cleanupTestCustomers(): Promise<void> {
    for (const customer of this.testCustomers) {
      try {
        await axios.delete(`${this.baseURL}/customers/${customer.id}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private async cleanupTestUsers(): Promise<void> {
    for (const user of this.testUsers) {
      try {
        await axios.delete(`${this.baseURL}/users/${user.id}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private async cleanupTestTenants(): Promise<void> {
    const tenantIds = ['tenant-1', 'tenant-2'];
    for (const tenantId of tenantIds) {
      try {
        await axios.delete(`${this.baseURL}/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  // Utility methods for generating dynamic test data
  generateRandomCustomer(tenantId: string = 'tenant-1'): Omit<TestCustomer, 'id'> {
    const company = faker.company.name();
    return {
      name: company,
      email: faker.internet.email(),
      phone: faker.phone.number(),
      company,
      website: faker.internet.url(),
      status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
      tags: faker.helpers.arrayElements(['enterprise', 'startup', 'tech', 'finance', 'healthcare']),
      tenantId
    };
  }

  generateRandomCampaign(tenantId: string = 'tenant-1', customerId: string): Omit<TestCampaign, 'id'> {
    return {
      name: faker.company.buzzPhrase(),
      description: faker.lorem.sentences(2),
      status: faker.helpers.arrayElement(['active', 'paused', 'completed']),
      gtmContainerId: `GTM-${faker.string.alphanumeric(7).toUpperCase()}`,
      gtmWorkspaceId: `WS-${faker.string.alphanumeric(7).toUpperCase()}`,
      tenantId,
      customerId
    };
  }
}