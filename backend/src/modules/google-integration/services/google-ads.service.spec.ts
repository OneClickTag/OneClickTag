/**
 * Unit tests for GoogleAdsService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { GoogleAdsService } from './google-ads.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';
import { OAuthService } from '../../auth/services/oauth.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  GoogleAdsQueryDto,
  GoogleAdsMetricsDto,
} from '../dto';
import {
  CampaignStatus,
  AdvertisingChannelType,
  BiddingStrategyType,
} from '../types/google-ads.types';
import {
  GoogleAdsApiException,
  GoogleAdsAuthenticationException,
  GoogleAdsQuotaExceededException,
  GoogleAdsCampaignException,
  GoogleAdsNetworkException,
  GoogleAdsCustomerException,
  GoogleAdsConfigurationException,
} from '../exceptions/google-ads.exceptions';
import { 
  createTestUser, 
  createTestTenant,
  createTestCustomer,
  expectError,
  random 
} from '../../../../test/utils/test-helpers';

// Mock Google Ads API
const mockGoogleAdsApi = jest.fn();
const mockCustomer = jest.fn();
const mockQuery = jest.fn();
const mockMutate = jest.fn();
const mockCampaignBudgets = { mutate: jest.fn() };
const mockCampaigns = { mutate: jest.fn() };

jest.mock('google-ads-api', () => ({
  GoogleAdsApi: mockGoogleAdsApi,
}));

describe('GoogleAdsService', () => {
  let service: GoogleAdsService;
  let configService: DeepMockProxy<ConfigService>;
  let prisma: DeepMockProxy<PrismaService>;
  let cacheService: DeepMockProxy<TenantCacheService>;
  let oauthService: DeepMockProxy<OAuthService>;

  const mockCustomerId = 'customer-123';
  const mockAdsAccountId = '1234567890';

  beforeEach(async () => {
    // Create mocks
    configService = mockDeep<ConfigService>();
    prisma = mockDeep<PrismaService>();
    cacheService = mockDeep<TenantCacheService>();
    oauthService = mockDeep<OAuthService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAdsService,
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prisma },
        { provide: TenantCacheService, useValue: cacheService },
        { provide: OAuthService, useValue: oauthService },
      ],
    }).compile();

    service = module.get<GoogleAdsService>(GoogleAdsService);

    // Setup default config values
    configService.get.mockImplementation((key: string) => {
      const config = {
        'GOOGLE_CLIENT_ID': 'test-client-id',
        'GOOGLE_CLIENT_SECRET': 'test-client-secret',
        'GOOGLE_ADS_DEVELOPER_TOKEN': 'test-developer-token',
        'GOOGLE_ADS_LOGIN_CUSTOMER_ID': 'test-login-customer-id',
      };
      return config[key];
    });

    // Setup default OAuth tokens
    oauthService.getOAuthTokens.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 3600000),
      scope: 'https://www.googleapis.com/auth/adwords',
    });

    // Setup default cache behavior
    cacheService.getOrSet.mockImplementation(async (key, factory) => {
      return await factory();
    });
    cacheService.del.mockResolvedValue(true);

    // Setup Google Ads API mocks
    mockCustomer.mockReturnValue({
      query: mockQuery,
      campaignBudgets: mockCampaignBudgets,
      campaigns: mockCampaigns,
    });

    mockGoogleAdsApi.mockReturnValue({
      Customer: mockCustomer,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeClient', () => {
    it('should initialize Google Ads client successfully', async () => {
      // Act - Access private method through service instance
      const client = await service['initializeClient'](mockCustomerId);

      // Assert
      expect(oauthService.getOAuthTokens).toHaveBeenCalledWith(mockCustomerId, 'google', 'ads');
      expect(mockGoogleAdsApi).toHaveBeenCalledWith({
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'refresh-token',
        developer_token: 'test-developer-token',
        login_customer_id: 'test-login-customer-id',
      });
      expect(client).toBeDefined();
    });

    it('should throw GoogleAdsAuthenticationException when no OAuth tokens found', async () => {
      // Arrange
      oauthService.getOAuthTokens.mockResolvedValue(null);

      // Act & Assert
      await expectError(
        () => service['initializeClient'](mockCustomerId),
        GoogleAdsAuthenticationException
      );
    });

    it('should throw GoogleAdsConfigurationException for other errors', async () => {
      // Arrange
      oauthService.getOAuthTokens.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expectError(
        () => service['initializeClient'](mockCustomerId),
        GoogleAdsConfigurationException
      );
    });
  });

  describe('getCustomerAccounts', () => {
    const mockAccountsResponse = [
      {
        customer: {
          id: '1234567890',
          descriptive_name: 'Test Account 1',
          currency_code: 'USD',
          time_zone: 'America/New_York',
          can_manage_clients: false,
          test_account: false,
          manager: false,
        },
      },
      {
        customer: {
          id: '0987654321',
          descriptive_name: 'Test Account 2',
          currency_code: 'EUR',
          time_zone: 'Europe/London',
          can_manage_clients: true,
          test_account: true,
          manager: true,
        },
      },
    ];

    it('should return customer accounts successfully', async () => {
      // Arrange
      mockQuery.mockResolvedValue(mockAccountsResponse);

      // Act
      const result = await service.getCustomerAccounts(mockCustomerId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );

      expect(result).toEqual([
        {
          id: '1234567890',
          name: 'Test Account 1',
          currency: 'USD',
          timeZone: 'America/New_York',
          descriptiveName: 'Test Account 1',
          canManageClients: false,
          testAccount: false,
          manager: false,
        },
        {
          id: '0987654321',
          name: 'Test Account 2',
          currency: 'EUR',
          timeZone: 'Europe/London',
          descriptiveName: 'Test Account 2',
          canManageClients: true,
          testAccount: true,
          manager: true,
        },
      ]);
    });

    it('should use cache for repeated requests', async () => {
      // Arrange
      const cachedAccounts = [{ id: '1', name: 'Cached Account' }];
      cacheService.getOrSet.mockResolvedValue(cachedAccounts);

      // Act
      const result = await service.getCustomerAccounts(mockCustomerId);

      // Assert
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        `google-ads:accounts:${mockCustomerId}`,
        expect.any(Function),
        { ttl: 1800 }
      );
      expect(result).toBe(cachedAccounts);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const apiError = new Error('AUTHENTICATION_ERROR');
      mockQuery.mockRejectedValue(apiError);

      // Act & Assert
      await expectError(
        () => service.getCustomerAccounts(mockCustomerId),
        GoogleAdsAuthenticationException
      );
    });
  });

  describe('getCampaigns', () => {
    const mockCampaignsResponse = [
      {
        campaign: {
          id: '123456789',
          name: 'Test Campaign 1',
          status: CampaignStatus.ENABLED,
          advertising_channel_type: 'SEARCH',
          advertising_channel_sub_type: null,
          bidding_strategy_type: 'MANUAL_CPC',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          serving_status: 'SERVING',
          optimization_score: 0.75,
        },
        campaign_budget: {
          amount_micros: '10000000', // $10
        },
      },
    ];

    it('should return campaigns without metrics', async () => {
      // Arrange
      mockQuery.mockResolvedValue(mockCampaignsResponse);

      // Act
      const result = await service.getCampaigns(mockCustomerId, mockAdsAccountId, false);

      // Assert
      expect(mockCustomer).toHaveBeenCalledWith({ customer_id: mockAdsAccountId });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('campaign.id')
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('metrics.')
      );

      expect(result).toEqual([
        {
          id: '123456789',
          name: 'Test Campaign 1',
          status: CampaignStatus.ENABLED,
          advertisingChannelType: AdvertisingChannelType.SEARCH,
          advertisingChannelSubType: null,
          biddingStrategyType: BiddingStrategyType.MANUAL_CPC,
          budget: '10000000',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          servingStatus: 'SERVING',
          optimizationScore: 0.75,
        },
      ]);
    });

    it('should return campaigns with metrics when requested', async () => {
      // Arrange
      const responseWithMetrics = [{
        ...mockCampaignsResponse[0],
        metrics: {
          impressions: 1000,
          clicks: 50,
          conversions: 5,
          cost_micros: '5000000', // $5
        },
      }];
      
      mockQuery.mockResolvedValue(responseWithMetrics);

      // Act
      const result = await service.getCampaigns(mockCustomerId, mockAdsAccountId, true);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('metrics.impressions')
      );
    });

    it('should use cache for campaign requests', async () => {
      // Arrange
      const cachedCampaigns = [{ id: '1', name: 'Cached Campaign' }];
      cacheService.getOrSet.mockResolvedValue(cachedCampaigns);

      // Act
      const result = await service.getCampaigns(mockCustomerId, mockAdsAccountId);

      // Assert
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        `google-ads:campaigns:${mockCustomerId}:${mockAdsAccountId}:false`,
        expect.any(Function),
        { ttl: 600 }
      );
      expect(result).toBe(cachedCampaigns);
    });
  });

  describe('createCampaign', () => {
    const createCampaignDto: CreateCampaignDto = {
      name: 'New Test Campaign',
      status: CampaignStatus.PAUSED,
      advertisingChannelType: AdvertisingChannelType.SEARCH,
      biddingStrategyType: BiddingStrategyType.MANUAL_CPC,
      dailyBudgetMicros: 20000000, // $20
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      networkSettings: ['SEARCH'],
    };

    it('should create campaign successfully', async () => {
      // Arrange
      const budgetResponse = {
        results: [{ resource_name: 'customers/123/campaignBudgets/456' }],
      };
      const campaignResponse = {
        results: [{ resource_name: 'customers/123/campaigns/789' }],
      };

      mockCampaignBudgets.mutate.mockResolvedValue(budgetResponse);
      mockCampaigns.mutate.mockResolvedValue(campaignResponse);

      // Act
      const result = await service.createCampaign(mockCustomerId, mockAdsAccountId, createCampaignDto);

      // Assert
      expect(mockCampaignBudgets.mutate).toHaveBeenCalledWith([
        expect.objectContaining({
          create: expect.objectContaining({
            name: `Budget for ${createCampaignDto.name}`,
            amount_micros: createCampaignDto.dailyBudgetMicros,
          }),
        }),
      ]);

      expect(mockCampaigns.mutate).toHaveBeenCalledWith([
        expect.objectContaining({
          create: expect.objectContaining({
            name: createCampaignDto.name,
            status: createCampaignDto.status,
            advertising_channel_type: createCampaignDto.advertisingChannelType,
          }),
        }),
      ]);

      expect(result).toEqual({
        resourceName: 'customers/123/campaigns/789',
        id: '789',
        name: createCampaignDto.name,
        status: createCampaignDto.status,
        advertisingChannelType: createCampaignDto.advertisingChannelType,
        biddingStrategyType: createCampaignDto.biddingStrategyType,
        dailyBudgetMicros: createCampaignDto.dailyBudgetMicros,
        startDate: createCampaignDto.startDate,
        endDate: createCampaignDto.endDate,
        servingStatus: 'PENDING',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should create campaign with TARGET_CPA bidding strategy', async () => {
      // Arrange
      const campaignDtoWithTargetCpa = {
        ...createCampaignDto,
        biddingStrategyType: BiddingStrategyType.TARGET_CPA,
        targetCpaMicros: 5000000, // $5
      };

      mockCampaignBudgets.mutate.mockResolvedValue({
        results: [{ resource_name: 'customers/123/campaignBudgets/456' }],
      });
      mockCampaigns.mutate.mockResolvedValue({
        results: [{ resource_name: 'customers/123/campaigns/789' }],
      });

      // Act
      await service.createCampaign(mockCustomerId, mockAdsAccountId, campaignDtoWithTargetCpa);

      // Assert
      expect(mockCampaigns.mutate).toHaveBeenCalledWith([
        expect.objectContaining({
          create: expect.objectContaining({
            target_cpa: {
              target_cpa_micros: campaignDtoWithTargetCpa.targetCpaMicros,
            },
          }),
        }),
      ]);
    });

    it('should create campaign with TARGET_ROAS bidding strategy', async () => {
      // Arrange
      const campaignDtoWithTargetRoas = {
        ...createCampaignDto,
        biddingStrategyType: BiddingStrategyType.TARGET_ROAS,
        targetRoas: 4.0,
      };

      mockCampaignBudgets.mutate.mockResolvedValue({
        results: [{ resource_name: 'customers/123/campaignBudgets/456' }],
      });
      mockCampaigns.mutate.mockResolvedValue({
        results: [{ resource_name: 'customers/123/campaigns/789' }],
      });

      // Act
      await service.createCampaign(mockCustomerId, mockAdsAccountId, campaignDtoWithTargetRoas);

      // Assert
      expect(mockCampaigns.mutate).toHaveBeenCalledWith([
        expect.objectContaining({
          create: expect.objectContaining({
            target_roas: {
              target_roas: campaignDtoWithTargetRoas.targetRoas,
            },
          }),
        }),
      ]);
    });

    it('should clear cache after campaign creation', async () => {
      // Arrange
      mockCampaignBudgets.mutate.mockResolvedValue({
        results: [{ resource_name: 'customers/123/campaignBudgets/456' }],
      });
      mockCampaigns.mutate.mockResolvedValue({
        results: [{ resource_name: 'customers/123/campaigns/789' }],
      });

      // Act
      await service.createCampaign(mockCustomerId, mockAdsAccountId, createCampaignDto);

      // Assert
      expect(cacheService.del).toHaveBeenCalledWith(
        `google-ads:campaigns:${mockCustomerId}:${mockAdsAccountId}:*`
      );
    });

    it('should handle campaign creation errors', async () => {
      // Arrange
      mockCampaignBudgets.mutate.mockRejectedValue(new Error('AUTHENTICATION_ERROR'));

      // Act & Assert
      await expectError(
        () => service.createCampaign(mockCustomerId, mockAdsAccountId, createCampaignDto),
        GoogleAdsAuthenticationException
      );
    });
  });

  describe('updateCampaign', () => {
    const campaignId = '789';
    const updateCampaignDto: UpdateCampaignDto = {
      name: 'Updated Campaign Name',
      status: CampaignStatus.ENABLED,
      startDate: '2024-02-01',
      endDate: '2024-11-30',
    };

    it('should update campaign successfully', async () => {
      // Arrange
      mockCampaigns.mutate.mockResolvedValue({
        results: [{ resource_name: `customers/${mockAdsAccountId}/campaigns/${campaignId}` }],
      });

      // Act
      const result = await service.updateCampaign(mockCustomerId, mockAdsAccountId, campaignId, updateCampaignDto);

      // Assert
      expect(mockCampaigns.mutate).toHaveBeenCalledWith([
        {
          update: {
            resource_name: `customers/${mockAdsAccountId}/campaigns/${campaignId}`,
            name: updateCampaignDto.name,
            status: updateCampaignDto.status,
            start_date: updateCampaignDto.startDate,
            end_date: updateCampaignDto.endDate,
          },
          update_mask: {
            paths: ['name', 'status', 'start_date', 'end_date'],
          },
        },
      ]);

      expect(result.name).toBe(updateCampaignDto.name);
      expect(result.status).toBe(updateCampaignDto.status);
    });

    it('should build correct update mask for partial updates', async () => {
      // Arrange
      const partialUpdate = { name: 'New Name Only' };
      mockCampaigns.mutate.mockResolvedValue({
        results: [{ resource_name: `customers/${mockAdsAccountId}/campaigns/${campaignId}` }],
      });

      // Act
      await service.updateCampaign(mockCustomerId, mockAdsAccountId, campaignId, partialUpdate);

      // Assert
      expect(mockCampaigns.mutate).toHaveBeenCalledWith([
        expect.objectContaining({
          update_mask: {
            paths: ['name'],
          },
        }),
      ]);
    });

    it('should throw GoogleAdsCampaignException when no fields to update', async () => {
      // Arrange
      const emptyUpdate = {};

      // Act & Assert
      await expectError(
        () => service.updateCampaign(mockCustomerId, mockAdsAccountId, campaignId, emptyUpdate),
        GoogleAdsCampaignException
      );
    });

    it('should clear cache after campaign update', async () => {
      // Arrange
      mockCampaigns.mutate.mockResolvedValue({
        results: [{ resource_name: `customers/${mockAdsAccountId}/campaigns/${campaignId}` }],
      });

      // Act
      await service.updateCampaign(mockCustomerId, mockAdsAccountId, campaignId, updateCampaignDto);

      // Assert
      expect(cacheService.del).toHaveBeenCalledWith(
        `google-ads:campaigns:${mockCustomerId}:${mockAdsAccountId}:*`
      );
    });
  });

  describe('executeQuery', () => {
    const queryDto: GoogleAdsQueryDto = {
      query: 'SELECT campaign.id, campaign.name FROM campaign',
      pageSize: 100,
      pageToken: 'next-page-token',
    };

    it('should execute custom GAQL query successfully', async () => {
      // Arrange
      const mockResponse = [
        { campaign: { id: '123', name: 'Campaign 1' } },
        { campaign: { id: '456', name: 'Campaign 2' } },
      ];
      mockQuery.mockResolvedValue(mockResponse);

      // Act
      const result = await service.executeQuery(mockCustomerId, mockAdsAccountId, queryDto);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(queryDto.query, {
        page_size: queryDto.pageSize,
        page_token: queryDto.pageToken,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should use default page size when not specified', async () => {
      // Arrange
      const queryWithoutPageSize = { query: 'SELECT campaign.id FROM campaign' };
      mockQuery.mockResolvedValue([]);

      // Act
      await service.executeQuery(mockCustomerId, mockAdsAccountId, queryWithoutPageSize);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(queryWithoutPageSize.query, {
        page_size: 1000,
        page_token: undefined,
      });
    });
  });

  describe('getCampaignMetrics', () => {
    const metricsDto: GoogleAdsMetricsDto = {
      metrics: ['impressions', 'clicks', 'conversions'],
      segments: ['date', 'device'],
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should fetch campaign metrics with custom parameters', async () => {
      // Arrange
      mockQuery.mockResolvedValue([]);
      // Spy on executeQuery to verify the constructed query
      jest.spyOn(service, 'executeQuery').mockResolvedValue([]);

      // Act
      await service.getCampaignMetrics(mockCustomerId, mockAdsAccountId, metricsDto);

      // Assert
      expect(service.executeQuery).toHaveBeenCalledWith(
        mockCustomerId,
        mockAdsAccountId,
        {
          query: expect.stringContaining('metrics.impressions, metrics.clicks, metrics.conversions'),
        }
      );
      expect(service.executeQuery).toHaveBeenCalledWith(
        mockCustomerId,
        mockAdsAccountId,
        {
          query: expect.stringContaining('segments.date, segments.device'),
        }
      );
      expect(service.executeQuery).toHaveBeenCalledWith(
        mockCustomerId,
        mockAdsAccountId,
        {
          query: expect.stringContaining('BETWEEN "2024-01-01" AND "2024-01-31"'),
        }
      );
    });

    it('should use default metrics when not specified', async () => {
      // Arrange
      const metricsWithoutCustomMetrics = { startDate: '2024-01-01', endDate: '2024-01-31' };
      jest.spyOn(service, 'executeQuery').mockResolvedValue([]);

      // Act
      await service.getCampaignMetrics(mockCustomerId, mockAdsAccountId, metricsWithoutCustomMetrics);

      // Assert
      expect(service.executeQuery).toHaveBeenCalledWith(
        mockCustomerId,
        mockAdsAccountId,
        {
          query: expect.stringContaining('metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros'),
        }
      );
    });
  });

  describe('handleGoogleAdsError', () => {
    it('should handle quota errors correctly', async () => {
      // Arrange
      const quotaError = new Error('QUOTA_ERROR: API requests per hour exceeded');

      // Act
      const handledError = service['handleGoogleAdsError'](quotaError, 'testOperation');

      // Assert
      expect(handledError).toBeInstanceOf(GoogleAdsQuotaExceededException);
      expect(handledError.message).toContain('API requests');
    });

    it('should handle authentication errors correctly', async () => {
      // Arrange
      const authError = new Error('AUTHENTICATION_ERROR: Invalid credentials');

      // Act
      const handledError = service['handleGoogleAdsError'](authError, 'testOperation');

      // Assert
      expect(handledError).toBeInstanceOf(GoogleAdsAuthenticationException);
    });

    it('should handle network errors correctly', async () => {
      // Arrange
      const networkError = { code: 'ENOTFOUND', message: 'Network error' };

      // Act
      const handledError = service['handleGoogleAdsError'](networkError, 'testOperation');

      // Assert
      expect(handledError).toBeInstanceOf(GoogleAdsNetworkException);
    });

    it('should handle customer errors correctly', async () => {
      // Arrange
      const customerError = new Error('INVALID_CUSTOMER_ID: Customer not found');

      // Act
      const handledError = service['handleGoogleAdsError'](customerError, 'testOperation');

      // Assert
      expect(handledError).toBeInstanceOf(GoogleAdsCustomerException);
    });

    it('should default to GoogleAdsApiException for unknown errors', async () => {
      // Arrange
      const unknownError = new Error('Unknown API error');

      // Act
      const handledError = service['handleGoogleAdsError'](unknownError, 'testOperation');

      // Assert
      expect(handledError).toBeInstanceOf(GoogleAdsApiException);
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully without retry', async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue('success');

      // Act
      const result = await service['executeWithRetry'](mockOperation, 'testOperation');

      // Assert
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry quota errors up to max retries', async () => {
      // Arrange
      const quotaError = new Error('QUOTA_ERROR: Rate limit exceeded');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(quotaError)
        .mockRejectedValueOnce(quotaError)
        .mockResolvedValueOnce('success');

      jest.spyOn(service as any, 'sleep').mockImplementation(() => Promise.resolve());

      // Act
      const result = await service['executeWithRetry'](mockOperation, 'testOperation');

      // Assert
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      // Arrange
      const authError = new Error('AUTHENTICATION_ERROR: Invalid token');
      const mockOperation = jest.fn().mockRejectedValue(authError);

      // Act & Assert
      await expectError(
        () => service['executeWithRetry'](mockOperation, 'testOperation'),
        Error
      );
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries exceeded', async () => {
      // Arrange
      const quotaError = new Error('QUOTA_ERROR: Rate limit exceeded');
      const mockOperation = jest.fn().mockRejectedValue(quotaError);

      jest.spyOn(service as any, 'sleep').mockImplementation(() => Promise.resolve());

      // Act & Assert
      await expectError(
        () => service['executeWithRetry'](mockOperation, 'testOperation'),
        Error
      );
      expect(mockOperation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('isRetryableError', () => {
    it('should identify quota errors as retryable', () => {
      const quotaError = new Error('QUOTA_ERROR: Exceeded limit');
      expect(service['isRetryableError'](quotaError)).toBe(true);
    });

    it('should identify resource exhausted errors as retryable', () => {
      const resourceError = new Error('RESOURCE_EXHAUSTED: Try again later');
      expect(service['isRetryableError'](resourceError)).toBe(true);
    });

    it('should identify network timeouts as retryable', () => {
      const timeoutError = { code: 'ETIMEDOUT', message: 'Timeout' };
      expect(service['isRetryableError'](timeoutError)).toBe(true);
    });

    it('should identify authentication errors as non-retryable', () => {
      const authError = new Error('AUTHENTICATION_ERROR: Invalid token');
      expect(service['isRetryableError'](authError)).toBe(false);
    });
  });

  describe('extractRetryAfterSeconds', () => {
    it('should extract retry seconds from error details', () => {
      const error = { details: { retryAfterSeconds: 120 } };
      expect(service['extractRetryAfterSeconds'](error)).toBe(120);
    });

    it('should return default retry time when not specified', () => {
      const error = { message: 'QUOTA_ERROR' };
      expect(service['extractRetryAfterSeconds'](error)).toBe(60);
    });
  });

  describe('extractIdFromResourceName', () => {
    it('should extract ID from resource name correctly', () => {
      const resourceName = 'customers/1234567890/campaigns/987654321';
      expect(service['extractIdFromResourceName'](resourceName)).toBe('987654321');
    });

    it('should handle resource names with different depths', () => {
      const resourceName = 'customers/123/campaignBudgets/456';
      expect(service['extractIdFromResourceName'](resourceName)).toBe('456');
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      // Arrange
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      // Act
      const start = Date.now();
      await service['sleep'](100);
      const duration = Date.now() - start;

      // Assert - Should complete quickly in test environment
      expect(duration).toBeLessThan(50);
    });
  });

  describe('edge cases and performance', () => {
    it('should handle very large campaign lists efficiently', async () => {
      // Arrange
      const largeCampaignResponse = Array.from({ length: 1000 }, (_, i) => ({
        campaign: {
          id: i.toString(),
          name: `Campaign ${i}`,
          status: CampaignStatus.ENABLED,
          advertising_channel_type: 'SEARCH',
          bidding_strategy_type: 'MANUAL_CPC',
        },
        campaign_budget: { amount_micros: '10000000' },
      }));

      mockQuery.mockResolvedValue(largeCampaignResponse);

      // Act
      const start = Date.now();
      const result = await service.getCampaigns(mockCustomerId, mockAdsAccountId);
      const duration = Date.now() - start;

      // Assert
      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent API calls gracefully', async () => {
      // Arrange
      mockQuery.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      // Act
      const promises = Array.from({ length: 5 }, () => 
        service.getCustomerAccounts(mockCustomerId)
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(5);
      results.forEach(result => expect(result).toEqual([]));
    });

    it('should handle malformed API responses gracefully', async () => {
      // Arrange
      const malformedResponse = [
        { 
          campaign: { 
            id: null, 
            name: undefined,
            status: 'INVALID_STATUS' 
          } 
        },
      ];
      mockQuery.mockResolvedValue(malformedResponse);

      // Act
      const result = await service.getCampaigns(mockCustomerId, mockAdsAccountId);

      // Assert
      expect(result).toEqual([
        {
          id: 'null',
          name: undefined,
          status: 'INVALID_STATUS',
          advertisingChannelType: null,
          advertisingChannelSubType: null,
          biddingStrategyType: null,
          budget: '0',
          startDate: null,
          endDate: null,
          servingStatus: null,
          optimizationScore: null,
        },
      ]);
    });
  });
});