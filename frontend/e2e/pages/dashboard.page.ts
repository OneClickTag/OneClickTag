import { Page } from '@playwright/test';
import { E2EHelpers } from '../utils/helpers';

export class DashboardPage {
  private helpers: E2EHelpers;

  constructor(private page: Page) {
    this.helpers = new E2EHelpers(page);
  }

  // Selectors
  private selectors = {
    userMenu: '[data-testid="user-menu"]',
    logoutButton: '[data-testid="logout-button"]',
    welcomeMessage: '[data-testid="welcome-message"]',
    navigationMenu: '[data-testid="navigation-menu"]',
    customersLink: '[data-testid="nav-customers"]',
    campaignsLink: '[data-testid="nav-campaigns"]',
    analyticsLink: '[data-testid="nav-analytics"]',
    settingsLink: '[data-testid="nav-settings"]',
    statsCards: '[data-testid="stats-card"]',
    recentActivity: '[data-testid="recent-activity"]'
  };

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.helpers.waitForLoading();
  }

  // Actions
  async clickUserMenu(): Promise<void> {
    await this.page.click(this.selectors.userMenu);
  }

  async logout(): Promise<void> {
    await this.clickUserMenu();
    await this.page.click(this.selectors.logoutButton);
  }

  async navigateToCustomers(): Promise<void> {
    await this.page.click(this.selectors.customersLink);
    await this.helpers.waitForLoading();
  }

  async navigateToCampaigns(): Promise<void> {
    await this.page.click(this.selectors.campaignsLink);
    await this.helpers.waitForLoading();
  }

  async navigateToAnalytics(): Promise<void> {
    await this.page.click(this.selectors.analyticsLink);
    await this.helpers.waitForLoading();
  }

  async navigateToSettings(): Promise<void> {
    await this.page.click(this.selectors.settingsLink);
    await this.helpers.waitForLoading();
  }

  // Assertions
  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard');
  }

  async hasWelcomeMessage(): Promise<boolean> {
    return await this.helpers.elementExists(this.selectors.welcomeMessage);
  }

  async getStatsCardCount(): Promise<number> {
    return await this.page.locator(this.selectors.statsCards).count();
  }

  async hasRecentActivity(): Promise<boolean> {
    return await this.helpers.elementExists(this.selectors.recentActivity);
  }
}