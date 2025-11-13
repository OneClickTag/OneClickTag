import { Process, Processor } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GoogleAdsService } from '../../modules/google-integration/services/google-ads.service';
import { ConversionActionsService } from '../../modules/google-integration/services/conversion-actions.service';
import { CustomerService } from '../../modules/customer/services/customer.service';
import { TenantContextService } from '../../modules/tenant/services/tenant-context.service';
import { FailedApiCallRetryJobData, JobQueues, JobProgress, JobResult } from '../interfaces/job.interface';

@Processor(JobQueues.API_RETRY)
@Injectable()
export class ApiRetryProcessor {
  private readonly logger = new Logger(ApiRetryProcessor.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private googleAdsService: GoogleAdsService,
    private conversionActionsService: ConversionActionsService,
    private customerService: CustomerService,
  ) {}

  @Process()
  async processApiRetry(job: Job<FailedApiCallRetryJobData>): Promise<JobResult> {
    const { data } = job;
    this.logger.log(`Processing API retry job ${job.id} for ${data.originalJobType} (attempt ${data.retryCount}/${data.maxRetries})`);

    // Set tenant context
    TenantContextService.setTenantId(data.tenantId);

    try {
      await job.progress(10);

      // Calculate retry delay based on strategy
      const delay = this.calculateRetryDelay(data.retryStrategy, data.retryCount || 0);
      if (delay > 0) {
        this.logger.log(`Waiting ${delay}ms before retry attempt`);
        await this.sleep(delay);
      }

      await job.progress(30);

      let result: any;

      // Route to appropriate retry handler based on original job type
      switch (data.originalJobType) {
        case 'google-ads-api':
          result = await this.retryGoogleAdsApiCall(data, job);
          break;
        case 'gtm-api':
          result = await this.retryGTMApiCall(data, job);
          break;
        case 'customer-api':
          result = await this.retryCustomerApiCall(data, job);
          break;
        case 'external-webhook':
          result = await this.retryExternalWebhook(data, job);
          break;
        default:
          result = await this.retryGenericHttpCall(data, job);
      }

      await job.progress(100);

      this.logger.log(`API retry job ${job.id} completed successfully after ${data.retryCount} retries`);

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
      this.logger.error(`API retry job ${job.id} failed: ${error.message}`, error.stack);

      // Check if we should retry again
      const shouldRetryAgain = this.shouldRetryAgain(error, data);

      return {
        success: false,
        errors: [
          {
            message: error.message,
            details: {
              ...error,
              shouldRetryAgain,
              nextRetryCount: (data.retryCount || 0) + 1,
            },
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

  private async retryGoogleAdsApiCall(
    data: FailedApiCallRetryJobData,
    job: Job<FailedApiCallRetryJobData>,
  ): Promise<any> {
    await job.progress(40);

    const { originalJobData } = data;

    switch (originalJobData.operation) {
      case 'getCustomerAccounts':
        return this.googleAdsService.getCustomerAccounts(originalJobData.customerId);

      case 'getCampaigns':
        return this.googleAdsService.getCampaigns(
          originalJobData.customerId,
          originalJobData.adsAccountId,
          originalJobData.includeMetrics,
        );

      case 'createCampaign':
        return this.googleAdsService.createCampaign(
          originalJobData.customerId,
          originalJobData.adsAccountId,
          originalJobData.campaignData,
        );

      case 'updateCampaign':
        return this.googleAdsService.updateCampaign(
          originalJobData.customerId,
          originalJobData.adsAccountId,
          originalJobData.campaignId,
          originalJobData.campaignData,
        );

      case 'executeQuery':
        return this.googleAdsService.executeQuery(
          originalJobData.customerId,
          originalJobData.adsAccountId,
          originalJobData.queryDto,
        );

      default:
        throw new Error(`Unknown Google Ads operation: ${originalJobData.operation}`);
    }
  }

  private async retryGTMApiCall(
    data: FailedApiCallRetryJobData,
    job: Job<FailedApiCallRetryJobData>,
  ): Promise<any> {
    await job.progress(40);

    const { originalJobData } = data;

    switch (originalJobData.operation) {
      case 'getConversionActions':
        return this.conversionActionsService.getConversionActions(
          originalJobData.customerId,
          originalJobData.adsAccountId,
        );

      case 'createConversionAction':
        return this.conversionActionsService.createConversionAction(
          originalJobData.customerId,
          originalJobData.adsAccountId,
          originalJobData.conversionData,
        );

      case 'updateConversionAction':
        return this.conversionActionsService.updateConversionAction(
          originalJobData.customerId,
          originalJobData.adsAccountId,
          originalJobData.conversionActionId,
          originalJobData.conversionData,
        );

      case 'linkWithGTM':
        return this.conversionActionsService.linkWithGTM(
          originalJobData.customerId,
          originalJobData.adsAccountId,
          originalJobData.conversionActionId,
          originalJobData.gtmData,
        );

      default:
        throw new Error(`Unknown GTM operation: ${originalJobData.operation}`);
    }
  }

  private async retryCustomerApiCall(
    data: FailedApiCallRetryJobData,
    job: Job<FailedApiCallRetryJobData>,
  ): Promise<any> {
    await job.progress(40);

    const { originalJobData } = data;

    switch (originalJobData.operation) {
      case 'create':
        return this.customerService.create(originalJobData.createDto, originalJobData.createdBy);

      case 'update':
        return this.customerService.update(
          originalJobData.id,
          originalJobData.updateDto,
          originalJobData.updatedBy,
        );

      case 'findAll':
        return this.customerService.findAll(originalJobData.query);

      case 'bulkCreate':
        return this.customerService.bulkCreate(originalJobData.bulkCreateDto, originalJobData.createdBy);

      default:
        throw new Error(`Unknown customer operation: ${originalJobData.operation}`);
    }
  }

  private async retryExternalWebhook(
    data: FailedApiCallRetryJobData,
    job: Job<FailedApiCallRetryJobData>,
  ): Promise<any> {
    await job.progress(40);

    const { apiEndpoint, httpMethod, requestPayload } = data;

    const config: any = {
      method: httpMethod.toLowerCase(),
      url: apiEndpoint,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OneClickTag/1.0',
      },
    };

    if (requestPayload && ['post', 'put', 'patch'].includes(config.method)) {
      config.data = requestPayload;
    }

    await job.progress(70);

    const response = await firstValueFrom(this.httpService.request(config));

    return {
      statusCode: response.status,
      headers: response.headers,
      data: response.data,
    };
  }

  private async retryGenericHttpCall(
    data: FailedApiCallRetryJobData,
    job: Job<FailedApiCallRetryJobData>,
  ): Promise<any> {
    await job.progress(40);

    const { apiEndpoint, httpMethod, requestPayload, originalJobData } = data;

    const config: any = {
      method: httpMethod.toLowerCase(),
      url: apiEndpoint,
      timeout: originalJobData.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...originalJobData.headers,
      },
    };

    if (requestPayload && ['post', 'put', 'patch'].includes(config.method)) {
      config.data = requestPayload;
    }

    if (originalJobData.params) {
      config.params = originalJobData.params;
    }

    await job.progress(70);

    const response = await firstValueFrom(this.httpService.request(config));

    return {
      statusCode: response.status,
      headers: response.headers,
      data: response.data,
    };
  }

  private calculateRetryDelay(strategy: FailedApiCallRetryJobData['retryStrategy'], retryCount: number): number {
    if (!strategy.exponentialBackoff) {
      return strategy.baseDelayMs;
    }

    const delay = strategy.baseDelayMs * Math.pow(strategy.backoffMultiplier, retryCount);
    return Math.min(delay, strategy.maxDelayMs);
  }

  private shouldRetryAgain(error: any, data: FailedApiCallRetryJobData): boolean {
    const currentRetries = (data.retryCount || 0) + 1;
    
    // Check max retries
    if (currentRetries >= (data.maxRetries || 3)) {
      return false;
    }

    // Check if error is retryable
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'QUOTA_ERROR',
      'RESOURCE_EXHAUSTED',
      'RATE_LIMIT_EXCEEDED',
    ];

    const isRetryableError = retryableErrors.some(err => 
      error.message?.includes(err) || error.code?.includes(err)
    );

    // Check HTTP status codes that are retryable
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const isRetryableStatus = error.response?.status && 
      retryableStatusCodes.includes(error.response.status);

    return isRetryableError || isRetryableStatus;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}