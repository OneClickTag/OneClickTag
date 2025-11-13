import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAdsApi, resources } from 'google-ads-api';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';
import { OAuthService } from '../../auth/services/oauth.service';
import { google } from 'googleapis';
import {
  CreateConversionActionDto,
  UpdateConversionActionDto,
  ConversionActionResponseDto,
  GTMLinkingDto,
} from '../dto';
import {
  ConversionAction as ConversionActionType,
  GTMConversionTag,
  GoogleAdsApiConfig,
} from '../types/google-ads.types';
import {
  GoogleAdsApiException,
  GoogleAdsConversionActionException,
  GTMIntegrationException,
} from '../exceptions/google-ads.exceptions';

@Injectable()
export class ConversionActionsService {
  private readonly logger = new Logger(ConversionActionsService.name);

  constructor(
    private configService: ConfigService,
    private cacheService: TenantCacheService,
    private oauthService: OAuthService
  ) {}

  /**
   * Initialize Google Ads API client
   */
  private async initializeAdsClient(customerId: string): Promise<GoogleAdsApi> {
    const tokens = await this.oauthService.getOAuthTokens(
      customerId,
      'google',
      'ads'
    );
    if (!tokens) {
      throw new GoogleAdsApiException(
        'No valid OAuth tokens found for customer'
      );
    }

    const developerToken = this.configService.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      throw new GoogleAdsApiException('Google Ads Developer Token is not configured');
    }

    const config: GoogleAdsApiConfig = {
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      refresh_token: tokens.refreshToken,
      developer_token: developerToken,
      login_customer_id: this.configService.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
    };

    this.logger.log('Initializing Google Ads client for conversion actions with config:', {
      client_id: config.client_id?.substring(0, 20) + '...',
      has_refresh_token: !!config.refresh_token,
      has_developer_token: !!config.developer_token,
    });

