import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { E2EHelpers, E2EAssertions } from '../utils/helpers';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let helpers: E2EHelpers;
  let assertions: E2EAssertions;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    helpers = new E2EHelpers(page);
    assertions = new E2EAssertions(page);
    
    // Clear any existing authentication
    await helpers.clearStorage();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginPage.goto();
    
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    expect(await dashboardPage.isOnDashboard()).toBe(true);
    expect(await dashboardPage.hasWelcomeMessage()).toBe(true);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await loginPage.goto();
    
    await loginPage.login('invalid@example.com', 'wrongpassword');
    
    // Should stay on login page with error message
    expect(await loginPage.isOnLoginPage()).toBe(true);
    expect(await loginPage.hasErrorMessage()).toBe(true);
    
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid credentials');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await loginPage.goto();
    
    await loginPage.clickLogin();
    
    // Should show validation errors
    await assertions.hasValidationError('Email', 'Email is required');
    await assertions.hasValidationError('Password', 'Password is required');
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await loginPage.goto();
    
    await loginPage.fillEmail('invalid-email');
    await loginPage.fillPassword('TestPassword123!');
    await loginPage.clickLogin();
    
    await assertions.hasValidationError('Email', 'Please enter a valid email address');
  });

  test('should disable login button during authentication', async ({ page }) => {
    await loginPage.goto();
    
    // Mock slow API response
    await helpers.mockAPIResponse('**/auth/login', { delay: 2000 }, 200);
    
    await loginPage.fillEmail('test@oneclicktag.com');
    await loginPage.fillPassword('TestPassword123!');
    await loginPage.clickLogin();
    
    // Button should be disabled while loading
    expect(await loginPage.isLoginButtonDisabled()).toBe(true);
    expect(await loginPage.isLoading()).toBe(true);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await loginPage.goto();
    
    // Simulate network error
    await helpers.simulateNetworkError('**/auth/login');
    
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    
    // Should show network error message
    expect(await loginPage.hasErrorMessage()).toBe(true);
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Network error');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Then logout
    await dashboardPage.logout();
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await helpers.clearStorage();
    await page.goto('/customers');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });

  test('should persist authentication across page refreshes', async ({ page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    expect(await dashboardPage.isOnDashboard()).toBe(true);
    expect(await dashboardPage.hasWelcomeMessage()).toBe(true);
  });

  test('should handle expired session gracefully', async ({ page }) => {
    // Login first
    await loginPage.goto();
    await loginPage.login('test@oneclicktag.com', 'TestPassword123!');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Mock expired token response
    await helpers.mockAPIResponse('**/customers', 
      { error: 'Token expired' }, 
      401
    );
    
    // Try to navigate to customers page
    await dashboardPage.navigateToCustomers();
    
    // Should redirect to login due to expired session
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await assertions.toastAppears('Session expired. Please login again.', 'warning');
  });

  test('should remember login credentials with "Remember Me"', async ({ page }) => {
    await loginPage.goto();
    
    // Fill credentials and check remember me
    await loginPage.fillEmail('test@oneclicktag.com');
    await loginPage.fillPassword('TestPassword123!');
    await page.check('[data-testid="remember-me-checkbox"]');
    await loginPage.clickLogin();
    
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Clear session storage but keep local storage
    await page.evaluate(() => sessionStorage.clear());
    
    // Navigate back to login
    await loginPage.goto();
    
    // Email should be pre-filled
    const emailValue = await page.inputValue('[data-testid="email-input"]');
    expect(emailValue).toBe('test@oneclicktag.com');
  });

  test('should handle forgot password flow', async ({ page }) => {
    await loginPage.goto();
    
    await loginPage.clickForgotPassword();
    
    // Should navigate to forgot password page
    await expect(page).toHaveURL(/.*\/auth\/forgot-password/);
    
    // Fill email and submit
    await page.fill('[data-testid="email-input"]', 'test@oneclicktag.com');
    await page.click('[data-testid="reset-password-button"]');
    
    await assertions.toastAppears('Password reset email sent', 'success');
  });

  test('should navigate to registration page', async ({ page }) => {
    await loginPage.goto();
    
    await loginPage.clickRegister();
    
    // Should navigate to register page
    await expect(page).toHaveURL(/.*\/auth\/register/);
  });
});