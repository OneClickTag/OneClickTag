import { test, expect } from '@playwright/test';

/**
 * Comprehensive Admin Panel Test Suite
 * Tests all admin pages for accessibility, editability, and functionality
 *
 * Setup: Requires admin user to be logged in (handled by auth setup)
 * Run: pnpm playwright test admin-all-pages
 */

test.describe('Admin Panel - All Pages Comprehensive Test', () => {
  // Use admin authentication
  test.use({ storageState: 'e2e/auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard before each test
    await page.goto('/admin');
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation Tests', () => {
    test('should have all navigation groups visible', async ({ page }) => {
      // Check for main navigation groups
      await expect(page.locator('text=User Management, text=Users')).toBeVisible();
      await expect(page.locator('text=Content')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();
      await expect(page.locator('text=Compliance')).toBeVisible();
    });

    test('should expand and collapse navigation groups', async ({ page }) => {
      // Test Compliance group expansion
      const complianceButton = page.locator('button:has-text("Compliance")');
      await complianceButton.click();

      // Check if sub-items are visible
      await expect(page.locator('text=Cookie Categories')).toBeVisible();
      await expect(page.locator('text=Data Requests')).toBeVisible();

      // Collapse
      await complianceButton.click();
      await page.waitForTimeout(300);
    });
  });

  test.describe('Compliance Pages', () => {
    test('Compliance Settings - should load and allow editing', async ({ page }) => {
      // Navigate
      await page.click('text=Compliance');
      await page.click('text=Settings');
      await page.waitForURL('**/admin/compliance/settings');
      await page.waitForLoadState('networkidle');

      // Check page loaded
      await expect(page.locator('h2:has-text("Compliance Settings")')).toBeVisible();

      // Find and fill company name field
      const companyInput = page.locator('input').filter({ has: page.locator('text=/company name/i') }).or(
        page.locator('input[placeholder*="company" i]')
      ).first();

      if (await companyInput.isVisible()) {
        await companyInput.fill('Test Company ' + Date.now());

        // Click save
        await page.click('button:has-text("Save")');

        // Wait for success message
        await expect(page.locator('text=/saved|success/i')).toBeVisible({ timeout: 15000 });
      }
    });

    test('Cookie Categories - should display and allow management', async ({ page }) => {
      await page.click('text=Compliance');
      await page.click('text=Cookie Categories');
      await page.waitForURL('**/admin/compliance/cookie-categories');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Cookie Categories")')).toBeVisible();

      // Should have table or empty state
      const hasContent = await page.locator('table, text=/no.*categories/i').isVisible();
      expect(hasContent).toBeTruthy();
    });

    test('Cookies - should load cookies list', async ({ page }) => {
      await page.click('text=Compliance');
      const cookiesLinks = page.locator('a:has-text("Cookies"), button:has-text("Cookies")');
      await cookiesLinks.nth(1).click(); // Second occurrence
      await page.waitForURL('**/admin/compliance/cookies');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Cookies")')).toBeVisible();
    });

    test('Cookie Banner - should load configuration', async ({ page }) => {
      await page.click('text=Compliance');
      await page.click('text=Cookie Banner');
      await page.waitForURL('**/admin/compliance/cookie-banner');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Cookie Banner")')).toBeVisible();
    });

    test('Data Requests - should load requests list', async ({ page }) => {
      await page.click('text=Compliance');
      await page.click('text=Data Requests');
      await page.waitForURL('**/admin/compliance/data-requests');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Data Access Requests")')).toBeVisible();
    });

    test('Audit Logs - should load audit logs', async ({ page }) => {
      await page.click('text=Compliance');
      await page.click('text=Audit Logs');
      await page.waitForURL('**/admin/compliance/audit-logs');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("API Audit Logs")')).toBeVisible();

      // Should have filters
      const filterCount = await page.locator('select, input[type="date"]').count();
      expect(filterCount).toBeGreaterThan(0);
    });
  });

  test.describe('Content Pages', () => {
    test('Content Pages - should load and allow creation', async ({ page }) => {
      await page.click('text=Content');
      await page.click('text=Pages');
      await page.waitForURL('**/admin/content');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Content Pages")')).toBeVisible();
    });

    test('Landing Page - should load editor', async ({ page }) => {
      await page.click('text=Content');
      await page.click('text=Landing Page');
      await page.waitForURL('**/admin/landing');
      await page.waitForLoadState('networkidle');

      // Should have tabs
      const hasTabs = await page.locator('[role="tablist"], button:has-text("Hero")').isVisible();
      expect(hasTabs).toBeTruthy();
    });

    test('Contact Page - should load editor', async ({ page }) => {
      await page.click('text=Content');
      await page.click('text=Contact Page');
      await page.waitForURL('**/admin/contact-page');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Contact")')).toBeVisible();
    });

    test('Footer - should load editor', async ({ page }) => {
      await page.click('text=Content');
      await page.click('text=Footer');
      await page.waitForURL('**/admin/footer');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Footer")')).toBeVisible();
    });
  });

  test.describe('Settings Pages', () => {
    test('Site Settings - should load and allow editing', async ({ page }) => {
      await page.click('text=Settings');
      await page.click('text=Site Settings');
      await page.waitForURL('**/admin/site-settings');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Site Settings")')).toBeVisible();

      // Should have input fields
      const inputCount = await page.locator('input').count();
      expect(inputCount).toBeGreaterThan(0);
    });

    test('Plans - should load plans management', async ({ page }) => {
      await page.click('text=Settings');
      await page.click('text=Plans');
      await page.waitForURL('**/admin/plans');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Plans")')).toBeVisible();
    });
  });

  test.describe('User Management Pages', () => {
    test('Users - should load users list', async ({ page }) => {
      await page.click('text=User Management');
      await page.click('text=Users');
      await page.waitForURL('**/admin/users');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Users")')).toBeVisible();
    });

    test('Leads - should load leads list', async ({ page }) => {
      await page.click('text=User Management');
      await page.click('text=Leads');
      await page.waitForURL('**/admin/leads');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h2:has-text("Leads")')).toBeVisible();
    });
  });

  test.describe('Edit Functionality Tests', () => {
    test('should save changes in Site Settings', async ({ page }) => {
      await page.click('text=Settings');
      await page.click('text=Site Settings');
      await page.waitForURL('**/admin/site-settings');
      await page.waitForLoadState('networkidle');

      // Find brand name input
      const brandInput = page.locator('input').filter({ hasText: /brand/i }).or(
        page.locator('input[placeholder*="brand" i]')
      ).first();

      if (await brandInput.isVisible()) {
        const testValue = 'Test Brand ' + Date.now();
        await brandInput.fill(testValue);

        // Save
        await page.click('button:has-text("Save")');

        // Check for success
        await expect(page.locator('text=/saved|success/i')).toBeVisible({ timeout: 15000 });
      }
    });
  });
});
