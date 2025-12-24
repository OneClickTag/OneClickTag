import { Process, Processor } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { ConversionActionsService } from '../../modules/google-integration/services/conversion-actions.service';
import { OAuthService } from '../../modules/auth/services/oauth.service';
import { TenantContextService } from '../../modules/tenant/services/tenant-context.service';
import { GTMSyncJobData, JobQueues, JobProgress, JobResult } from '../interfaces/job.interface';

@Processor(JobQueues.GTM_SYNC)
@Injectable()
export class GTMSyncProcessor {
  private readonly logger = new Logger(GTMSyncProcessor.name);

  constructor(
    private configService: ConfigService,
    private conversionActionsService: ConversionActionsService,
    private oauthService: OAuthService,
  ) {}

  @Process()
  async processGTMSync(job: Job<GTMSyncJobData>): Promise<JobResult> {
    const { data } = job;
    this.logger.log(`Processing GTM sync job ${job.id} for customer ${data.customerId}`);

    // Set tenant context
    TenantContextService.setTenantId(data.tenantId);

    try {
      await job.progress(10);

      // Initialize GTM client
      const gtmClient = await this.initializeGTMClient(data.customerId);
      await job.progress(20);

      let result: any;

      switch (data.syncType) {
        case 'CREATE':
          result = await this.createGTMTag(gtmClient, data, job);
          break;
        case 'UPDATE':
          result = await this.updateGTMTag(gtmClient, data, job);
          break;
        case 'DELETE':
          result = await this.deleteGTMTag(gtmClient, data, job);
          break;
        default:
          throw new Error(`Unknown sync type: ${data.syncType}`);
      }

      await job.progress(100);

      this.logger.log(`GTM sync job ${job.id} completed successfully`);

      return {
        success: true,
        data: result,
        summary: {
          totalProcessed: 1,
          successful: 1,
          failed: 0,
          duration: Date.now() - job.timestamp,
        },
      };
    } catch (error) {
      this.logger.error(`GTM sync job ${job.id} failed: ${error.message}`, error.stack);

      return {
        success: false,
        errors: [
          {
            message: error.message,
            details: error,
            timestamp: new Date(),
          },
        ],
        summary: {
          totalProcessed: 1,
          successful: 0,
          failed: 1,
          duration: Date.now() - job.timestamp,
        },
      };
    } finally {
      // Clear tenant context
      TenantContextService.clearTenantId();
    }
  }

  private async initializeGTMClient(customerId: string) {
    const tokens = await this.oauthService.getOAuthTokens(customerId, 'google', 'gtm');
    if (!tokens) {
      throw new Error('No valid GTM OAuth tokens found for customer');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL')
    );
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    return google.tagmanager({ version: 'v2', auth: oauth2Client });
  }

