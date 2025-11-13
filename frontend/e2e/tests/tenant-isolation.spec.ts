import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { CustomersPage } from '../pages/customers.page';
import { CampaignsPage } from '../pages/campaigns.page';
import { DashboardPage } from '../pages/dashboard.page';
import { E2EHelpers, E2EAssertions } from '../utils/helpers';
import { E2ETestData } from '../utils/test-data';

test.describe('Multi-Tenant Data Isolation', () => {
  let loginPage: LoginPage;
  let customersPage: CustomersPage;
  let campaignsPage: CampaignsPage;
  let dashboardPage: DashboardPage;
  let helpers: E2EHelpers;
  let assertions: E2EAssertions;
  let testData: E2ETestData;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    customersPage = new CustomersPage(page);
    campaignsPage = new CampaignsPage(page);
    dashboardPage = new DashboardPage(page);
    helpers = new E2EHelpers(page);
    assertions = new E2EAssertions(page);
    testData = new E2ETestData();
  });

  test('should isolate customer data between tenants', async ({ page, context }) => {
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await customersPage.goto();
    
    // Should see tenant 1 customers only
    expect(await customersPage.hasCustomer('Acme Corporation')).toBe(true);
    expect(await customersPage.hasCustomer('Beta Industries')).toBe(true);
    expect(await customersPage.hasCustomer('Gamma Solutions')).toBe(false); // Tenant 2 customer
    
    const tenant1CustomerCount = await customersPage.getCustomerCount();
    
    // Create a new page/context for tenant 2
    const tenant2Page = await context.newPage();
    const tenant2LoginPage = new LoginPage(tenant2Page);
    const tenant2CustomersPage = new CustomersPage(tenant2Page);
    const tenant2Helpers = new E2EHelpers(tenant2Page);
    
    // Login as tenant 2 user
    await tenant2Helpers.clearStorage();
    await tenant2LoginPage.goto();
    await tenant2LoginPage.login('tenant2@oneclicktag.com', 'TenantPassword123!');
    await tenant2CustomersPage.goto();
    
    // Should see tenant 2 customers only
    expect(await tenant2CustomersPage.hasCustomer('Gamma Solutions')).toBe(true);
    expect(await tenant2CustomersPage.hasCustomer('Acme Corporation')).toBe(false); // Tenant 1 customer
    expect(await tenant2CustomersPage.hasCustomer('Beta Industries')).toBe(false); // Tenant 1 customer
    
    const tenant2CustomerCount = await tenant2CustomersPage.getCustomerCount();
    
    // Customer counts should be different
    expect(tenant1CustomerCount).not.toBe(tenant2CustomerCount);
    
    await tenant2Page.close();
  });

  test('should isolate campaign data between tenants', async ({ page, context }) => {
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await campaignsPage.goto();
    
    // Should see tenant 1 campaigns only
    expect(await campaignsPage.hasCampaign('Q1 Marketing Campaign')).toBe(true);
    expect(await campaignsPage.hasCampaign('Product Launch Campaign')).toBe(true);
    
    const tenant1CampaignCount = await campaignsPage.getCampaignCount();
    
    // Create tenant 2 context
    const tenant2Page = await context.newPage();
    const tenant2LoginPage = new LoginPage(tenant2Page);
    const tenant2CampaignsPage = new CampaignsPage(tenant2Page);
    const tenant2Helpers = new E2EHelpers(tenant2Page);
    
    // Login as tenant 2 user
    await tenant2Helpers.clearStorage();
    await tenant2LoginPage.goto();
    await tenant2LoginPage.login('tenant2@oneclicktag.com', 'TenantPassword123!');
    await tenant2CampaignsPage.goto();
    
    // Should not see tenant 1 campaigns
    expect(await tenant2CampaignsPage.hasCampaign('Q1 Marketing Campaign')).toBe(false);
    expect(await tenant2CampaignsPage.hasCampaign('Product Launch Campaign')).toBe(false);
    
    const tenant2CampaignCount = await tenant2CampaignsPage.getCampaignCount();
    
    // Campaign counts should be different
    expect(tenant1CampaignCount).not.toBe(tenant2CampaignCount);
    
    await tenant2Page.close();
  });

  test('should prevent cross-tenant data access via API manipulation', async ({ page }) => {
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    
    // Try to access tenant 2 customer via direct API call
    const response = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/customers/tenant2-customer-1', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        return { status: response.status, data: await response.json() };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    // Should return 404 or 403 (not found/forbidden)
    expect([403, 404]).toContain(response.status);
  });

  test('should prevent tenant switching via token manipulation', async ({ page }) => {
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await customersPage.goto();
    
    // Verify initial state
    expect(await customersPage.hasCustomer('Acme Corporation')).toBe(true);
    
    // Try to manipulate tenant ID in local storage/token
    await page.evaluate(() => {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Try to modify the token payload (this should fail due to signing)
        const parts = token.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            payload.tenantId = 'tenant-2';
            const modifiedPayload = btoa(JSON.stringify(payload));
            const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;
            localStorage.setItem('access_token', modifiedToken);
          } catch (e) {
            // Expected to fail
          }
        }
      }
    });
    
    // Refresh page to use potentially modified token
    await page.reload();
    
    // Should either redirect to login (invalid token) or still show tenant 1 data
    const isOnLogin = await loginPage.isOnLoginPage();
    if (!isOnLogin) {
      // If still authenticated, should still show tenant 1 data only
      await customersPage.goto();
      expect(await customersPage.hasCustomer('Acme Corporation')).toBe(true);
      expect(await customersPage.hasCustomer('Gamma Solutions')).toBe(false);
    }
  });

  test('should isolate analytics data between tenants', async ({ page, context }) => {
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await dashboardPage.goto();
    await dashboardPage.navigateToAnalytics();
    
    // Get analytics data for tenant 1
    const tenant1Analytics = await page.locator('[data-testid="analytics-summary"]').textContent();
    
    // Create tenant 2 context
    const tenant2Page = await context.newPage();
    const tenant2LoginPage = new LoginPage(tenant2Page);
    const tenant2DashboardPage = new DashboardPage(tenant2Page);
    const tenant2Helpers = new E2EHelpers(tenant2Page);
    
    // Login as tenant 2 user
    await tenant2Helpers.clearStorage();
    await tenant2LoginPage.goto();
    await tenant2LoginPage.login('tenant2@oneclicktag.com', 'TenantPassword123!');
    await tenant2DashboardPage.goto();
    await tenant2DashboardPage.navigateToAnalytics();
    
    // Get analytics data for tenant 2
    const tenant2Analytics = await tenant2Page.locator('[data-testid="analytics-summary"]').textContent();
    
    // Analytics should be different between tenants
    expect(tenant1Analytics).not.toBe(tenant2Analytics);
    
    await tenant2Page.close();
  });

  test('should maintain tenant context in all API requests', async ({ page }) => {
    const apiCalls: { url: string; tenantId: string }[] = [];
    
    // Monitor API requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        const authHeader = request.headers()['authorization'];
        if (authHeader) {
          try {
            // Extract tenant from JWT token
            const token = authHeader.replace('Bearer ', '');
            const payload = JSON.parse(atob(token.split('.')[1]));
            apiCalls.push({
              url: request.url(),
              tenantId: payload.tenantId
            });
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    });
    
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    
    // Navigate through various pages to trigger API calls
    await customersPage.goto();
    await campaignsPage.goto();
    await dashboardPage.goto();
    await dashboardPage.navigateToAnalytics();
    
    // Wait for API calls to complete
    await helpers.wait(2000);
    
    // Verify all API calls have correct tenant ID
    for (const apiCall of apiCalls) {
      expect(apiCall.tenantId).toBe('tenant-1');
    }
    
    expect(apiCalls.length).toBeGreaterThan(0);
  });

  test('should prevent data leakage in search results', async ({ page }) => {
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await customersPage.goto();
    
    // Search for tenant 2 customer data
    await customersPage.searchCustomers('Gamma Solutions');
    
    // Should not return results from other tenant
    expect(await customersPage.hasCustomer('Gamma Solutions')).toBe(false);
    
    const searchResults = await customersPage.getCustomerCount();
    expect(searchResults).toBe(0);
  });

  test('should prevent data leakage in bulk operations', async ({ page }) => {
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await customersPage.goto();
    
    // Try bulk operation with tenant 2 customer IDs via API
    const bulkResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/customers/bulk-update', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customerIds: ['customer-1', 'tenant2-customer-1'], // Mix of tenant 1 and 2
            updates: { status: 'inactive' }
          })
        });
        return { status: response.status, data: await response.json() };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    // Should either reject the request or only process tenant 1 customers
    if (bulkResult.status === 200) {
      expect(bulkResult.data.processed).toBe(1); // Only tenant 1 customer processed
      expect(bulkResult.data.failed).toBe(1); // Tenant 2 customer rejected
    } else {
      expect(bulkResult.status).toBe(403); // Forbidden
    }
  });

  test('should isolate user management between tenants', async ({ page, context }) => {
    // Login as tenant 1 admin
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await dashboardPage.goto();
    await dashboardPage.navigateToSettings();
    await page.click('[data-testid="users-tab"]');
    
    // Should see tenant 1 users only
    const tenant1Users = await page.locator('[data-testid="user-row"]').count();
    
    // Create tenant 2 context
    const tenant2Page = await context.newPage();
    const tenant2LoginPage = new LoginPage(tenant2Page);
    const tenant2DashboardPage = new DashboardPage(tenant2Page);
    const tenant2Helpers = new E2EHelpers(tenant2Page);
    
    // Login as tenant 2 admin
    await tenant2Helpers.clearStorage();
    await tenant2LoginPage.goto();
    await tenant2LoginPage.login('tenant2@oneclicktag.com', 'TenantPassword123!');
    await tenant2DashboardPage.goto();
    await tenant2DashboardPage.navigateToSettings();
    await tenant2Page.click('[data-testid="users-tab"]');
    
    // Should see tenant 2 users only
    const tenant2Users = await tenant2Page.locator('[data-testid="user-row"]').count();
    
    // User counts should be different and isolated
    expect(tenant1Users).not.toBe(tenant2Users);
    
    await tenant2Page.close();
  });

  test('should enforce tenant-specific permissions', async ({ page }) => {
    // Login as tenant 1 viewer (limited permissions)
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('viewer@oneclicktag.com', 'ViewerPassword123!');
    await customersPage.goto();
    
    // Should see data but not have edit permissions
    expect(await customersPage.hasCustomer('Acme Corporation')).toBe(true);
    expect(await helpers.elementExists('[data-testid="add-customer-button"]')).toBe(false);
    expect(await helpers.elementExists('[data-testid="edit-button"]')).toBe(false);
    expect(await helpers.elementExists('[data-testid="delete-button"]')).toBe(false);
  });

  test('should handle tenant context in WebSocket connections', async ({ page }) => {
    const wsMessages: any[] = [];
    
    // Monitor WebSocket messages
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const message = JSON.parse(event.payload.toString());
          wsMessages.push(message);
        } catch (e) {
          // Ignore non-JSON messages
        }
      });
    });
    
    // Login as tenant 1 user
    await helpers.clearStorage();
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await dashboardPage.goto();
    
    // Wait for WebSocket connection and messages
    await helpers.wait(3000);
    
    // Verify WebSocket messages are tenant-specific
    const tenantMessages = wsMessages.filter(msg => msg.tenantId === 'tenant-1');
    expect(tenantMessages.length).toBeGreaterThan(0);
    
    // Should not receive messages for other tenants
    const otherTenantMessages = wsMessages.filter(msg => 
      msg.tenantId && msg.tenantId !== 'tenant-1'
    );
    expect(otherTenantMessages.length).toBe(0);
  });
});