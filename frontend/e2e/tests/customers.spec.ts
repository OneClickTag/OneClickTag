import { test, expect } from '@playwright/test';
import { CustomersPage } from '../pages/customers.page';
import { DashboardPage } from '../pages/dashboard.page';
import { E2EHelpers, E2EAssertions } from '../utils/helpers';
import { E2ETestData } from '../utils/test-data';

test.describe('Customer Management', () => {
  let customersPage: CustomersPage;
  let dashboardPage: DashboardPage;
  let helpers: E2EHelpers;
  let assertions: E2EAssertions;
  let testData: E2ETestData;

  test.beforeEach(async ({ page }) => {
    customersPage = new CustomersPage(page);
    dashboardPage = new DashboardPage(page);
    helpers = new E2EHelpers(page);
    assertions = new E2EAssertions(page);
    testData = new E2ETestData();
    
    // Navigate to customers page (authentication handled by storageState)
    await customersPage.goto();
  });

  test('should display customers list', async ({ page }) => {
    expect(await customersPage.isOnCustomersPage()).toBe(true);
    
    // Should show existing customers
    const customerCount = await customersPage.getCustomerCount();
    expect(customerCount).toBeGreaterThan(0);
    
    // Should have customers from test data
    expect(await customersPage.hasCustomer('Acme Corporation')).toBe(true);
    expect(await customersPage.hasCustomer('Beta Industries')).toBe(true);
  });

  test('should create a new customer successfully', async ({ page }) => {
    const newCustomer = testData.generateRandomCustomer();
    
    await customersPage.createCustomer({
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      company: newCustomer.company,
      website: newCustomer.website,
      status: 'active',
      tags: ['test', 'new']
    });
    
    // Should show success toast
    await assertions.toastAppears('Customer created successfully', 'success');
    
    // Should appear in customers list
    expect(await customersPage.hasCustomer(newCustomer.name)).toBe(true);
    
    // Should have correct status
    const status = await customersPage.getCustomerStatus(newCustomer.name);
    expect(status?.toLowerCase()).toContain('active');
  });

  test('should show validation errors for invalid customer data', async ({ page }) => {
    await customersPage.clickAddCustomer();
    
    // Try to save without required fields
    await customersPage.saveCustomer();
    
    // Should show validation errors
    await assertions.hasValidationError('Name', 'Name is required');
    await assertions.hasValidationError('Email', 'Email is required');
  });

  test('should validate email format', async ({ page }) => {
    await customersPage.clickAddCustomer();
    
    await customersPage.fillCustomerForm({
      name: 'Test Customer',
      email: 'invalid-email',
    });
    
    await customersPage.saveCustomer();
    
    await assertions.hasValidationError('Email', 'Please enter a valid email address');
  });

  test('should edit existing customer', async ({ page }) => {
    const customerName = 'Acme Corporation';
    
    await customersPage.editCustomer(customerName);
    
    // Should open edit form
    expect(await customersPage.isCustomerFormVisible()).toBe(true);
    
    // Update customer info
    await customersPage.fillCustomerForm({
      name: 'Acme Corporation Updated',
      email: 'updated@acme.com',
      phone: '+1-555-9999',
      status: 'inactive'
    });
    
    await customersPage.saveCustomer();
    
    // Should show success toast
    await assertions.toastAppears('Customer updated successfully', 'success');
    
    // Should reflect changes
    expect(await customersPage.hasCustomer('Acme Corporation Updated')).toBe(true);
    
    const status = await customersPage.getCustomerStatus('Acme Corporation Updated');
    expect(status?.toLowerCase()).toContain('inactive');
  });

  test('should delete customer with confirmation', async ({ page }) => {
    const newCustomer = testData.generateRandomCustomer();
    
    // Create a customer to delete
    await customersPage.createCustomer({
      name: newCustomer.name,
      email: newCustomer.email
    });
    
    await assertions.toastAppears('Customer created successfully');
    
    // Delete the customer
    await customersPage.deleteCustomer(newCustomer.name);
    
    // Should show success toast
    await assertions.toastAppears('Customer deleted successfully', 'success');
    
    // Should not appear in list anymore
    expect(await customersPage.hasCustomer(newCustomer.name)).toBe(false);
  });

  test('should search customers by name', async ({ page }) => {
    await customersPage.searchCustomers('Acme');
    
    // Should filter results
    expect(await customersPage.hasCustomer('Acme Corporation')).toBe(true);
    expect(await customersPage.hasCustomer('Beta Industries')).toBe(false);
  });

  test('should search customers by email', async ({ page }) => {
    await customersPage.searchCustomers('beta-industries.com');
    
    // Should filter results
    expect(await customersPage.hasCustomer('Beta Industries')).toBe(true);
    expect(await customersPage.hasCustomer('Acme Corporation')).toBe(false);
  });

  test('should filter customers by status', async ({ page }) => {
    await customersPage.filterByStatus('Active');
    
    // Should only show active customers
    const customerCount = await customersPage.getCustomerCount();
    
    // Verify all shown customers are active
    for (let i = 0; i < customerCount; i++) {
      const row = page.locator('[data-testid="customer-row"]').nth(i);
      const statusBadge = row.locator('[data-testid="status-badge"]');
      const status = await statusBadge.textContent();
      expect(status?.toLowerCase()).toContain('active');
    }
  });

  test('should handle bulk operations', async ({ page }) => {
    // Select multiple customers
    await page.check('[data-testid="customer-row"]:nth-child(1) [data-testid="select-checkbox"]');
    await page.check('[data-testid="customer-row"]:nth-child(2) [data-testid="select-checkbox"]');
    
    // Should show bulk actions toolbar
    await helpers.waitForVisible('[data-testid="bulk-actions-toolbar"]');
    
    // Test bulk status update
    await page.click('[data-testid="bulk-status-button"]');
    await page.getByText('Inactive').click();
    await page.click('[data-testid="confirm-bulk-action"]');
    
    await assertions.toastAppears('2 customers updated successfully', 'success');
  });

  test('should export customers data', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('[data-testid="export-button"]');
    await page.getByText('Export CSV').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/customers.*\.csv$/);
  });

  test('should import customers from CSV', async ({ page }) => {
    const csvContent = `Name,Email,Phone,Company,Status
Test Import 1,test1@import.com,+1-555-0001,Import Co 1,active
Test Import 2,test2@import.com,+1-555-0002,Import Co 2,active`;
    
    // Create temporary CSV file
    const csvPath = 'e2e/fixtures/customers-import.csv';
    await helpers.page.evaluate(([path, content]) => {
      const fs = require('fs');
      fs.writeFileSync(path, content);
    }, [csvPath, csvContent]);
    
    await page.click('[data-testid="import-button"]');
    await helpers.uploadFile('[data-testid="file-input"]', csvPath);
    await page.click('[data-testid="confirm-import"]');
    
    await assertions.toastAppears('2 customers imported successfully', 'success');
    
    // Should see imported customers
    expect(await customersPage.hasCustomer('Test Import 1')).toBe(true);
    expect(await customersPage.hasCustomer('Test Import 2')).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await helpers.mockAPIResponse('**/customers', 
      { error: 'Server error' }, 
      500
    );
    
    await page.reload();
    
    // Should show error message
    await helpers.waitForVisible('[data-testid="error-message"]');
    const errorMessage = await helpers.getTextContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('Failed to load customers');
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Simulate network failure
    await helpers.simulateNetworkError('**/customers');
    
    const newCustomer = testData.generateRandomCustomer();
    
    await customersPage.createCustomer({
      name: newCustomer.name,
      email: newCustomer.email
    });
    
    // Should show network error
    await assertions.toastAppears('Network error. Please check your connection.', 'error');
  });

  test('should show loading states during operations', async ({ page }) => {
    // Mock slow API response
    await helpers.mockAPIResponse('**/customers', 
      { data: [] }, 
      200
    );
    
    const newCustomer = testData.generateRandomCustomer();
    await customersPage.clickAddCustomer();
    await customersPage.fillCustomerForm({
      name: newCustomer.name,
      email: newCustomer.email
    });
    
    await customersPage.saveCustomer();
    
    // Should show loading state
    expect(await helpers.elementExists('[data-testid="loading"]')).toBe(true);
    expect(await helpers.isDisabled('[data-testid="save-button"]')).toBe(true);
  });

  test('should maintain form state during validation', async ({ page }) => {
    await customersPage.clickAddCustomer();
    
    const formData = {
      name: 'Test Customer',
      email: 'invalid-email',
      phone: '+1-555-0123',
      company: 'Test Company'
    };
    
    await customersPage.fillCustomerForm(formData);
    await customersPage.saveCustomer();
    
    // Should show validation error but maintain other field values
    await assertions.hasValidationError('Email');
    
    expect(await page.inputValue('[data-testid="name-input"]')).toBe(formData.name);
    expect(await page.inputValue('[data-testid="phone-input"]')).toBe(formData.phone);
    expect(await page.inputValue('[data-testid="company-input"]')).toBe(formData.company);
  });
});