import { test as setup, expect } from '@playwright/test';
import { E2ETestData } from '../utils/test-data';

const authFile = 'e2e/auth/user.json';
const tenantAuthFile = 'e2e/auth/tenant.json';

setup('authenticate as main user', async ({ page }) => {
  console.log('🔐 Setting up authentication for main user...');
  
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Fill login form
  await page.fill('[data-testid="email-input"]', 'test@oneclicktag.com');
  await page.fill('[data-testid="password-input"]', 'TestPassword123!');
  
  // Submit login form
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login and redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Verify we're logged in
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
  
  // Save authenticated state
  await page.context().storageState({ path: authFile });
  
  console.log('✅ Main user authentication setup complete');
});

setup('authenticate as tenant user', async ({ page }) => {
  console.log('🔐 Setting up authentication for tenant user...');
  
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Fill login form with tenant user credentials
  await page.fill('[data-testid="email-input"]', 'tenant2@oneclicktag.com');
  await page.fill('[data-testid="password-input"]', 'TenantPassword123!');
  
  // Submit login form
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login and redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Verify we're logged in
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
  
  // Save authenticated state for tenant
  await page.context().storageState({ path: tenantAuthFile });
  
  console.log('✅ Tenant user authentication setup complete');
});

setup('setup test data', async () => {
  console.log('📊 Setting up test data...');
  
  const testData = new E2ETestData();
  await testData.setupTestEnvironment();
  
  console.log('✅ Test data setup complete');
});