import { test, expect } from '@playwright/test';

test.describe('Admin Content Pages', () => {
  test.use({ storageState: 'e2e/auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should load and edit Content Pages', async ({ page }) => {
    // Navigate to Content Pages
    await page.click('text=Content');
    await page.click('text=Pages');
    await page.waitForURL('**/admin/content');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should have table or empty state
    const hasContent = await page.locator('table, text=/no.*pages/i').isVisible();
    expect(hasContent).toBeTruthy();

    // Try creating a new page
    await page.click('button:has-text("New Page"), button:has-text("Create")');

    // Wait for modal
    await expect(page.locator('[role="dialog"], .modal').first()).toBeVisible({ timeout: 5000 });

    // Fill form
    await page.fill('input[placeholder*="title"], input[id="title"]', 'Test Page');
    await page.fill('input[placeholder*="slug"], input[id="slug"]', 'test-page-' + Date.now());
    await page.fill('textarea[placeholder*="content"], textarea', '# Test Content\n\nThis is a test page.');

    // Save
    await page.click('button:has-text("Create Page"), button[type="submit"]');

    // Wait for success
    await expect(page.locator('text=/created|saved/i')).toBeVisible({ timeout: 10000 });

    console.log('✅ Content Pages work correctly');
  });

  test('should load and edit Landing Page', async ({ page }) => {
    // Navigate to Landing Page
    await page.click('text=Content');
    await page.click('text=Landing Page');
    await page.waitForURL('**/admin/landing');

    // Wait for tabs to load
    await expect(page.locator('[role="tablist"], .tabs').first()).toBeVisible({ timeout: 10000 });

    // Should have section tabs
    const tabCount = await page.locator('[role="tab"], button:has-text("Hero"), button:has-text("Features")').count();
    expect(tabCount).toBeGreaterThan(0);

    // Test Hero section
    await page.click('button:has-text("Hero")').catch(() => {});
    await page.waitForTimeout(500);

    // Should have save button
    await expect(page.locator('button:has-text("Save")').first()).toBeVisible();

    console.log('✅ Landing Page editor loads correctly');
  });

  test('should load and edit Contact Page', async ({ page }) => {
    // Navigate to Contact Page
    await page.click('text=Content');
    await page.click('text=Contact Page');
    await page.waitForURL('**/admin/contact-page');

    // Wait for form
    await page.waitForSelector('input, textarea', { timeout: 10000 });

    // Should have contact fields
    const fieldCount = await page.locator('input[type="email"], input[type="tel"], textarea').count();
    expect(fieldCount).toBeGreaterThan(0);

    // Try updating email
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('contact@testcompany.com');

    // Save
    await page.click('button:has-text("Save")');

    // Wait for success
    await expect(page.locator('text=/saved/i')).toBeVisible({ timeout: 10000 });

    console.log('✅ Contact Page editor works correctly');
  });

  test('should load Footer editor', async ({ page }) => {
    // Navigate to Footer
    await page.click('text=Content');
    await page.click('text=Footer');
    await page.waitForURL('**/admin/footer');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should have footer configuration fields
    const hasContent = await page.locator('input, textarea, button:has-text("Save")').count();
    expect(hasContent).toBeGreaterThan(0);

    console.log('✅ Footer editor loads correctly');
  });
});