  /**
   * Get or create OneClickTag workspace for a container
   */
  private async getOrCreateWorkspace(
    gtmClient: any,
    containerId: string
  ): Promise<string> {
    try {
      // Get GTM account ID first
      const accountsResponse = await gtmClient.accounts.list();
      if (!accountsResponse.data.account || accountsResponse.data.account.length === 0) {
        throw new Error('No GTM accounts found');
      }
      const gtmAccountId = accountsResponse.data.account[0].accountId;

      // List existing workspaces
      const workspacesResponse = await gtmClient.accounts.containers.workspaces.list({
        parent: `accounts/${gtmAccountId}/containers/${containerId}`,
      });

      // Check if OneClickTag workspace already exists
      const existingWorkspace = workspacesResponse.data.workspace?.find(
        (ws: any) => ws.name === 'OneClickTag'
      );

      if (existingWorkspace) {
        this.logger.log(`Found existing OneClickTag workspace: ${existingWorkspace.workspaceId}`);
        return existingWorkspace.workspaceId;
      }

      // Create new workspace
      this.logger.log('Creating new OneClickTag workspace');
      const createResponse = await gtmClient.accounts.containers.workspaces.create({
        parent: `accounts/${gtmAccountId}/containers/${containerId}`,
        requestBody: {
          name: 'OneClickTag',
          description: 'Workspace for OneClickTag automated tracking setup',
        },
      });

      const workspaceId = createResponse.data.workspaceId;
      this.logger.log(`Created OneClickTag workspace: ${workspaceId}`);
      return workspaceId;
    } catch (error) {
      this.logger.error(`Failed to get/create workspace: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async createGTMTag(
    gtmClient: any,
    data: GTMSyncJobData,
    job: Job<GTMSyncJobData>,
  ): Promise<any> {
    await job.progress(30);

    // Get conversion tag snippets from Google Ads
    const tagSnippets = await this.conversionActionsService.getConversionActionTagSnippets(
      data.customerId,
      data.adsAccountId,
      data.conversionActionId,
    );

    await job.progress(50);

    if (!tagSnippets.conversionId || !tagSnippets.conversionLabel) {
      throw new Error('Unable to extract conversion ID and label from tag snippets');
    }

    // Create GTM tag for conversion tracking
    const tagName = data.changes.tagName || `Google Ads Conversion - ${data.conversionActionId}`;
    
    const tagResource = {
      name: tagName,
      type: 'awct', // Google Ads Conversion Tracking tag type
      parameter: [
        {
          type: 'TEMPLATE',
          key: 'conversionId',
          value: tagSnippets.conversionId,
        },
        {
          type: 'TEMPLATE',
          key: 'conversionLabel',
          value: tagSnippets.conversionLabel,
        },
        {
          type: 'TEMPLATE',
          key: 'enableNewCustomerReporting',
          value: 'false',
        },
        {
          type: 'TEMPLATE',
          key: 'enableEnhancedConversion',
          value: 'false',
        },
      ],
    };

    // Add custom parameters if provided
    if (data.changes.customParameters) {
      Object.entries(data.changes.customParameters).forEach(([key, value]) => {
        tagResource.parameter.push({
          type: 'TEMPLATE',
          key: key,
          value: String(value),
        });
      });
    }

    await job.progress(70);

    // Get OneClickTag workspace ID
    const workspaceId = await this.getOrCreateWorkspace(gtmClient, data.gtmContainerId);

    // Create the tag in GTM
    const createTagResponse = await gtmClient.accounts.containers.workspaces.tags.create({
      parent: `accounts/-/containers/${data.gtmContainerId}/workspaces/${workspaceId}`,
      requestBody: tagResource,
    });

    const gtmTagId = createTagResponse.data.tagId;

    await job.progress(85);

    // Create trigger if conditions are provided
    if (data.changes.triggerConditions && data.changes.triggerConditions.length > 0) {
      await this.createGTMTrigger(gtmClient, data.gtmContainerId, workspaceId, gtmTagId, data.changes.triggerConditions);
    }

    return {
      gtmTagId,
      tagName,
      conversionId: tagSnippets.conversionId,
      conversionLabel: tagSnippets.conversionLabel,
      containerId: data.gtmContainerId,
    };
  }

  private async updateGTMTag(
    gtmClient: any,
    data: GTMSyncJobData,
    job: Job<GTMSyncJobData>,
  ): Promise<any> {
    await job.progress(30);

    // For updates, we need the existing tag ID stored in metadata
    const existingTagId = data.metadata?.gtmTagId;
    if (!existingTagId) {
      throw new Error('GTM tag ID not found in job metadata for update operation');
    }

    await job.progress(50);

    const updateData: any = {};

    if (data.changes.tagName) {
      updateData.name = data.changes.tagName;
    }

    // Get OneClickTag workspace ID
    const workspaceId = await this.getOrCreateWorkspace(gtmClient, data.gtmContainerId);

    if (data.changes.customParameters) {
      // Get existing tag first
      const existingTag = await gtmClient.accounts.containers.workspaces.tags.get({
        path: `accounts/-/containers/${data.gtmContainerId}/workspaces/${workspaceId}/tags/${existingTagId}`,
      });

      // Update parameters
      updateData.parameter = existingTag.data.parameter || [];

      Object.entries(data.changes.customParameters).forEach(([key, value]) => {
        const existingParam = updateData.parameter.find((p: any) => p.key === key);
        if (existingParam) {
          existingParam.value = String(value);
        } else {
          updateData.parameter.push({
            type: 'TEMPLATE',
            key: key,
            value: String(value),
          });
        }
      });
    }

    await job.progress(70);

    // Update the tag
    const updateResponse = await gtmClient.accounts.containers.workspaces.tags.update({
      path: `accounts/-/containers/${data.gtmContainerId}/workspaces/${workspaceId}/tags/${existingTagId}`,
      requestBody: updateData,
    });

    await job.progress(90);

    return {
      gtmTagId: existingTagId,
      updatedFields: Object.keys(updateData),
      containerId: data.gtmContainerId,
    };
  }

  private async deleteGTMTag(
    gtmClient: any,
    data: GTMSyncJobData,
    job: Job<GTMSyncJobData>,
  ): Promise<any> {
    await job.progress(30);

    const existingTagId = data.metadata?.gtmTagId;
    if (!existingTagId) {
      throw new Error('GTM tag ID not found in job metadata for delete operation');
    }

    await job.progress(60);

    // Get OneClickTag workspace ID
    const workspaceId = await this.getOrCreateWorkspace(gtmClient, data.gtmContainerId);

    // Delete the tag
    await gtmClient.accounts.containers.workspaces.tags.delete({
      path: `accounts/-/containers/${data.gtmContainerId}/workspaces/${workspaceId}/tags/${existingTagId}`,
    });

    await job.progress(90);

    return {
      gtmTagId: existingTagId,
      deleted: true,
      containerId: data.gtmContainerId,
    };
  }

  private async createGTMTrigger(
    gtmClient: any,
    containerId: string,
    workspaceId: string,
    tagId: string,
    triggerConditions: string[],
  ): Promise<void> {
    // Parse trigger conditions (simplified format)
    // Expected format: ['Page URL', 'contains', 'thank-you']
    const [variable, operator, value] = triggerConditions;

    const triggerResource = {
      name: `Trigger for Tag ${tagId}`,
      type: 'PAGE_VIEW',
      filter: [
        {
          type: variable.toLowerCase().replace(' ', '_'),
          parameter: [
            {
              type: 'TEMPLATE',
              key: 'operator',
              value: operator,
            },
            {
              type: 'TEMPLATE',
              key: 'arg0',
              value: value,
            },
          ],
        },
      ],
    };

    const createTriggerResponse = await gtmClient.accounts.containers.workspaces.triggers.create({
      parent: `accounts/-/containers/${containerId}/workspaces/${workspaceId}`,
      requestBody: triggerResource,
    });

    const triggerId = createTriggerResponse.data.triggerId;

    // Update tag to use the trigger
    await gtmClient.accounts.containers.workspaces.tags.update({
      path: `accounts/-/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`,
      requestBody: {
        firingTriggerId: [triggerId],
      },
    });

    this.logger.log(`Created GTM trigger: ${triggerId} for tag: ${tagId}`);
  }
}