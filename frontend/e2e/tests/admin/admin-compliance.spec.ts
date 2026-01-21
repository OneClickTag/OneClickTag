import { test, expect } from '@playwright/test';

test.describe('Admin Compliance Pages', () => {
  test.use({ storageState: 'e2e/auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should load and edit Compliance Settings page', async ({ page }) => {
    // Navigate to Compliance Settings
    await page.click('text=Compliance');
    await page.click('text=Settings');
    await page.waitForURL('**/admin/compliance/settings');

    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 });

    // Check that all form fields exist
    await expect(page.locator('input[name="companyName"], input:has-text("Company Name")').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="company"], textarea[placeholder*="address"]').first()).toBeVisible();

    // Fill in company name
    const companyNameInput = page.locator('input').filter({ hasText: /company/i }).first().or(
      page.locator('input[placeholder*="company"]').first()
    );
    await companyNameInput.fill('Test Company ACME');

    // Try to save
    await page.click('button:has-text("Save")');

    // Wait for success message
    await expect(page.locator('text=/saved successfully/i')).toBeVisible({ timeout: 10000 });

    console.log('✅ Compliance Settings page works correctly');
  });

  test('should load and manage Cookie Categories', async ({ page }) => {
    // Navigate to Cookie Categories
    await page.click('text=Compliance');
    await page.click('text=Cookie Categories');
    await page.waitForURL('**/admin/compliance/cookie-categories');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if table or empty state is visible
    const hasCategories = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*categories/i').isVisible().catch(() => false);

    expect(hasCategories || hasEmptyState).toBeTruthy();

    // Try to create a new category
    await page.click('button:has-text("New"), button:has-text("Add")');

    // Wait for modal
    await expect(page.locator('[role="dialog"], .modal, .fixed').first()).toBeVisible({ timeout: 5000 });

    // Fill form
    await page.fill('input[placeholder*="name"], input[name="name"]', 'Test Category');
    await page.fill('textarea[placeholder*="description"], textarea', 'Test description for cookies');

    // Save
    await page.click('button:has-text("Create"), button:has-text("Save")');

    // Wait for success
    await expect(page.locator('text=/created|saved/i')).toBeVisible({ timeout: 10000 });

    console.log('✅ Cookie Categories page works correctly');
  });

  test('should load and manage Cookies', async ({ page }) => {
    // Navigate to Cookies
    await page.click('text=Compliance');
    await page.click('text=Cookies').nth(1); // Second "Cookies" link
    await page.waitForURL('**/admin/compliance/cookies');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Page should have either cookies list or empty state
    const hasContent = await page.locator('table, text=/no cookies/i').isVisible();
    expect(hasContent).toBeTruthy();

    console.log('✅ Cookies page loads correctly');
  });

  test('should load Cookie Banner configuration', async ({ page }) => {
    // Navigate to Cookie Banner
    await page.click('text=Compliance');
    await page.click('text=Cookie Banner');
    await page.waitForURL('**/admin/compliance/cookie-banner');

    // Wait for form to load
    await page.waitForSelector('form, input', { timeout: 10000 });

    // Check for banner configuration fields
    const hasConfigFields = await page.locator('input, textarea').count();
    expect(hasConfigFields).toBeGreaterThan(0);

    console.log('✅ Cookie Banner page loads correctly');
  });

  test('should load Data Requests page', async ({ page }) => {
    // Navigate to Data Requests
    await page.click('text=Compliance');
    await page.click('text=Data Requests');
    await page.waitForURL('**/admin/compliance/data-requests');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should have table or empty state
    const hasContent = await page.locator('table, text=/no.*requests/i').isVisible();
    expect(hasContent).toBeTruthy();

    console.log('✅ Data Requests page loads correctly');
  });

  test('should load Audit Logs page', async ({ page }) => {
    // Navigate to Audit Logs
    await page.click('text=Compliance');
    await page.click('text=Audit Logs');
    await page.waitForURL('**/admin/compliance/audit-logs');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should have filters and table/empty state
    const hasFilters = await page.locator('select, input[type="date"]').count();
    expect(hasFilters).toBeGreaterThan(0);

    console.log('✅ Audit Logs page loads correctly');
  });
});
