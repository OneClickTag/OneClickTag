import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { CustomersPage } from '../pages/customers.page';
import { CampaignsPage } from '../pages/campaigns.page';
import { DashboardPage } from '../pages/dashboard.page';
import { E2EHelpers } from '../utils/helpers';

// Configure visual tests to run only in the visual-regression project
test.describe('Visual Regression Tests', () => {
  let loginPage: LoginPage;
  let customersPage: CustomersPage;
  let campaignsPage: CampaignsPage;
  let dashboardPage: DashboardPage;
  let helpers: E2EHelpers;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    customersPage = new CustomersPage(page);
    campaignsPage = new CampaignsPage(page);
    dashboardPage = new DashboardPage(page);
    helpers = new E2EHelpers(page);
    
    // Set consistent viewport for visual tests
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test.describe('Authentication Pages', () => {
    test('should match login page design', async ({ page }) => {
      await loginPage.goto();
      await helpers.waitForLoading();
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('login-page.png');
    });

    test('should match login page with validation errors', async ({ page }) => {
      await loginPage.goto();
      await loginPage.clickLogin();
      
      // Wait for validation errors to appear
      await helpers.waitForVisible('[role="alert"]');
      
      await expect(page).toHaveScreenshot('login-page-validation-errors.png');
    });

    test('should match login page loading state', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillEmail('test@oneclicktag.com');
      await loginPage.fillPassword('TestPassword123!');
      
      // Mock slow login response
      await helpers.mockAPIResponse('**/auth/login', { delay: 2000 });
      
      await loginPage.clickLogin();
      
      // Capture loading state
      await expect(page).toHaveScreenshot('login-page-loading.png');
    });
  });

  test.describe('Dashboard Page', () => {
    test('should match dashboard layout', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await dashboardPage.goto();
      
      // Wait for all dashboard components to load
      await page.waitForLoadState('networkidle');
      await helpers.waitForVisible('[data-testid="stats-card"]');
      
      await expect(page).toHaveScreenshot('dashboard-page.png');
    });

    test('should match dashboard with different viewport sizes', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      
      // Desktop view
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page).toHaveScreenshot('dashboard-desktop.png');
      
      // Tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page).toHaveScreenshot('dashboard-tablet.png');
      
      // Mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page).toHaveScreenshot('dashboard-mobile.png');
    });

    test('should match dashboard stats cards', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      
      const statsSection = page.locator('[data-testid="dashboard-stats"]');
      await expect(statsSection).toHaveScreenshot('dashboard-stats-cards.png');
    });
  });

  test.describe('Customers Page', () => {
    test('should match customers list page', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('customers-list.png');
    });

    test('should match customer creation form', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      await customersPage.clickAddCustomer();
      
      // Wait for form to be fully rendered
      await helpers.waitForVisible('[data-testid="customer-form"]');
      
      const form = page.locator('[data-testid="customer-form"]');
      await expect(form).toHaveScreenshot('customer-form-create.png');
    });

    test('should match customer form with filled data', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      await customersPage.clickAddCustomer();
      
      await customersPage.fillCustomerForm({
        name: 'Visual Test Company',
        email: 'visual@test.com',
        phone: '+1-555-0123',
        company: 'Visual Test Corp',
        website: 'https://visual-test.com',
        status: 'active',
        tags: ['visual', 'test']
      });
      
      const form = page.locator('[data-testid="customer-form"]');
      await expect(form).toHaveScreenshot('customer-form-filled.png');
    });

    test('should match customer form validation errors', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      await customersPage.clickAddCustomer();
      
      await customersPage.fillCustomerForm({
        name: 'Test',
        email: 'invalid-email'
      });
      
      await customersPage.saveCustomer();
      
      // Wait for validation errors
      await helpers.waitForVisible('[role="alert"]');
      
      const form = page.locator('[data-testid="customer-form"]');
      await expect(form).toHaveScreenshot('customer-form-validation-errors.png');
    });

    test('should match customers table with data', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      await page.waitForLoadState('networkidle');
      
      const table = page.locator('[data-testid="customers-table"]');
      await expect(table).toHaveScreenshot('customers-table.png');
    });

    test('should match customers table empty state', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Mock empty response
      await helpers.mockAPIResponse('**/customers', { data: [], total: 0 });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('customers-empty-state.png');
    });
  });

  test.describe('Campaigns Page', () => {
    test('should match campaigns list page', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await campaignsPage.goto();
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('campaigns-list.png');
    });

    test('should match campaign creation form', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await campaignsPage.goto();
      await campaignsPage.clickAddCampaign();
      
      await helpers.waitForVisible('[data-testid="campaign-form"]');
      
      const form = page.locator('[data-testid="campaign-form"]');
      await expect(form).toHaveScreenshot('campaign-form-create.png');
    });

    test('should match GTM sync modal', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await campaignsPage.goto();
      await campaignsPage.openGTMSync('Q1 Marketing Campaign');
      
      await helpers.waitForVisible('[data-testid="gtm-sync-modal"]');
      
      const modal = page.locator('[data-testid="gtm-sync-modal"]');
      await expect(modal).toHaveScreenshot('gtm-sync-modal.png');
    });

    test('should match campaign status badges', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await campaignsPage.goto();
      await page.waitForLoadState('networkidle');
      
      // Focus on status badges section
      const statusBadges = page.locator('[data-testid="status-badge"]');
      await expect(statusBadges.first()).toHaveScreenshot('campaign-status-badges.png');
    });
  });

  test.describe('Component States', () => {
    test('should match loading states', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      
      // Mock slow response
      await helpers.mockAPIResponse('**/customers', { delay: 3000 });
      
      await customersPage.goto();
      
      // Capture loading spinner
      await helpers.waitForVisible('[data-testid="loading"]');
      await expect(page.locator('[data-testid="loading"]')).toHaveScreenshot('loading-spinner.png');
    });

    test('should match toast notifications', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Trigger success toast
      await customersPage.createCustomer({
        name: 'Toast Test Customer',
        email: 'toast@test.com'
      });
      
      await helpers.waitForVisible('[data-testid="toast"]');
      
      const toast = page.locator('[data-testid="toast"]');
      await expect(toast).toHaveScreenshot('toast-success.png');
    });

    test('should match error states', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      
      // Mock error response
      await helpers.mockAPIResponse('**/customers', 
        { error: 'Server error occurred' }, 
        500
      );
      
      await customersPage.goto();
      
      await helpers.waitForVisible('[data-testid="error-message"]');
      
      const errorState = page.locator('[data-testid="error-message"]');
      await expect(errorState).toHaveScreenshot('error-state.png');
    });
  });

  test.describe('Theme and Styling', () => {
    test('should match light theme appearance', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await dashboardPage.goto();
      
      // Ensure light theme is active
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('light-theme-dashboard.png');
    });

    test('should match dark theme appearance', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await dashboardPage.goto();
      
      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('dark-theme-dashboard.png');
    });

    test('should match button variants', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      await customersPage.clickAddCustomer();
      
      // Focus on buttons section
      const buttonsSection = page.locator('[data-testid="form-buttons"]');
      await expect(buttonsSection).toHaveScreenshot('button-variants.png');
    });

    test('should match form input states', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      await customersPage.clickAddCustomer();
      
      // Test different input states
      const nameInput = page.locator('[data-testid="name-input"]');
      const emailInput = page.locator('[data-testid="email-input"]');
      
      // Focus state
      await nameInput.focus();
      await expect(nameInput).toHaveScreenshot('input-focus-state.png');
      
      // Filled state
      await nameInput.fill('Test Name');
      await expect(nameInput).toHaveScreenshot('input-filled-state.png');
      
      // Error state
      await emailInput.fill('invalid-email');
      await customersPage.saveCustomer();
      await helpers.waitForVisible('[role="alert"]');
      await expect(emailInput).toHaveScreenshot('input-error-state.png');
    });
  });

  test.describe('Responsive Design', () => {
    test('should match mobile navigation', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await dashboardPage.goto();
      
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await helpers.waitForVisible('[data-testid="mobile-navigation"]');
      
      const mobileNav = page.locator('[data-testid="mobile-navigation"]');
      await expect(mobileNav).toHaveScreenshot('mobile-navigation.png');
    });

    test('should match tablet layout', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('customers-tablet-layout.png');
    });
  });

  test.describe('High Contrast Mode', () => {
    test('should match high contrast appearance', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await dashboardPage.goto();
      
      // Enable high contrast mode
      await page.addStyleTag({
        content: `
          * {
            filter: contrast(2) !important;
          }
        `
      });
      
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('high-contrast-dashboard.png');
    });
  });

  test.describe('Print Styles', () => {
    test('should match print layout', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
      await customersPage.goto();
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('customers-print-layout.png');
    });
  });
});