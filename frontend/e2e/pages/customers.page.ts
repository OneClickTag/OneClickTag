import { Page } from '@playwright/test';
import { E2EHelpers } from '../utils/helpers';

export class CustomersPage {
  private helpers: E2EHelpers;

  constructor(private page: Page) {
    this.helpers = new E2EHelpers(page);
  }

  // Selectors
  private selectors = {
    addCustomerButton: '[data-testid="add-customer-button"]',
    customersTable: '[data-testid="customers-table"]',
    searchInput: '[data-testid="search-input"]',
    filterDropdown: '[data-testid="filter-dropdown"]',
    customerRow: '[data-testid="customer-row"]',
    editButton: '[data-testid="edit-button"]',
    deleteButton: '[data-testid="delete-button"]',
    
    // Customer form selectors
    customerForm: '[data-testid="customer-form"]',
    nameInput: '[data-testid="name-input"]',
    emailInput: '[data-testid="email-input"]',
    phoneInput: '[data-testid="phone-input"]',
    companyInput: '[data-testid="company-input"]',
    websiteInput: '[data-testid="website-input"]',
    statusSelect: '[data-testid="status-select"]',
    tagsInput: '[data-testid="tags-input"]',
    saveButton: '[data-testid="save-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    
    // Delete confirmation
    confirmDeleteButton: '[data-testid="confirm-delete-button"]',
    cancelDeleteButton: '[data-testid="cancel-delete-button"]'
  };

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/customers');
    await this.helpers.waitForLoading();
  }

  // Actions
  async clickAddCustomer(): Promise<void> {
    await this.page.click(this.selectors.addCustomerButton);
    await this.helpers.waitForVisible(this.selectors.customerForm);
  }

  async searchCustomers(query: string): Promise<void> {
    await this.page.fill(this.selectors.searchInput, query);
    await this.helpers.waitForLoading();
  }

  async filterByStatus(status: string): Promise<void> {
    await this.page.click(this.selectors.filterDropdown);
    await this.page.getByText(status).click();
    await this.helpers.waitForLoading();
  }

  async fillCustomerForm(customer: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    website?: string;
    status?: string;
    tags?: string[];
  }): Promise<void> {
    await this.page.fill(this.selectors.nameInput, customer.name);
    await this.page.fill(this.selectors.emailInput, customer.email);
    
    if (customer.phone) {
      await this.page.fill(this.selectors.phoneInput, customer.phone);
    }
    
    if (customer.company) {
      await this.page.fill(this.selectors.companyInput, customer.company);
    }
    
    if (customer.website) {
      await this.page.fill(this.selectors.websiteInput, customer.website);
    }
    
    if (customer.status) {
      await this.page.click(this.selectors.statusSelect);
      await this.page.getByText(customer.status).click();
    }
    
    if (customer.tags && customer.tags.length > 0) {
      for (const tag of customer.tags) {
        await this.page.fill(this.selectors.tagsInput, tag);
        await this.page.keyboard.press('Enter');
      }
    }
  }

  async saveCustomer(): Promise<void> {
    await this.page.click(this.selectors.saveButton);
    await this.helpers.waitForToast();
  }

  async cancelCustomerForm(): Promise<void> {
    await this.page.click(this.selectors.cancelButton);
  }

  async editCustomer(customerName: string): Promise<void> {
    const customerRow = this.page.locator(this.selectors.customerRow).filter({ hasText: customerName });
    await customerRow.locator(this.selectors.editButton).click();
    await this.helpers.waitForVisible(this.selectors.customerForm);
  }

  async deleteCustomer(customerName: string): Promise<void> {
    const customerRow = this.page.locator(this.selectors.customerRow).filter({ hasText: customerName });
    await customerRow.locator(this.selectors.deleteButton).click();
    await this.page.click(this.selectors.confirmDeleteButton);
    await this.helpers.waitForToast();
  }

  async createCustomer(customer: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    website?: string;
    status?: string;
    tags?: string[];
  }): Promise<void> {
    await this.clickAddCustomer();
    await this.fillCustomerForm(customer);
    await this.saveCustomer();
  }

  // Assertions
  async isOnCustomersPage(): Promise<boolean> {
    return this.page.url().includes('/customers');
  }

  async getCustomerCount(): Promise<number> {
    return await this.page.locator(this.selectors.customerRow).count();
  }

  async hasCustomer(customerName: string): Promise<boolean> {
    const customerRow = this.page.locator(this.selectors.customerRow).filter({ hasText: customerName });
    return await customerRow.isVisible();
  }

  async getCustomerStatus(customerName: string): Promise<string | null> {
    const customerRow = this.page.locator(this.selectors.customerRow).filter({ hasText: customerName });
    const statusBadge = customerRow.locator('[data-testid="status-badge"]');
    return await statusBadge.textContent();
  }

  async isCustomerFormVisible(): Promise<boolean> {
    return await this.helpers.elementExists(this.selectors.customerForm);
  }

  async hasValidationError(fieldLabel: string): Promise<boolean> {
    const field = this.page.getByLabel(fieldLabel);
    const errorMessage = field.locator('xpath=following-sibling::*[contains(@class, "text-red") or @role="alert"]');
    return await errorMessage.isVisible();
  }
}