    return new GoogleAdsApi(config);
  }

  /**
   * Initialize Google Tag Manager API client
   */
  private async initializeGTMClient(customerId: string) {
    const tokens = await this.oauthService.getOAuthTokens(
      customerId,
      'google',
      'gtm'
    );
    if (!tokens) {
      throw new GTMIntegrationException(
        'No valid GTM OAuth tokens found for customer'
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    return google.tagmanager({ version: 'v2', auth: oauth2Client });
  }

  /**
   * Get conversion actions for a Google Ads account
   */
  async getConversionActions(
    customerId: string,
    adsAccountId: string
  ): Promise<ConversionActionType[]> {
    const cacheKey = `google-ads:conversion-actions:${customerId}:${adsAccountId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(
          `Fetching conversion actions for customer: ${customerId}, account: ${adsAccountId}`
        );

        try {
          const client = await this.initializeAdsClient(customerId);
          const tokens = await this.oauthService.getOAuthTokens(
            customerId,
            'google',
            'ads'
          );
          const customer = client.Customer({
            customer_id: adsAccountId,
            refresh_token: tokens.refreshToken,
          });

          const query = `
            SELECT 
              conversion_action.id,
              conversion_action.name,
              conversion_action.category,
              conversion_action.status,
              conversion_action.type,
              conversion_action.counting_type,
              conversion_action.click_through_lookback_window_days,
              conversion_action.view_through_lookback_window_days,
              conversion_action.value_settings.default_value,
              conversion_action.value_settings.default_currency_code,
              conversion_action.attribution_model_settings.attribution_model,
              conversion_action.tag_snippets
            FROM conversion_action
            WHERE conversion_action.status != "REMOVED"
            ORDER BY conversion_action.name
          `;

          const response = await customer.query(query);

          const conversionActions: ConversionActionType[] = response.map(
            (row: any) => ({
              id: row.conversion_action.id.toString(),
              name: row.conversion_action.name,
              category: row.conversion_action.category,
              status: row.conversion_action.status,
              type: row.conversion_action.type,
              countingType: row.conversion_action.counting_type,
              clickThroughLookbackWindowDays:
                row.conversion_action.click_through_lookback_window_days,
              viewThroughLookbackWindowDays:
                row.conversion_action.view_through_lookback_window_days,
              value: row.conversion_action.value_settings?.default_value,
              currency:
                row.conversion_action.value_settings?.default_currency_code,
              attributionModelSettings: {
                attributionModel:
                  row.conversion_action.attribution_model_settings
                    ?.attribution_model,
              },
            })
          );

          this.logger.log(
            `Found ${conversionActions.length} conversion actions for account: ${adsAccountId}`
          );
          return conversionActions;
        } catch (error) {
          this.logger.error(
            `Failed to fetch conversion actions: ${error.message}`,
            error.stack
          );
          throw new GoogleAdsConversionActionException(error.message);
        }
      },
      { ttl: 1800 } // 30 minutes cache
    );
  }

  /**
   * Create a new conversion action
   */
  async createConversionAction(
    customerId: string,
    adsAccountId: string,
    conversionData: CreateConversionActionDto
  ): Promise<ConversionActionResponseDto> {
    this.logger.log(
      `Creating conversion action for customer: ${customerId}, account: ${adsAccountId}`
    );

    try {
      const client = await this.initializeAdsClient(customerId);
      const tokens = await this.oauthService.getOAuthTokens(
        customerId,
        'google',
        'ads'
      );
      const customer = client.Customer({
        customer_id: adsAccountId,
        refresh_token: tokens.refreshToken,
      });

      // Build the conversion action resource using the correct Google Ads API library format
      const conversionActionToCreate: resources.IConversionAction = {
        name: conversionData.name,
        category: conversionData.category as any, // Google Ads API expects specific string literals
        status: conversionData.status as any,
        type: conversionData.type as any,
        counting_type: conversionData.countingType as any,
        click_through_lookback_window_days:
          conversionData.clickThroughLookbackWindowDays || 30,
        view_through_lookback_window_days:
          conversionData.viewThroughLookbackWindowDays || 1,
        include_in_conversions_metric:
          conversionData.includeInConversionsMetric !== false,
        attribution_model_settings: {
          attribution_model: conversionData.attributionModel as any,
        },
      };

      // Add value settings if provided
      if (
        conversionData.defaultValue !== undefined ||
        conversionData.defaultCurrency
      ) {
        conversionActionToCreate.value_settings = {
          default_value: conversionData.defaultValue,
          default_currency_code: conversionData.defaultCurrency,
        };
      }
      let response: any;
      try {
        // Use the create method with proper format
        response = await customer.conversionActions.create([
          conversionActionToCreate,
        ]);
      } catch (error) {
        this.logger.error(
          `Failed to create conversion action: ${error.message}`,
          error.stack
        );
        throw new GoogleAdsConversionActionException(error.message);
      }
      const resourceName = response.results[0].resource_name;
      const conversionActionId = this.extractIdFromResourceName(resourceName);

      // Get tag snippets for the created conversion action
      const tagSnippets = await this.getConversionActionTagSnippets(
        customerId,
        adsAccountId,
        conversionActionId
      );

      // Clear cache
      await this.cacheService.del(
        `google-ads:conversion-actions:${customerId}:${adsAccountId}`
      );

      this.logger.log(
        `Conversion action created successfully: ${conversionActionId}`
      );

      return {
        resourceName,
        id: conversionActionId,
        name: conversionData.name,
        category: conversionData.category,
        status: conversionData.status,
        type: conversionData.type,
        clickThroughLookbackWindowDays:
          conversionData.clickThroughLookbackWindowDays || 30,
        viewThroughLookbackWindowDays:
          conversionData.viewThroughLookbackWindowDays || 1,
        gtmTag: tagSnippets,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to create conversion action: ${error.message}`,
        error.stack
      );
      throw new GoogleAdsConversionActionException(error.message);
    }
  }

  /**
   * Update an existing conversion action
   */
  async updateConversionAction(
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    conversionData: UpdateConversionActionDto
  ): Promise<ConversionActionResponseDto> {
    this.logger.log(
      `Updating conversion action: ${conversionActionId} for customer: ${customerId}`
    );

    try {
      const client = await this.initializeAdsClient(customerId);
      const tokens = await this.oauthService.getOAuthTokens(
        customerId,
        'google',
        'ads'
      );
      const customer = client.Customer({
        customer_id: adsAccountId,
        refresh_token: tokens.refreshToken,
      });

      const resourceName = `customers/${adsAccountId}/conversionActions/${conversionActionId}`;

      const updateOperation: any = {
        update: {
          resource_name: resourceName,
        },
        update_mask: {
          paths: [],
        },
      };

      // Build update mask and update object
      if (conversionData.name !== undefined) {
        updateOperation.update.name = conversionData.name;
        updateOperation.update_mask.paths.push('name');
      }

      if (conversionData.status !== undefined) {
        updateOperation.update.status = conversionData.status;
        updateOperation.update_mask.paths.push('status');
      }

      if (conversionData.includeInConversionsMetric !== undefined) {
        updateOperation.update.include_in_conversions_metric =
          conversionData.includeInConversionsMetric;
        updateOperation.update_mask.paths.push('include_in_conversions_metric');
      }

      if (updateOperation.update_mask.paths.length === 0) {
        throw new GoogleAdsConversionActionException(
          'No valid fields to update'
        );
      }

      await customer.conversionActions.update([updateOperation]);

      // Clear cache
      await this.cacheService.del(
        `google-ads:conversion-actions:${customerId}:${adsAccountId}`
      );

      this.logger.log(
        `Conversion action updated successfully: ${conversionActionId}`
      );

      return {
        resourceName,
        id: conversionActionId,
        name: conversionData.name || 'Updated Conversion Action',
        category: 'DEFAULT',
        status: conversionData.status || 'ENABLED',
        type: 'WEBPAGE',
        clickThroughLookbackWindowDays: 30,
        viewThroughLookbackWindowDays: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to update conversion action: ${error.message}`,
        error.stack
      );
      throw new GoogleAdsConversionActionException(error.message);
    }
  }

  /**
   * Get tag snippets for a conversion action
   */
  async getConversionActionTagSnippets(
    customerId: string,
    adsAccountId: string,
    conversionActionId: string
  ): Promise<GTMConversionTag> {
    this.logger.log(
      `Getting tag snippets for conversion action: ${conversionActionId}`
    );

    try {
      const client = await this.initializeAdsClient(customerId);
      const tokens = await this.oauthService.getOAuthTokens(
        customerId,
        'google',
        'ads'
      );
      const customer = client.Customer({
        customer_id: adsAccountId,
        refresh_token: tokens.refreshToken,
      });

      const query = `
        SELECT 
          conversion_action.id,
          conversion_action.name,
          conversion_action.tag_snippets
        FROM conversion_action
        WHERE conversion_action.id = ${conversionActionId}
      `;

      const response = await customer.query(query);

      if (response.length === 0) {
        throw new GoogleAdsConversionActionException(
          'Conversion action not found'
        );
      }

      const conversionAction = response[0].conversion_action;
      const tagSnippets = conversionAction.tag_snippets || [];

      // Extract conversion ID and label from tag snippets
      let conversionId = '';
      let conversionLabel = '';
      let globalSiteTag = '';
      let eventSnippet = '';

      for (const snippet of tagSnippets) {
        const snippetType = String(snippet.type);
        if (
          snippetType.includes('GLOBAL_SITE_TAG') ||
          snippetType === 'WEBPAGE'
        ) {
          globalSiteTag = String(snippet.page_format || '');
          // Extract conversion ID from global site tag
          const idMatch = globalSiteTag.match(/AW-(\d+)/);
          if (idMatch) {
            conversionId = idMatch[1];
          }
        } else if (
          snippetType.includes('EVENT_SNIPPET') ||
          snippetType === 'WEBSITE_CALL'
        ) {
          eventSnippet = String(snippet.page_format || '');
          // Extract conversion label from event snippet
          const labelMatch = eventSnippet.match(
            /'send_to':\s*'AW-\d+\/([^']+)'/
          );
          if (labelMatch) {
            conversionLabel = labelMatch[1];
          }
        }
      }

      return {
        conversionId,
        conversionLabel,
        globalSiteTag,
        eventSnippet,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get tag snippets: ${error.message}`,
        error.stack
      );
      throw new GoogleAdsConversionActionException(error.message);
    }
  }

  /**
   * Link conversion action with GTM
   */
  async linkWithGTM(
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    gtmData: GTMLinkingDto
  ): Promise<{ success: boolean; gtmTagId?: string; message: string }> {
    this.logger.log(
      `Linking conversion action ${conversionActionId} with GTM container: ${gtmData.containerId}`
    );

    try {
      // Get conversion tag snippets
      const tagSnippets = await this.getConversionActionTagSnippets(
        customerId,
        adsAccountId,
        conversionActionId
      );

      if (!tagSnippets.conversionId || !tagSnippets.conversionLabel) {
        throw new GTMIntegrationException(
          'Unable to extract conversion ID and label from tag snippets'
        );
      }

      // Initialize GTM client
      const gtm = await this.initializeGTMClient(customerId);

      // Create GTM tag for conversion tracking
      const tagName =
        gtmData.tagName || `Google Ads Conversion - ${conversionActionId}`;

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
      if (gtmData.customParameters) {
        Object.entries(gtmData.customParameters).forEach(([key, value]) => {
          tagResource.parameter.push({
            type: 'TEMPLATE',
            key: key,
            value: String(value),
          });
        });
      }

      // Create the tag in GTM
      const createTagResponse =
        await gtm.accounts.containers.workspaces.tags.create({
          parent: `accounts/-/containers/${gtmData.containerId}/workspaces/-`,
          requestBody: tagResource,
        });

      const gtmTagId = createTagResponse.data.tagId;

      // Create trigger if conditions are provided
      if (gtmData.triggerConditions && gtmData.triggerConditions.length > 0) {
        await this.createGTMTrigger(
          gtm,
          gtmData.containerId,
          gtmTagId,
          gtmData.triggerConditions
        );
      }

      this.logger.log(
        `Successfully linked conversion action with GTM tag: ${gtmTagId}`
      );

      return {
        success: true,
        gtmTagId,
        message: `Conversion action successfully linked with GTM container ${gtmData.containerId}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to link with GTM: ${error.message}`,
        error.stack
      );
      throw new GTMIntegrationException(error.message);
    }
  }

  /**
   * Create GTM trigger for conversion tracking
   */
  private async createGTMTrigger(
    gtm: any,
    containerId: string,
    tagId: string,
    triggerConditions: string[]
  ): Promise<void> {
    try {
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

      const createTriggerResponse =
        await gtm.accounts.containers.workspaces.triggers.create({
          parent: `accounts/-/containers/${containerId}/workspaces/-`,
          requestBody: triggerResource,
        });

      const triggerId = createTriggerResponse.data.triggerId;

      // Update tag to use the trigger
      await gtm.accounts.containers.workspaces.tags.update({
        path: `accounts/-/containers/${containerId}/workspaces/-/tags/${tagId}`,
        requestBody: {
          firingTriggerId: [triggerId],
        },
      });

      this.logger.log(`Created GTM trigger: ${triggerId} for tag: ${tagId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create GTM trigger: ${error.message}`,
        error.stack
      );
      throw new GTMIntegrationException(
        `Failed to create trigger: ${error.message}`
      );
    }
  }

  /**
   * Delete a conversion action
   */
  async deleteConversionAction(
    customerId: string,
    adsAccountId: string,
    conversionActionId: string
  ): Promise<void> {
    this.logger.log(
      `Deleting conversion action: ${conversionActionId} for customer: ${customerId}`
    );

    try {
      const client = await this.initializeAdsClient(customerId);
      const tokens = await this.oauthService.getOAuthTokens(
        customerId,
        'google',
        'ads'
      );
      const customer = client.Customer({
        customer_id: adsAccountId,
        refresh_token: tokens.refreshToken,
      });

      const resourceName = `customers/${adsAccountId}/conversionActions/${conversionActionId}`;

      const deleteOperation = {
        remove: resourceName,
      };

      await customer.conversionActions.remove([deleteOperation as any]);

      // Clear cache
      await this.cacheService.del(
        `google-ads:conversion-actions:${customerId}:${adsAccountId}`
      );

      this.logger.log(
        `Conversion action deleted successfully: ${conversionActionId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete conversion action: ${error.message}`,
        error.stack
      );
      throw new GoogleAdsConversionActionException(error.message);
    }
  }

  /**
   * Extract ID from Google Ads resource name
   */
  private extractIdFromResourceName(resourceName: string): string {
    const parts = resourceName.split('/');
    return parts[parts.length - 1];
  }
}
