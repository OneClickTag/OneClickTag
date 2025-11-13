import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { CustomersPage } from '../pages/customers.page';
import { CampaignsPage } from '../pages/campaigns.page';
import { DashboardPage } from '../pages/dashboard.page';
import { E2EHelpers, E2EAssertions } from '../utils/helpers';
import { E2ETestData } from '../utils/test-data';

test.describe('Error Handling Scenarios', () => {
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

  test.describe('Network Error Scenarios', () => {
    test('should handle complete network failure gracefully', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Simulate complete network failure
      await helpers.simulateNetworkError('**/*');
      
      // Try to perform an action
      const newCustomer = testData.generateRandomCustomer();
      await customersPage.createCustomer({
        name: newCustomer.name,
        email: newCustomer.email
      });
      
      // Should show appropriate error message
      await assertions.toastAppears('Network error. Please check your connection.', 'error');
      
      // Should show offline indicator
      await helpers.waitForVisible('[data-testid="offline-indicator"]');
    });

    test('should retry failed API requests automatically', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      let requestCount = 0;
      await page.route('**/api/customers', async route => {
        requestCount++;
        if (requestCount < 3) {
          // Fail the first 2 attempts
          await route.abort('failed');
        } else {
          // Succeed on the 3rd attempt
          await route.continue();
        }
      });
      
      const newCustomer = testData.generateRandomCustomer();
      await customersPage.createCustomer({
        name: newCustomer.name,
        email: newCustomer.email
      });
      
      // Should eventually succeed after retries
      await assertions.toastAppears('Customer created successfully', 'success');
      expect(requestCount).toBe(3);
    });

    test('should handle intermittent connectivity issues', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Simulate intermittent failures
      let failureCount = 0;
      await page.route('**/api/customers', async route => {
        failureCount++;
        if (failureCount % 2 === 0) {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });
      
      // Should handle the intermittent failures gracefully
      await customersPage.searchCustomers('Acme');
      
      // Should eventually load data or show appropriate error
      const hasResults = await customersPage.hasCustomer('Acme Corporation');
      const hasErrorMessage = await helpers.elementExists('[data-testid="error-message"]');
      expect(hasResults || hasErrorMessage).toBe(true);
    });
  });

  test.describe('Server Error Scenarios', () => {
    test('should handle 500 internal server errors', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Mock 500 error
      await helpers.mockAPIResponse('**/customers', 
        { error: 'Internal server error' }, 
        500
      );
      
      await page.reload();
      
      // Should show server error message
      await helpers.waitForVisible('[data-testid="server-error"]');
      const errorMessage = await helpers.getTextContent('[data-testid="server-error"]');
      expect(errorMessage).toContain('server is experiencing issues');
    });

    test('should handle 503 service unavailable', async ({ page }) => {
      await loginPage.goto();
      
      // Mock 503 error for login
      await helpers.mockAPIResponse('**/auth/login', 
        { error: 'Service temporarily unavailable' }, 
        503
      );
      
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      
      // Should show service unavailable message
      await assertions.toastAppears('Service temporarily unavailable', 'error');
      
      // Should show retry button
      await helpers.waitForVisible('[data-testid="retry-button"]');
    });

    test('should handle rate limiting (429 errors)', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Mock rate limit error
      await helpers.mockAPIResponse('**/customers', 
        { 
          error: 'Rate limit exceeded',
          retryAfter: 60 
        }, 
        429
      );
      
      const newCustomer = testData.generateRandomCustomer();
      await customersPage.createCustomer({
        name: newCustomer.name,
        email: newCustomer.email
      });
      
      // Should show rate limit message
      await assertions.toastAppears('Too many requests. Please try again in 60 seconds.', 'warning');
      
      // Should disable form temporarily
      expect(await helpers.isDisabled('[data-testid="save-button"]')).toBe(true);
    });
  });

  test.describe('Authentication Error Scenarios', () => {
    test('should handle expired tokens gracefully', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Mock expired token response
      await helpers.mockAPIResponse('**/customers', 
        { error: 'Token expired' }, 
        401
      );
      
      await page.reload();
      
      // Should redirect to login with appropriate message
      await expect(page).toHaveURL(/.*\/auth\/login/);
      await assertions.toastAppears('Your session has expired. Please log in again.', 'warning');
    });

    test('should handle invalid tokens', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Corrupt the token in localStorage
      await page.evaluate(() => {
        localStorage.setItem('access_token', 'invalid-token');
      });
      
      await page.reload();
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\/auth\/login/);
      await assertions.toastAppears('Authentication failed. Please log in again.', 'error');
    });

    test('should handle account suspension', async ({ page }) => {
      await loginPage.goto();
      
      // Mock account suspended response
      await helpers.mockAPIResponse('**/auth/login', 
        { 
          error: 'Account suspended',
          reason: 'Payment overdue' 
        }, 
        403
      );
      
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      
      // Should show account suspended message
      await assertions.toastAppears('Account suspended: Payment overdue', 'error');
      
      // Should show contact support option
      await helpers.waitForVisible('[data-testid="contact-support"]');
    });
  });

  test.describe('Validation Error Scenarios', () => {
    test('should handle server-side validation errors', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Mock validation error response
      await helpers.mockAPIResponse('**/customers', 
        {
          error: 'Validation failed',
          details: [
            { field: 'email', message: 'Email already exists' },
            { field: 'phone', message: 'Invalid phone number format' }
          ]
        }, 
        422
      );
      
      const newCustomer = testData.generateRandomCustomer();
      await customersPage.createCustomer({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: 'invalid-phone'
      });
      
      // Should show field-specific validation errors
      await assertions.hasValidationError('Email', 'Email already exists');
      await assertions.hasValidationError('Phone', 'Invalid phone number format');
    });

    test('should handle business logic validation errors', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await campaignsPage.goto();
      
      // Mock business logic error
      await helpers.mockAPIResponse('**/campaigns', 
        {
          error: 'Business rule violation',
          message: 'Cannot create more than 10 active campaigns per customer'
        }, 
        409
      );
      
      const newCampaign = testData.generateRandomCampaign('tenant-1', 'customer-1');
      await campaignsPage.createCampaign({
        name: newCampaign.name,
        description: newCampaign.description,
        customer: 'Acme Corporation'
      });
      
      // Should show business rule error
      await assertions.toastAppears('Cannot create more than 10 active campaigns per customer', 'error');
    });
  });

  test.describe('File Upload Error Scenarios', () => {
    test('should handle file size limit errors', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Mock file upload error
      await helpers.mockAPIResponse('**/customers/import', 
        {
          error: 'File too large',
          maxSize: '5MB'
        }, 
        413
      );
      
      await page.click('[data-testid="import-button"]');
      
      // Mock file selection (large file)
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'large-file.csv',
        mimeType: 'text/csv',
        buffer: Buffer.alloc(10 * 1024 * 1024) // 10MB file
      });
      
      await page.click('[data-testid="confirm-import"]');
      
      // Should show file size error
      await assertions.toastAppears('File too large. Maximum size is 5MB.', 'error');
    });

    test('should handle invalid file format errors', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      await page.click('[data-testid="import-button"]');
      
      // Upload invalid file type
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Invalid file content')
      });
      
      // Should show format validation error
      await assertions.toastAppears('Invalid file format. Please upload a CSV file.', 'error');
    });
  });

  test.describe('Concurrent Operation Error Scenarios', () => {
    test('should handle optimistic locking conflicts', async ({ page, context }) => {
      // Setup two browser contexts
      const page2 = await context.newPage();
      
      // Login on both pages
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      const loginPage2 = new LoginPage(page2);
      const customersPage2 = new CustomersPage(page2);
      await loginPage2.goto();
      await loginPage2.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage2.goto();
      
      // Both users try to edit the same customer
      await customersPage.editCustomer('Acme Corporation');
      await customersPage2.editCustomer('Acme Corporation');
      
      // First user saves
      await customersPage.fillCustomerForm({
        name: 'Acme Corporation - Updated by User 1',
        email: 'updated1@acme.com'
      });
      await customersPage.saveCustomer();
      
      // Mock conflict error for second user
      await helpers.mockAPIResponse('**/customers/*', 
        {
          error: 'Conflict',
          message: 'This customer was modified by another user. Please refresh and try again.'
        }, 
        409
      );
      
      // Second user tries to save
      const helpers2 = new E2EHelpers(page2);
      const assertions2 = new E2EAssertions(page2);
      
      await customersPage2.fillCustomerForm({
        name: 'Acme Corporation - Updated by User 2',
        email: 'updated2@acme.com'
      });
      await customersPage2.saveCustomer();
      
      // Should show conflict error
      await assertions2.toastAppears('This customer was modified by another user', 'warning');
      
      await page2.close();
    });

    test('should handle resource deletion conflicts', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Mock resource already deleted error
      await helpers.mockAPIResponse('**/customers/*', 
        {
          error: 'Resource not found',
          message: 'This customer has already been deleted'
        }, 
        404
      );
      
      await customersPage.deleteCustomer('Acme Corporation');
      
      // Should show resource not found error
      await assertions.toastAppears('This customer has already been deleted', 'warning');
      
      // Should refresh the list
      await helpers.waitForAPIResponse('**/customers', 'GET');
    });
  });

  test.describe('Browser Error Scenarios', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const jsErrors: string[] = [];
      
      // Capture JavaScript errors
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      
      await loginPage.goto();
      
      // Inject a JavaScript error
      await page.evaluate(() => {
        throw new Error('Simulated JavaScript error');
      });
      
      // Application should still be functional
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // Error should be captured
      expect(jsErrors.length).toBeGreaterThan(0);
    });

    test('should handle memory limitations', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Simulate memory pressure by creating many DOM elements
      await page.evaluate(() => {
        for (let i = 0; i < 10000; i++) {
          const div = document.createElement('div');
          div.textContent = 'Memory stress test element ' + i;
          document.body.appendChild(div);
        }
      });
      
      // Application should still respond
      const newCustomer = testData.generateRandomCustomer();
      await customersPage.createCustomer({
        name: newCustomer.name,
        email: newCustomer.email
      });
      
      // Should show success despite memory pressure
      await assertions.toastAppears('Customer created successfully', 'success');
    });

    test('should handle browser storage limitations', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      
      // Fill localStorage to near capacity
      await page.evaluate(() => {
        try {
          const largeData = 'x'.repeat(1024 * 1024); // 1MB string
          for (let i = 0; i < 10; i++) {
            localStorage.setItem(`large_item_${i}`, largeData);
          }
        } catch (e) {
          // Storage quota exceeded
        }
      });
      
      await customersPage.goto();
      
      // Application should handle storage limitations gracefully
      expect(await customersPage.isOnCustomersPage()).toBe(true);
    });
  });

  test.describe('Recovery Mechanisms', () => {
    test('should provide retry mechanisms for failed operations', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      let attempts = 0;
      await page.route('**/customers', async route => {
        attempts++;
        if (attempts < 3) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Temporary server error' })
          });
        } else {
          await route.continue();
        }
      });
      
      await page.reload();
      
      // Should show error with retry option
      await helpers.waitForVisible('[data-testid="error-message"]');
      await helpers.waitForVisible('[data-testid="retry-button"]');
      
      // Click retry
      await page.click('[data-testid="retry-button"]');
      
      // Should eventually succeed
      await helpers.waitForHidden('[data-testid="error-message"]');
      expect(await customersPage.getCustomerCount()).toBeGreaterThan(0);
    });

    test('should provide fallback UI for critical failures', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      
      // Simulate critical failure
      await helpers.simulateNetworkError('**/customers');
      await helpers.simulateNetworkError('**/campaigns');
      await helpers.simulateNetworkError('**/analytics');
      
      await customersPage.goto();
      
      // Should show fallback UI
      await helpers.waitForVisible('[data-testid="fallback-ui"]');
      const fallbackMessage = await helpers.getTextContent('[data-testid="fallback-message"]');
      expect(fallbackMessage).toContain('experiencing connectivity issues');
      
      // Should provide basic navigation options
      expect(await helpers.elementExists('[data-testid="offline-navigation"]')).toBe(true);
    });
  });
});