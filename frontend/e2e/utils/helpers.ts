import { Page, expect, Locator } from '@playwright/test';

export class E2EHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for a loading spinner to disappear
   */
  async waitForLoading(): Promise<void> {
    await this.page.waitForSelector('[data-testid="loading"]', { state: 'hidden', timeout: 10000 });
  }

  /**
   * Wait for a toast message to appear
   */
  async waitForToast(message?: string): Promise<void> {
    const toastSelector = '[data-testid="toast"]';
    await this.page.waitForSelector(toastSelector, { timeout: 5000 });
    
    if (message) {
      await expect(this.page.locator(toastSelector)).toContainText(message);
    }
  }

  /**
   * Fill a form field by label
   */
  async fillFieldByLabel(label: string, value: string): Promise<void> {
    const field = this.page.getByLabel(label, { exact: false });
    await field.fill(value);
  }

  /**
   * Select an option from a dropdown by label
   */
  async selectByLabel(label: string, option: string): Promise<void> {
    const select = this.page.getByLabel(label, { exact: false });
    await select.click();
    await this.page.getByText(option, { exact: true }).click();
  }

  /**
   * Upload a file to a file input
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.click(selector);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  /**
   * Take a screenshot for visual regression testing
   */
  async takeScreenshot(name: string, options?: { fullPage?: boolean; mask?: Locator[] }): Promise<void> {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: options?.fullPage ?? false,
      mask: options?.mask
    });
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(urlPattern: string | RegExp, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'): Promise<any> {
    const responsePromise = this.page.waitForResponse(response => {
      const url = response.url();
      const matchesPattern = typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
      return matchesPattern && response.request().method() === method;
    });

    const response = await responsePromise;
    return response.json();
  }

  /**
   * Mock API response
   */
  async mockAPIResponse(urlPattern: string | RegExp, response: any, status: number = 200): Promise<void> {
    await this.page.route(urlPattern, async route => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Simulate network error
   */
  async simulateNetworkError(urlPattern: string | RegExp): Promise<void> {
    await this.page.route(urlPattern, async route => {
      await route.abort('failed');
    });
  }

  /**
   * Login with test credentials
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/auth/login');
    await this.fillFieldByLabel('Email', email);
    await this.fillFieldByLabel('Password', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('**/auth/login', { timeout: 5000 });
  }

  /**
   * Navigate to a specific page
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForLoading();
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Get text content of element
   */
  async getTextContent(selector: string): Promise<string | null> {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Get attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * Check if element is disabled
   */
  async isDisabled(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isDisabled();
  }

  /**
   * Check if element is checked (for checkboxes/radios)
   */
  async isChecked(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isChecked();
  }

  /**
   * Clear browser storage
   */
  async clearStorage(): Promise<void> {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Set viewport size
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * Wait for specific amount of time
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Execute JavaScript in the browser
   */
  async evaluateJS(script: string): Promise<any> {
    return await this.page.evaluate(script);
  }

  /**
   * Check browser console errors
   */
  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    return errors;
  }

  /**
   * Compare visual screenshots
   */
  async compareScreenshot(name: string, options?: { fullPage?: boolean; threshold?: number }): Promise<void> {
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      fullPage: options?.fullPage ?? false,
      threshold: options?.threshold ?? 0.1,
      animations: 'disabled'
    });
  }
}

/**
 * Custom matchers for common assertions
 */
export class E2EAssertions {
  constructor(private page: Page) {}

  /**
   * Assert that a form field has validation error
   */
  async hasValidationError(fieldLabel: string, expectedError?: string): Promise<void> {
    const field = this.page.getByLabel(fieldLabel, { exact: false });
    const fieldContainer = field.locator('..'); // Parent container
    const errorMessage = fieldContainer.locator('[role="alert"], .text-red-500');
    
    await expect(errorMessage).toBeVisible();
    if (expectedError) {
      await expect(errorMessage).toContainText(expectedError);
    }
  }

  /**
   * Assert that an API call was made
   */
  async apiWasCalled(urlPattern: string | RegExp, method: 'GET' | 'POST' | 'PUT' | 'DELETE'): Promise<void> {
    const helper = new E2EHelpers(this.page);
    const response = await helper.waitForAPIResponse(urlPattern, method);
    expect(response).toBeDefined();
  }

  /**
   * Assert that element has specific CSS class
   */
  async hasClass(selector: string, className: string): Promise<void> {
    const element = this.page.locator(selector);
    await expect(element).toHaveClass(new RegExp(className));
  }

  /**
   * Assert that table has specific number of rows
   */
  async tableHasRows(tableSelector: string, expectedCount: number): Promise<void> {
    const rows = this.page.locator(`${tableSelector} tbody tr`);
    await expect(rows).toHaveCount(expectedCount);
  }

  /**
   * Assert that toast message appears
   */
  async toastAppears(message: string, type?: 'success' | 'error' | 'warning' | 'info'): Promise<void> {
    const toast = this.page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(message);
    
    if (type) {
      await expect(toast).toHaveClass(new RegExp(type));
    }
  }

  /**
   * Assert that URL matches pattern
   */
  async urlMatches(pattern: string | RegExp): Promise<void> {
    if (typeof pattern === 'string') {
      await expect(this.page).toHaveURL(new RegExp(pattern));
    } else {
      await expect(this.page).toHaveURL(pattern);
    }
  }
}