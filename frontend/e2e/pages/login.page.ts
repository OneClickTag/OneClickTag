import { Page } from '@playwright/test';
import { E2EHelpers } from '../utils/helpers';

export class LoginPage {
  private helpers: E2EHelpers;

  constructor(private page: Page) {
    this.helpers = new E2EHelpers(page);
  }

  // Selectors
  private selectors = {
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    loginButton: '[data-testid="login-button"]',
    forgotPasswordLink: '[data-testid="forgot-password-link"]',
    registerLink: '[data-testid="register-link"]',
    errorMessage: '[data-testid="error-message"]',
    loadingSpinner: '[data-testid="loading"]'
  };

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
    await this.helpers.waitForLoading();
  }

  // Actions
  async fillEmail(email: string): Promise<void> {
    await this.page.fill(this.selectors.emailInput, email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.page.fill(this.selectors.passwordInput, password);
  }

  async clickLogin(): Promise<void> {
    await this.page.click(this.selectors.loginButton);
  }

  async clickForgotPassword(): Promise<void> {
    await this.page.click(this.selectors.forgotPasswordLink);
  }

  async clickRegister(): Promise<void> {
    await this.page.click(this.selectors.registerLink);
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  // Assertions
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/auth/login');
  }

  async hasErrorMessage(): Promise<boolean> {
    return await this.helpers.elementExists(this.selectors.errorMessage);
  }

  async getErrorMessage(): Promise<string | null> {
    return await this.helpers.getTextContent(this.selectors.errorMessage);
  }

  async isLoading(): Promise<boolean> {
    return await this.helpers.elementExists(this.selectors.loadingSpinner);
  }

  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.helpers.isDisabled(this.selectors.loginButton);
  }
}