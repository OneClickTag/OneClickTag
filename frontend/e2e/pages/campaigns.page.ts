import { Page } from '@playwright/test';
import { E2EHelpers } from '../utils/helpers';

export class CampaignsPage {
  private helpers: E2EHelpers;

  constructor(private page: Page) {
    this.helpers = new E2EHelpers(page);
  }

  // Selectors
  private selectors = {
    addCampaignButton: '[data-testid="add-campaign-button"]',
    campaignsTable: '[data-testid="campaigns-table"]',
    campaignRow: '[data-testid="campaign-row"]',
    searchInput: '[data-testid="search-input"]',
    filterDropdown: '[data-testid="filter-dropdown"]',
    editButton: '[data-testid="edit-button"]',
    deleteButton: '[data-testid="delete-button"]',
    gtmSyncButton: '[data-testid="gtm-sync-button"]',
    
    // Campaign form selectors
    campaignForm: '[data-testid="campaign-form"]',
    nameInput: '[data-testid="name-input"]',
    descriptionInput: '[data-testid="description-input"]',
    customerSelect: '[data-testid="customer-select"]',
    statusSelect: '[data-testid="status-select"]',
    gtmContainerInput: '[data-testid="gtm-container-input"]',
    gtmWorkspaceInput: '[data-testid="gtm-workspace-input"]',
    saveButton: '[data-testid="save-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    
    // GTM sync modal
    gtmSyncModal: '[data-testid="gtm-sync-modal"]',
    gtmConnectButton: '[data-testid="gtm-connect-button"]',
    gtmAccountSelect: '[data-testid="gtm-account-select"]',
    gtmContainerSelect: '[data-testid="gtm-container-select"]',
    gtmWorkspaceSelect: '[data-testid="gtm-workspace-select"]',
    confirmSyncButton: '[data-testid="confirm-sync-button"]',
    
    // Sync status indicators
    syncStatus: '[data-testid="sync-status"]',
    syncProgress: '[data-testid="sync-progress"]',
    syncError: '[data-testid="sync-error"]'
  };

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto('/campaigns');
    await this.helpers.waitForLoading();
  }

  // Actions
  async clickAddCampaign(): Promise<void> {
    await this.page.click(this.selectors.addCampaignButton);
    await this.helpers.waitForVisible(this.selectors.campaignForm);
  }

  async searchCampaigns(query: string): Promise<void> {
    await this.page.fill(this.selectors.searchInput, query);
    await this.helpers.waitForLoading();
  }

  async filterByStatus(status: string): Promise<void> {
    await this.page.click(this.selectors.filterDropdown);
    await this.page.getByText(status).click();
    await this.helpers.waitForLoading();
  }

  async fillCampaignForm(campaign: {
    name: string;
    description: string;
    customer: string;
    status?: string;
    gtmContainer?: string;
    gtmWorkspace?: string;
  }): Promise<void> {
    await this.page.fill(this.selectors.nameInput, campaign.name);
    await this.page.fill(this.selectors.descriptionInput, campaign.description);
    
    // Select customer
    await this.page.click(this.selectors.customerSelect);
    await this.page.getByText(campaign.customer).click();
    
    if (campaign.status) {
      await this.page.click(this.selectors.statusSelect);
      await this.page.getByText(campaign.status).click();
    }
    
    if (campaign.gtmContainer) {
      await this.page.fill(this.selectors.gtmContainerInput, campaign.gtmContainer);
    }
    
    if (campaign.gtmWorkspace) {
      await this.page.fill(this.selectors.gtmWorkspaceInput, campaign.gtmWorkspace);
    }
  }

  async saveCampaign(): Promise<void> {
    await this.page.click(this.selectors.saveButton);
    await this.helpers.waitForToast();
  }

  async cancelCampaignForm(): Promise<void> {
    await this.page.click(this.selectors.cancelButton);
  }

  async editCampaign(campaignName: string): Promise<void> {
    const campaignRow = this.page.locator(this.selectors.campaignRow).filter({ hasText: campaignName });
    await campaignRow.locator(this.selectors.editButton).click();
    await this.helpers.waitForVisible(this.selectors.campaignForm);
  }

  async deleteCampaign(campaignName: string): Promise<void> {
    const campaignRow = this.page.locator(this.selectors.campaignRow).filter({ hasText: campaignName });
    await campaignRow.locator(this.selectors.deleteButton).click();
    await this.page.click('[data-testid="confirm-delete-button"]');
    await this.helpers.waitForToast();
  }

  async createCampaign(campaign: {
    name: string;
    description: string;
    customer: string;
    status?: string;
    gtmContainer?: string;
    gtmWorkspace?: string;
  }): Promise<void> {
    await this.clickAddCampaign();
    await this.fillCampaignForm(campaign);
    await this.saveCampaign();
  }

  // GTM Sync Actions
  async openGTMSync(campaignName: string): Promise<void> {
    const campaignRow = this.page.locator(this.selectors.campaignRow).filter({ hasText: campaignName });
    await campaignRow.locator(this.selectors.gtmSyncButton).click();
    await this.helpers.waitForVisible(this.selectors.gtmSyncModal);
  }

  async connectGTMAccount(): Promise<void> {
    await this.page.click(this.selectors.gtmConnectButton);
    // Handle OAuth popup or mock authentication
    await this.helpers.waitForToast('GTM account connected');
  }

  async selectGTMAccount(accountName: string): Promise<void> {
    await this.page.click(this.selectors.gtmAccountSelect);
    await this.page.getByText(accountName).click();
  }

  async selectGTMContainer(containerName: string): Promise<void> {
    await this.page.click(this.selectors.gtmContainerSelect);
    await this.page.getByText(containerName).click();
  }

  async selectGTMWorkspace(workspaceName: string): Promise<void> {
    await this.page.click(this.selectors.gtmWorkspaceSelect);
    await this.page.getByText(workspaceName).click();
  }

  async confirmGTMSync(): Promise<void> {
    await this.page.click(this.selectors.confirmSyncButton);
    await this.helpers.waitForToast();
  }

  async syncCampaignWithGTM(campaignName: string, gtmConfig: {
    account: string;
    container: string;
    workspace: string;
  }): Promise<void> {
    await this.openGTMSync(campaignName);
    await this.connectGTMAccount();
    await this.selectGTMAccount(gtmConfig.account);
    await this.selectGTMContainer(gtmConfig.container);
    await this.selectGTMWorkspace(gtmConfig.workspace);
    await this.confirmGTMSync();
  }

  // Assertions
  async isOnCampaignsPage(): Promise<boolean> {
    return this.page.url().includes('/campaigns');
  }

  async getCampaignCount(): Promise<number> {
    return await this.page.locator(this.selectors.campaignRow).count();
  }

  async hasCampaign(campaignName: string): Promise<boolean> {
    const campaignRow = this.page.locator(this.selectors.campaignRow).filter({ hasText: campaignName });
    return await campaignRow.isVisible();
  }

  async getCampaignStatus(campaignName: string): Promise<string | null> {
    const campaignRow = this.page.locator(this.selectors.campaignRow).filter({ hasText: campaignName });
    const statusBadge = campaignRow.locator('[data-testid="status-badge"]');
    return await statusBadge.textContent();
  }

  async getSyncStatus(campaignName: string): Promise<string | null> {
    const campaignRow = this.page.locator(this.selectors.campaignRow).filter({ hasText: campaignName });
    const syncStatus = campaignRow.locator(this.selectors.syncStatus);
    return await syncStatus.textContent();
  }

  async isCampaignFormVisible(): Promise<boolean> {
    return await this.helpers.elementExists(this.selectors.campaignForm);
  }

  async isGTMSyncModalVisible(): Promise<boolean> {
    return await this.helpers.elementExists(this.selectors.gtmSyncModal);
  }

  async hasSyncError(): Promise<boolean> {
    return await this.helpers.elementExists(this.selectors.syncError);
  }

  async getSyncError(): Promise<string | null> {
    return await this.helpers.getTextContent(this.selectors.syncError);
  }

  async hasValidationError(fieldLabel: string): Promise<boolean> {
    const field = this.page.getByLabel(fieldLabel);
    const errorMessage = field.locator('xpath=following-sibling::*[contains(@class, "text-red") or @role="alert"]');
    return await errorMessage.isVisible();
  }
}