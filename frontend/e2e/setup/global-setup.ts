import { chromium, FullConfig } from '@playwright/test';
import { E2ETestData } from '../utils/test-data';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...');

  // Setup test database and seed data
  const testData = new E2ETestData();
  await testData.setupTestEnvironment();
  
  console.log('✅ E2E test environment ready');

  // Create authenticated browser context
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🔐 Setting up authentication...');
    
    // Navigate to login page
    await page.goto('http://localhost:3000/auth/login');
    
    // Fill login form with test user credentials
    await page.fill('[data-testid="email-input"]', 'test@oneclicktag.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    
    // Submit login form
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Save authentication state
    await page.context().storageState({ path: 'e2e/auth/user.json' });
    console.log('✅ User authentication state saved');
    
    // Setup tenant-specific authentication
    await setupTenantAuth(page);
    
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTenantAuth(page: any) {
  // Clear current auth state
  await page.context().clearCookies();
  
  // Login as different tenant user
  await page.goto('http://localhost:3000/auth/login');
  await page.fill('[data-testid="email-input"]', 'tenant2@oneclicktag.com');
  await page.fill('[data-testid="password-input"]', 'TenantPassword123!');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Save tenant authentication state
  await page.context().storageState({ path: 'e2e/auth/tenant.json' });
  console.log('✅ Tenant authentication state saved');
}

export default globalSetup;