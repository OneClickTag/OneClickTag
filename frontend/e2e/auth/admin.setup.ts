import { test as setup, expect } from '@playwright/test';

const adminAuthFile = 'e2e/auth/admin.json';

setup('authenticate as admin user', async ({ page }) => {
  console.log('🔐 Setting up authentication for admin user...');

  // Navigate to login page
  await page.goto('/auth/login');

  // Fill login form with admin credentials
  await page.fill('input[type="email"]', 'admin@oneclicktag.dev');
  await page.fill('input[type="password"]', 'Admin123!');

  // Submit login form
  await page.click('button[type="submit"]');

  // Wait for successful login and redirect
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Verify we're logged in
  await expect(page).toHaveURL(/dashboard/);

  // Save authenticated state
  await page.context().storageState({ path: adminAuthFile });

  console.log('✅ Admin user authentication setup complete');
});
