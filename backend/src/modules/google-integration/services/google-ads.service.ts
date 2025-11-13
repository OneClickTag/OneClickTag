import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantContextService } from '../../tenant/services/tenant-context.service';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';
import { OAuthService } from '../../auth/services/oauth.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateConversionActionDto,
  UpdateConversionActionDto,
  CampaignResponseDto,
  ConversionActionResponseDto,
  GoogleAdsQueryDto,
  GoogleAdsMetricsDto,
  GTMLinkingDto,
} from '../dto';
import {
  GoogleAdsCredentials,
  GoogleAdsAccount,
  GoogleAdsCampaign,
  ConversionAction as ConversionActionType,
  GoogleAdsError,
  QuotaError,
  GoogleAdsApiConfig,
  GTMConversionTag,
} from '../types/google-ads.types';
import {
  GoogleAdsApiException,
  GoogleAdsAuthenticationException,
  GoogleAdsQuotaExceededException,
  GoogleAdsCampaignException,
  GoogleAdsConversionActionException,
  GoogleAdsCustomerException,
  GoogleAdsNetworkException,
  GoogleAdsConfigurationException,
  GTMIntegrationException,
} from '../exceptions/google-ads.exceptions';

@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);
  private readonly retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private cacheService: TenantCacheService,
    private oauthService: OAuthService,
  ) {}

  /**
   * Initialize Google Ads API client for a specific customer
   */
  private async initializeClient(customerId: string): Promise<GoogleAdsApi> {
    try {
      // Get OAuth tokens for the customer
      const tokens = await this.oauthService.getOAuthTokens(customerId, 'google', 'ads');
      if (!tokens) {
        throw new GoogleAdsAuthenticationException('No valid OAuth tokens found for customer');
      }

      const config: GoogleAdsApiConfig = {
        client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        refresh_token: tokens.refreshToken,
        developer_token: this.configService.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN'),
      };

      const loginCustomerId = this.configService.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID');
      if (loginCustomerId) {
        config.login_customer_id = loginCustomerId;
      }

      this.logger.log(`Initializing Google Ads API client for customer: ${customerId}`);
      return new GoogleAdsApi(config);
    } catch (error) {
      this.logger.error(`Failed to initialize Google Ads client: ${error.message}`, error.stack);
      if (error instanceof GoogleAdsAuthenticationException) {
        throw error;
      }
      throw new GoogleAdsConfigurationException(error.message);
    }
  }

  /**
   * Get customer accounts accessible by the authenticated user
   */
  async getCustomerAccounts(customerId: string): Promise<GoogleAdsAccount[]> {
    const cacheKey = `google-ads:accounts:${customerId}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Fetching Google Ads accounts for customer: ${customerId}`);

        try {
          const client = await this.initializeClient(customerId);
          const tokens = await this.oauthService.getOAuthTokens(customerId, 'google', 'ads');
          const customer = client.Customer({ 
            customer_id: customerId,
            refresh_token: tokens.refreshToken 
          });

          const query = `
            SELECT 
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone,
              customer.can_manage_clients,
              customer.test_account,
              customer.manager
            FROM customer
            WHERE customer.status = "ENABLED"
          `;

          const response = await this.executeWithRetry(
            () => customer.query(query),
            'getCustomerAccounts',
          );

          const accounts: GoogleAdsAccount[] = response.map((row: any) => ({
            id: row.customer.id.toString(),
            name: row.customer.descriptive_name || 'Unnamed Account',
            currency: row.customer.currency_code || 'USD',
            timeZone: row.customer.time_zone || 'UTC',
            descriptiveName: row.customer.descriptive_name || '',
            canManageClients: row.customer.can_manage_clients || false,
            testAccount: row.customer.test_account || false,
            manager: row.customer.manager || false,
          }));

          this.logger.log(`Found ${accounts.length} Google Ads accounts for customer: ${customerId}`);
          return accounts;
        } catch (error) {
          this.logger.error(`Failed to fetch Google Ads accounts: ${error.message}`, error.stack);
          throw this.handleGoogleAdsError(error, 'getCustomerAccounts');
        }
      },
      { ttl: 1800 }, // 30 minutes cache
    );
  }

  /**
   * Get campaigns for a specific Google Ads account
   */
  async getCampaigns(
    customerId: string,
    adsAccountId: string,
    includeMetrics = false,
  ): Promise<GoogleAdsCampaign[]> {
    const cacheKey = `google-ads:campaigns:${customerId}:${adsAccountId}:${includeMetrics}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Fetching campaigns for customer: ${customerId}, account: ${adsAccountId}`);

        try {
          const client = await this.initializeClient(customerId);
          const tokens = await this.oauthService.getOAuthTokens(customerId, 'google', 'ads');
          const customer = client.Customer({ 
            customer_id: adsAccountId,
            refresh_token: tokens.refreshToken 
          });

          let query = `
            SELECT 
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.advertising_channel_type,
              campaign.advertising_channel_sub_type,
              campaign.bidding_strategy_type,
              campaign.start_date,
              campaign.end_date,
              campaign.serving_status,
              campaign.optimization_score,
              campaign_budget.amount_micros
          `;

          if (includeMetrics) {
            query += `,
              metrics.impressions,
              metrics.clicks,
              metrics.conversions,
              metrics.cost_micros
            `;
          }

          query += `
            FROM campaign
            WHERE campaign.status != "REMOVED"
            ORDER BY campaign.name
          `;

          const response = await this.executeWithRetry(
            () => customer.query(query),
            'getCampaigns',
          );

          const campaigns: GoogleAdsCampaign[] = response.map((row: any) => ({
            id: row.campaign.id.toString(),
            name: row.campaign.name,
            status: row.campaign.status,
            advertisingChannelType: row.campaign.advertising_channel_type,
            advertisingChannelSubType: row.campaign.advertising_channel_sub_type,
            biddingStrategyType: row.campaign.bidding_strategy_type,
            budget: row.campaign_budget?.amount_micros?.toString() || '0',
            startDate: row.campaign.start_date,
            endDate: row.campaign.end_date,
            servingStatus: row.campaign.serving_status,
            optimizationScore: row.campaign.optimization_score,
          }));

          this.logger.log(`Found ${campaigns.length} campaigns for account: ${adsAccountId}`);
          return campaigns;
        } catch (error) {
          this.logger.error(`Failed to fetch campaigns: ${error.message}`, error.stack);
          throw this.handleGoogleAdsError(error, 'getCampaigns');
        }
      },
      { ttl: 600 }, // 10 minutes cache
    );
  }

  /**
   * Create a new campaign
   */
  async createCampaign(
    customerId: string,
    adsAccountId: string,
    campaignData: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    this.logger.log(`Creating campaign for customer: ${customerId}, account: ${adsAccountId}`);

    try {
      const client = await this.initializeClient(customerId);
      const tokens = await this.oauthService.getOAuthTokens(customerId, 'google', 'ads');
      const customer = client.Customer({ 
        customer_id: adsAccountId,
        refresh_token: tokens.refreshToken 
      });

      // First create a budget
      const budgetOperation = {
        create: {
          name: `Budget for ${campaignData.name}`,
          amount_micros: campaignData.dailyBudgetMicros,
          delivery_method: 'STANDARD',
          explicitly_shared: false,
        },
      };

      const budgetResponse = await this.executeWithRetry(
        () => customer.campaignBudgets.create([budgetOperation as any]),
        'createCampaignBudget',
      );

      const budgetResourceName = budgetResponse.results[0].resource_name;

      // Create the campaign
      const campaignOperation = {
        create: {
          name: campaignData.name,
          status: campaignData.status,
          advertising_channel_type: campaignData.advertisingChannelType,
          bidding_strategy_type: campaignData.biddingStrategyType,
          campaign_budget: budgetResourceName,
          start_date: campaignData.startDate,
          end_date: campaignData.endDate,
          network_settings: {
            target_google_search: campaignData.networkSettings?.includes('SEARCH') || true,
            target_search_network: campaignData.networkSettings?.includes('SEARCH_PARTNERS') || false,
            target_content_network: campaignData.networkSettings?.includes('DISPLAY') || false,
            target_partner_search_network: false,
          },
        },
      };

      // Add bidding strategy specific settings
      if (campaignData.biddingStrategyType === 'TARGET_CPA' && campaignData.targetCpaMicros) {
        campaignOperation.create['target_cpa'] = {
          target_cpa_micros: campaignData.targetCpaMicros,
        };
      }

      if (campaignData.biddingStrategyType === 'TARGET_ROAS' && campaignData.targetRoas) {
        campaignOperation.create['target_roas'] = {
          target_roas: campaignData.targetRoas,
        };
      }

      const campaignResponse = await this.executeWithRetry(
        () => customer.campaigns.create([campaignOperation as any]),
        'createCampaign',
      );

      const campaignResourceName = campaignResponse.results[0].resource_name;
      const campaignId = this.extractIdFromResourceName(campaignResourceName);

      // Clear cache
      await this.cacheService.del(`google-ads:campaigns:${customerId}:${adsAccountId}:*`);

      this.logger.log(`Campaign created successfully: ${campaignId}`);

      return {
        resourceName: campaignResourceName,
        id: campaignId,
        name: campaignData.name,
        status: campaignData.status,
        advertisingChannelType: campaignData.advertisingChannelType,
        biddingStrategyType: campaignData.biddingStrategyType,
        dailyBudgetMicros: campaignData.dailyBudgetMicros,
        startDate: campaignData.startDate,
        endDate: campaignData.endDate,
        servingStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to create campaign: ${error.message}`, error.stack);
      throw this.handleGoogleAdsError(error, 'createCampaign');
    }
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(
    customerId: string,
    adsAccountId: string,
    campaignId: string,
    campaignData: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    this.logger.log(`Updating campaign: ${campaignId} for customer: ${customerId}`);

    try {
      const client = await this.initializeClient(customerId);
      const tokens = await this.oauthService.getOAuthTokens(customerId, 'google', 'ads');
      const customer = client.Customer({ 
        customer_id: adsAccountId,
        refresh_token: tokens.refreshToken 
      });

      const campaignResourceName = `customers/${adsAccountId}/campaigns/${campaignId}`;

      const updateOperation: any = {
        update: {
          resource_name: campaignResourceName,
        },
        update_mask: {
          paths: [],
        },
      };

      // Build update mask and update object
      if (campaignData.name !== undefined) {
        updateOperation.update.name = campaignData.name;
        updateOperation.update_mask.paths.push('name');
      }

      if (campaignData.status !== undefined) {
        updateOperation.update.status = campaignData.status;
        updateOperation.update_mask.paths.push('status');
      }

      if (campaignData.startDate !== undefined) {
        updateOperation.update.start_date = campaignData.startDate;
        updateOperation.update_mask.paths.push('start_date');
      }

      if (campaignData.endDate !== undefined) {
        updateOperation.update.end_date = campaignData.endDate;
        updateOperation.update_mask.paths.push('end_date');
      }

      if (updateOperation.update_mask.paths.length === 0) {
        throw new GoogleAdsCampaignException('No valid fields to update');
      }

      await this.executeWithRetry(
        () => customer.campaigns.update([updateOperation]),
        'updateCampaign',
      );

      // Clear cache
      await this.cacheService.del(`google-ads:campaigns:${customerId}:${adsAccountId}:*`);

      this.logger.log(`Campaign updated successfully: ${campaignId}`);

      // Return updated campaign data
      return {
        resourceName: campaignResourceName,
        id: campaignId,
        name: campaignData.name || 'Updated Campaign',
        status: campaignData.status || 'UNKNOWN',
        advertisingChannelType: 'UNKNOWN',
        biddingStrategyType: 'UNKNOWN',
        dailyBudgetMicros: 0,
        servingStatus: 'UNKNOWN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to update campaign: ${error.message}`, error.stack);
      throw this.handleGoogleAdsError(error, 'updateCampaign');
    }
  }

  /**
   * Execute custom GAQL query
   */
  async executeQuery(
    customerId: string,
    adsAccountId: string,
    queryDto: GoogleAdsQueryDto,
  ): Promise<any[]> {
    this.logger.log(`Executing GAQL query for customer: ${customerId}, account: ${adsAccountId}`);

    try {
      const client = await this.initializeClient(customerId);
      const tokens = await this.oauthService.getOAuthTokens(customerId, 'google', 'ads');
      const customer = client.Customer({ 
        customer_id: adsAccountId,
        refresh_token: tokens.refreshToken 
      });

      const response = await this.executeWithRetry(
        () => customer.query(queryDto.query, {
          page_size: queryDto.pageSize || 1000,
          page_token: queryDto.pageToken,
        }),
        'executeQuery',
      );

      this.logger.log(`Query executed successfully, returned ${response.length} results`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to execute query: ${error.message}`, error.stack);
      throw this.handleGoogleAdsError(error, 'executeQuery');
    }
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(
    customerId: string,
    adsAccountId: string,
    metricsDto: GoogleAdsMetricsDto,
  ): Promise<any[]> {
    this.logger.log(`Fetching campaign metrics for customer: ${customerId}, account: ${adsAccountId}`);

    try {
      const metrics = metricsDto.metrics || ['impressions', 'clicks', 'conversions', 'cost_micros'];
      const segments = metricsDto.segments || [];

      let query = `
        SELECT 
          campaign.id,
          campaign.name,
          ${metrics.map(m => `metrics.${m}`).join(', ')}
      `;

      if (segments.length > 0) {
        query += `, ${segments.map(s => `segments.${s}`).join(', ')}`;
      }

      query += ` FROM campaign WHERE campaign.status != "REMOVED"`;

      if (metricsDto.startDate && metricsDto.endDate) {
        query += ` AND segments.date BETWEEN "${metricsDto.startDate}" AND "${metricsDto.endDate}"`;
      }

      query += ` ORDER BY campaign.name`;

      return this.executeQuery(customerId, adsAccountId, { query });
    } catch (error) {
      this.logger.error(`Failed to fetch campaign metrics: ${error.message}`, error.stack);
      throw this.handleGoogleAdsError(error, 'getCampaignMetrics');
    }
  }

  /**
   * Handle Google Ads API errors with proper classification
   */
  private handleGoogleAdsError(error: any, operation: string): Error {
    this.logger.error(`Google Ads API error in ${operation}:`, error);

    // Handle quota errors
    if (error.message?.includes('QUOTA_ERROR') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      const retryAfter = this.extractRetryAfterSeconds(error);
      return new GoogleAdsQuotaExceededException('API requests', retryAfter);
    }

    // Handle authentication errors
    if (error.message?.includes('AUTHENTICATION_ERROR') || error.message?.includes('UNAUTHORIZED')) {
      return new GoogleAdsAuthenticationException(error.message);
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new GoogleAdsNetworkException(error.message);
    }

    // Handle API errors
    if (error.message?.includes('INVALID_CUSTOMER_ID')) {
      return new GoogleAdsCustomerException('Invalid customer ID provided');
    }

    // Default to API exception
    return new GoogleAdsApiException(error.message || 'Unknown Google Ads API error', error.code);
  }

  /**
   * Execute operation with retry logic for quota errors
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    currentRetry = 0,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Don't retry non-quota errors
      if (!this.isRetryableError(error)) {
        throw error;
      }

      if (currentRetry >= this.retryConfig.maxRetries) {
        this.logger.error(`Max retries exceeded for ${operationName}`);
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, currentRetry),
        this.retryConfig.maxDelay,
      );

      this.logger.warn(`Retrying ${operationName} in ${delay}ms (attempt ${currentRetry + 1}/${this.retryConfig.maxRetries})`);
      
      await this.sleep(delay);
      return this.executeWithRetry(operation, operationName, currentRetry + 1);
    }
  }

  /**
   * Check if error is retryable (quota/rate limit errors)
   */
  private isRetryableError(error: any): boolean {
    return (
      error.message?.includes('QUOTA_ERROR') ||
      error.message?.includes('RESOURCE_EXHAUSTED') ||
      error.message?.includes('RATE_LIMIT_EXCEEDED') ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT'
    );
  }

  /**
   * Extract retry-after seconds from error
   */
  private extractRetryAfterSeconds(error: any): number | undefined {
    // Try to extract from error details
    if (error.details?.retryAfterSeconds) {
      return error.details.retryAfterSeconds;
    }

    // Default retry time for quota errors
    return 60;
  }

  /**
   * Extract ID from Google Ads resource name
   */
  private extractIdFromResourceName(resourceName: string): string {
    const parts = resourceName.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}