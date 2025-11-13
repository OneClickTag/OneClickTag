import { test, expect } from '@playwright/test';
import { CampaignsPage } from '../pages/campaigns.page';
import { CustomersPage } from '../pages/customers.page';
import { E2EHelpers, E2EAssertions } from '../utils/helpers';
import { E2ETestData } from '../utils/test-data';

test.describe('Campaign Management and GTM Sync', () => {
  let campaignsPage: CampaignsPage;
  let customersPage: CustomersPage;
  let helpers: E2EHelpers;
  let assertions: E2EAssertions;
  let testData: E2ETestData;

  test.beforeEach(async ({ page }) => {
    campaignsPage = new CampaignsPage(page);
    customersPage = new CustomersPage(page);
    helpers = new E2EHelpers(page);
    assertions = new E2EAssertions(page);
    testData = new E2ETestData();
    
    // Navigate to campaigns page
    await campaignsPage.goto();
  });

  test('should display campaigns list', async ({ page }) => {
    expect(await campaignsPage.isOnCampaignsPage()).toBe(true);
    
    // Should show existing campaigns
    const campaignCount = await campaignsPage.getCampaignCount();
    expect(campaignCount).toBeGreaterThan(0);
    
    // Should have campaigns from test data
    expect(await campaignsPage.hasCampaign('Q1 Marketing Campaign')).toBe(true);
    expect(await campaignsPage.hasCampaign('Product Launch Campaign')).toBe(true);
  });

  test('should create a new campaign successfully', async ({ page }) => {
    const newCampaign = testData.generateRandomCampaign('tenant-1', 'customer-1');
    
    await campaignsPage.createCampaign({
      name: newCampaign.name,
      description: newCampaign.description,
      customer: 'Acme Corporation',
      status: 'active',
      gtmContainer: 'GTM-TEST789',
      gtmWorkspace: 'WS-TEST123'
    });
    
    // Should show success toast
    await assertions.toastAppears('Campaign created successfully', 'success');
    
    // Should appear in campaigns list
    expect(await campaignsPage.hasCampaign(newCampaign.name)).toBe(true);
    
    // Should have correct status
    const status = await campaignsPage.getCampaignStatus(newCampaign.name);
    expect(status?.toLowerCase()).toContain('active');
  });

  test('should show validation errors for invalid campaign data', async ({ page }) => {
    await campaignsPage.clickAddCampaign();
    
    // Try to save without required fields
    await campaignsPage.saveCampaign();
    
    // Should show validation errors
    await assertions.hasValidationError('Name', 'Campaign name is required');
    await assertions.hasValidationError('Description', 'Description is required');
    await assertions.hasValidationError('Customer', 'Please select a customer');
  });

  test('should edit existing campaign', async ({ page }) => {
    const campaignName = 'Q1 Marketing Campaign';
    
    await campaignsPage.editCampaign(campaignName);
    
    // Should open edit form
    expect(await campaignsPage.isCampaignFormVisible()).toBe(true);
    
    // Update campaign info
    await campaignsPage.fillCampaignForm({
      name: 'Q1 Marketing Campaign Updated',
      description: 'Updated description for Q1 campaign',
      customer: 'Acme Corporation',
      status: 'paused'
    });
    
    await campaignsPage.saveCampaign();
    
    // Should show success toast
    await assertions.toastAppears('Campaign updated successfully', 'success');
    
    // Should reflect changes
    expect(await campaignsPage.hasCampaign('Q1 Marketing Campaign Updated')).toBe(true);
    
    const status = await campaignsPage.getCampaignStatus('Q1 Marketing Campaign Updated');
    expect(status?.toLowerCase()).toContain('paused');
  });

  test('should delete campaign with confirmation', async ({ page }) => {
    const newCampaign = testData.generateRandomCampaign('tenant-1', 'customer-1');
    
    // Create a campaign to delete
    await campaignsPage.createCampaign({
      name: newCampaign.name,
      description: newCampaign.description,
      customer: 'Acme Corporation'
    });
    
    await assertions.toastAppears('Campaign created successfully');
    
    // Delete the campaign
    await campaignsPage.deleteCampaign(newCampaign.name);
    
    // Should show success toast
    await assertions.toastAppears('Campaign deleted successfully', 'success');
    
    // Should not appear in list anymore
    expect(await campaignsPage.hasCampaign(newCampaign.name)).toBe(false);
  });

  test('should sync campaign with Google Tag Manager', async ({ page }) => {
    // Mock GTM API responses
    await helpers.mockAPIResponse('**/gtm/accounts', {
      accounts: [
        { accountId: '12345', name: 'Test GTM Account' }
      ]
    });
    
    await helpers.mockAPIResponse('**/gtm/containers', {
      containers: [
        { containerId: 'GTM-TEST123', name: 'Test Container' }
      ]
    });
    
    await helpers.mockAPIResponse('**/gtm/workspaces', {
      workspaces: [
        { workspaceId: 'WS-TEST456', name: 'Default Workspace' }
      ]
    });
    
    const campaignName = 'Q1 Marketing Campaign';
    
    await campaignsPage.syncCampaignWithGTM(campaignName, {
      account: 'Test GTM Account',
      container: 'Test Container',
      workspace: 'Default Workspace'
    });
    
    // Should show success toast
    await assertions.toastAppears('Campaign synced with GTM successfully', 'success');
    
    // Should show sync status
    const syncStatus = await campaignsPage.getSyncStatus(campaignName);
    expect(syncStatus?.toLowerCase()).toContain('synced');
  });

  test('should handle GTM authentication flow', async ({ page }) => {
    const campaignName = 'Q1 Marketing Campaign';
    
    await campaignsPage.openGTMSync(campaignName);
    
    // Should open GTM sync modal
    expect(await campaignsPage.isGTMSyncModalVisible()).toBe(true);
    
    // Mock OAuth flow
    await helpers.mockAPIResponse('**/auth/google/gtm', {
      authUrl: 'https://accounts.google.com/oauth/authorize?...'
    });
    
    await campaignsPage.connectGTMAccount();
    
    // Should show connection success
    await assertions.toastAppears('GTM account connected', 'success');
  });

  test('should handle GTM sync errors gracefully', async ({ page }) => {
    // Mock GTM API error
    await helpers.mockAPIResponse('**/gtm/sync', 
      { error: 'GTM API rate limit exceeded' }, 
      429
    );
    
    const campaignName = 'Q1 Marketing Campaign';
    
    await campaignsPage.openGTMSync(campaignName);
    await campaignsPage.connectGTMAccount();
    await campaignsPage.selectGTMAccount('Test GTM Account');
    await campaignsPage.selectGTMContainer('Test Container');
    await campaignsPage.selectGTMWorkspace('Default Workspace');
    await campaignsPage.confirmGTMSync();
    
    // Should show error message
    expect(await campaignsPage.hasSyncError()).toBe(true);
    const errorMessage = await campaignsPage.getSyncError();
    expect(errorMessage).toContain('GTM API rate limit exceeded');
    
    await assertions.toastAppears('GTM sync failed', 'error');
  });

  test('should validate GTM container ID format', async ({ page }) => {
    await campaignsPage.clickAddCampaign();
    
    await campaignsPage.fillCampaignForm({
      name: 'Test Campaign',
      description: 'Test description',
      customer: 'Acme Corporation',
      gtmContainer: 'INVALID-CONTAINER-ID'
    });
    
    await campaignsPage.saveCampaign();
    
    await assertions.hasValidationError('GTM Container ID', 'Invalid GTM Container ID format');
  });

  test('should validate GTM workspace ID format', async ({ page }) => {
    await campaignsPage.clickAddCampaign();
    
    await campaignsPage.fillCampaignForm({
      name: 'Test Campaign',
      description: 'Test description',
      customer: 'Acme Corporation',
      gtmWorkspace: 'INVALID-WORKSPACE-ID'
    });
    
    await campaignsPage.saveCampaign();
    
    await assertions.hasValidationError('GTM Workspace ID', 'Invalid GTM Workspace ID format');
  });

  test('should search campaigns by name', async ({ page }) => {
    await campaignsPage.searchCampaigns('Q1 Marketing');
    
    // Should filter results
    expect(await campaignsPage.hasCampaign('Q1 Marketing Campaign')).toBe(true);
    expect(await campaignsPage.hasCampaign('Product Launch Campaign')).toBe(false);
  });

  test('should filter campaigns by status', async ({ page }) => {
    await campaignsPage.filterByStatus('Active');
    
    // Should only show active campaigns
    const campaignCount = await campaignsPage.getCampaignCount();
    
    // Verify all shown campaigns are active
    for (let i = 0; i < campaignCount; i++) {
      const row = page.locator('[data-testid="campaign-row"]').nth(i);
      const statusBadge = row.locator('[data-testid="status-badge"]');
      const status = await statusBadge.textContent();
      expect(status?.toLowerCase()).toContain('active');
    }
  });

  test('should show GTM sync progress indicators', async ({ page }) => {
    // Mock long-running sync operation
    await helpers.mockAPIResponse('**/gtm/sync', 
      { status: 'in_progress', progress: 50 }
    );
    
    const campaignName = 'Q1 Marketing Campaign';
    
    await campaignsPage.syncCampaignWithGTM(campaignName, {
      account: 'Test GTM Account',
      container: 'Test Container',
      workspace: 'Default Workspace'
    });
    
    // Should show progress indicator
    await helpers.waitForVisible('[data-testid="sync-progress"]');
    const progress = await helpers.getTextContent('[data-testid="sync-progress"]');
    expect(progress).toContain('50%');
  });

  test('should handle concurrent GTM operations', async ({ page }) => {
    const campaigns = ['Q1 Marketing Campaign', 'Product Launch Campaign'];
    
    // Mock different sync statuses
    await helpers.mockAPIResponse('**/gtm/sync/campaign-1', 
      { status: 'completed' }
    );
    await helpers.mockAPIResponse('**/gtm/sync/campaign-2', 
      { status: 'failed', error: 'Container not found' }
    );
    
    // Start sync for both campaigns
    for (const campaign of campaigns) {
      await campaignsPage.openGTMSync(campaign);
      await campaignsPage.confirmGTMSync();
    }
    
    // Should handle different outcomes appropriately
    await assertions.toastAppears('Campaign synced with GTM successfully', 'success');
    await assertions.toastAppears('GTM sync failed', 'error');
  });

  test('should export campaign data with GTM info', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('[data-testid="export-button"]');
    await page.getByText('Export with GTM Data').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/campaigns.*\.csv$/);
  });

  test('should handle campaign dependencies when deleting', async ({ page }) => {
    const campaignName = 'Q1 Marketing Campaign';
    
    // Mock API response indicating campaign has dependencies
    await helpers.mockAPIResponse('**/campaigns/*/delete', 
      { 
        error: 'Cannot delete campaign with active tracking tags',
        dependencies: ['Tag 1', 'Tag 2']
      }, 
      409
    );
    
    await campaignsPage.deleteCampaign(campaignName);
    
    // Should show dependency warning
    await helpers.waitForVisible('[data-testid="dependency-warning"]');
    const warning = await helpers.getTextContent('[data-testid="dependency-warning"]');
    expect(warning).toContain('active tracking tags');
    
    await assertions.toastAppears('Cannot delete campaign with active dependencies', 'warning');
  });

  test('should validate customer selection is required', async ({ page }) => {
    await campaignsPage.clickAddCampaign();
    
    await campaignsPage.fillCampaignForm({
      name: 'Test Campaign',
      description: 'Test description',
      customer: '' // No customer selected
    });
    
    await campaignsPage.saveCampaign();
    
    await assertions.hasValidationError('Customer', 'Please select a customer');
  });
});