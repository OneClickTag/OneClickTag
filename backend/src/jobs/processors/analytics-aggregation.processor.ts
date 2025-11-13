import { Process, Processor } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GoogleAdsService } from '../../modules/google-integration/services/google-ads.service';
import { TenantContextService } from '../../modules/tenant/services/tenant-context.service';
import { TenantCacheService } from '../../modules/tenant/services/tenant-cache.service';
import { AnalyticsAggregationJobData, JobQueues, JobProgress, JobResult } from '../interfaces/job.interface';

@Processor(JobQueues.ANALYTICS)
@Injectable()
export class AnalyticsAggregationProcessor {
  private readonly logger = new Logger(AnalyticsAggregationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private googleAdsService: GoogleAdsService,
    private cacheService: TenantCacheService,
  ) {}

  @Process()
  async processAnalyticsAggregation(job: Job<AnalyticsAggregationJobData>): Promise<JobResult> {
    const { data } = job;
    this.logger.log(`Processing analytics aggregation job ${job.id} for tenant ${data.tenantId}`);

    // Set tenant context
    TenantContextService.setTenantId(data.tenantId);

    try {
      await job.progress(5);

      const aggregationResult = await this.performAggregation(data, job);

      await job.progress(90);

      // Store aggregated data
      await this.storeAggregatedData(data, aggregationResult);

      await job.progress(100);

      this.logger.log(`Analytics aggregation job ${job.id} completed successfully`);

      return {
        success: true,
        data: aggregationResult,
        summary: {
          totalProcessed: aggregationResult.totalRecords || 0,
          successful: 1,
          failed: 0,
          duration: Date.now() - job.timestamp,
        },
      };
    } catch (error) {
      this.logger.error(`Analytics aggregation job ${job.id} failed: ${error.message}`, error.stack);

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
          totalProcessed: 0,
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

  private async performAggregation(
    data: AnalyticsAggregationJobData,
    job: Job<AnalyticsAggregationJobData>,
  ): Promise<any> {
    const { aggregationType, dateRange, metrics, dimensions, customerIds, adsAccountIds, campaignIds, filters } = data;

    await job.progress(10);

    // Get list of customers and ads accounts to process
    const customersToProcess = await this.getCustomersToProcess(customerIds);
    const adsAccountsToProcess = await this.getAdsAccountsToProcess(customersToProcess, adsAccountIds);

    await job.progress(20);

    const aggregatedData = {
      aggregationType,
      dateRange,
      metrics: {},
      dimensions: {},
      totalRecords: 0,
      processedCustomers: customersToProcess.length,
      processedAdsAccounts: adsAccountsToProcess.length,
      generatedAt: new Date(),
    };

    let processedAccounts = 0;

    // Process each ads account
    for (const adsAccount of adsAccountsToProcess) {
      try {
        await job.progress(20 + (processedAccounts / adsAccountsToProcess.length) * 60);

        const accountData = await this.aggregateAccountData(
          adsAccount.customerId,
          adsAccount.id,
          data,
        );

        // Merge account data into aggregated results
        this.mergeAccountData(aggregatedData, accountData);

        processedAccounts++;
      } catch (error) {
        this.logger.warn(`Failed to aggregate data for account ${adsAccount.id}: ${error.message}`);
        // Continue with other accounts
      }
    }

    await job.progress(85);

    // Calculate final aggregations
    this.calculateFinalAggregations(aggregatedData);

    return aggregatedData;
  }

  private async getCustomersToProcess(customerIds?: string[]): Promise<any[]> {
    if (customerIds && customerIds.length > 0) {
      return this.prisma.tenantAware.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, email: true, fullName: true },
      });
    }

    // Get all active customers for the tenant
    return this.prisma.tenantAware.customer.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, email: true, fullName: true },
    });
  }

  private async getAdsAccountsToProcess(customers: any[], adsAccountIds?: string[]): Promise<any[]> {
    const customerIds = customers.map(c => c.id);

    let whereClause: any = {
      customerId: { in: customerIds },
    };

    if (adsAccountIds && adsAccountIds.length > 0) {
      whereClause.id = { in: adsAccountIds };
    }

    return this.prisma.tenantAware.googleAdsAccount.findMany({
      where: whereClause,
      select: {
        id: true,
        customerId: true,
        accountId: true,
        accountName: true,
      },
    });
  }

  private async aggregateAccountData(
    customerId: string,
    adsAccountId: string,
    data: AnalyticsAggregationJobData,
  ): Promise<any> {
    const { dateRange, metrics, dimensions, campaignIds, filters } = data;

    // Build GAQL query for metrics
    let query = `
      SELECT 
        ${metrics.map(m => `metrics.${m}`).join(', ')}
    `;

    if (dimensions.length > 0) {
      query += `, ${dimensions.map(d => `${d}`).join(', ')}`;
    }

    query += ` FROM campaign`;

    // Add date filter
    if (dateRange.startDate && dateRange.endDate) {
      query += ` WHERE segments.date BETWEEN "${dateRange.startDate}" AND "${dateRange.endDate}"`;
    }

    // Add campaign filter if specified
    if (campaignIds && campaignIds.length > 0) {
      const campaignFilter = campaignIds.map(id => `campaign.id = ${id}`).join(' OR ');
      query += query.includes('WHERE') ? ` AND (${campaignFilter})` : ` WHERE (${campaignFilter})`;
    }

    // Add custom filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        const filterClause = `${key} = "${value}"`;
        query += query.includes('WHERE') ? ` AND ${filterClause}` : ` WHERE ${filterClause}`;
      });
    }

    query += ` ORDER BY segments.date`;

    // Execute query
    const results = await this.googleAdsService.executeQuery(customerId, adsAccountId, { query });

    return {
      customerId,
      adsAccountId,
      results,
      recordCount: results.length,
    };
  }

  private mergeAccountData(aggregatedData: any, accountData: any): void {
    aggregatedData.totalRecords += accountData.recordCount;

    // Aggregate metrics
    for (const result of accountData.results) {
      for (const [metricKey, metricValue] of Object.entries(result.metrics || {})) {
        if (!aggregatedData.metrics[metricKey]) {
          aggregatedData.metrics[metricKey] = {
            total: 0,
            average: 0,
            min: Number.MAX_VALUE,
            max: Number.MIN_VALUE,
            count: 0,
          };
        }

        const numValue = Number(metricValue) || 0;
        aggregatedData.metrics[metricKey].total += numValue;
        aggregatedData.metrics[metricKey].count += 1;
        aggregatedData.metrics[metricKey].min = Math.min(aggregatedData.metrics[metricKey].min, numValue);
        aggregatedData.metrics[metricKey].max = Math.max(aggregatedData.metrics[metricKey].max, numValue);
      }

      // Aggregate dimensions
      for (const [dimKey, dimValue] of Object.entries(result)) {
        if (dimKey !== 'metrics' && dimValue !== undefined) {
          if (!aggregatedData.dimensions[dimKey]) {
            aggregatedData.dimensions[dimKey] = {};
          }

          const dimValueStr = String(dimValue);
          aggregatedData.dimensions[dimKey][dimValueStr] = 
            (aggregatedData.dimensions[dimKey][dimValueStr] || 0) + 1;
        }
      }
    }
  }

  private calculateFinalAggregations(aggregatedData: any): void {
    // Calculate averages for metrics
    for (const metricKey of Object.keys(aggregatedData.metrics)) {
      const metric = aggregatedData.metrics[metricKey];
      if (metric.count > 0) {
        metric.average = metric.total / metric.count;
      }
      
      // Clean up infinity values
      if (metric.min === Number.MAX_VALUE) metric.min = 0;
      if (metric.max === Number.MIN_VALUE) metric.max = 0;
    }

    // Sort dimension values by frequency
    for (const dimKey of Object.keys(aggregatedData.dimensions)) {
      const dimension = aggregatedData.dimensions[dimKey];
      aggregatedData.dimensions[dimKey] = Object.fromEntries(
        Object.entries(dimension).sort(([,a], [,b]) => (b as number) - (a as number))
      );
    }
  }

  private async storeAggregatedData(
    data: AnalyticsAggregationJobData,
    aggregationResult: any,
  ): Promise<void> {
    const cacheKey = `analytics:${data.aggregationType.toLowerCase()}:${data.tenantId}:${data.dateRange.startDate}:${data.dateRange.endDate}`;
    
    // Store in cache for quick retrieval
    await this.cacheService.set(
      cacheKey,
      aggregationResult,
      { ttl: this.getCacheTTL(data.aggregationType) },
    );

    // Also store in database for historical analysis
    await this.prisma.$executeRaw`
      INSERT INTO analytics_aggregations (
        tenant_id,
        aggregation_type,
        date_range_start,
        date_range_end,
        metrics,
        dimensions,
        total_records,
        processed_customers,
        processed_ads_accounts,
        generated_at,
        data
      ) VALUES (
        ${data.tenantId},
        ${data.aggregationType},
        ${new Date(data.dateRange.startDate)},
        ${new Date(data.dateRange.endDate)},
        ${JSON.stringify(data.metrics)},
        ${JSON.stringify(data.dimensions)},
        ${aggregationResult.totalRecords},
        ${aggregationResult.processedCustomers},
        ${aggregationResult.processedAdsAccounts},
        ${aggregationResult.generatedAt},
        ${JSON.stringify(aggregationResult)}
      )
      ON CONFLICT (tenant_id, aggregation_type, date_range_start, date_range_end)
      DO UPDATE SET
        metrics = EXCLUDED.metrics,
        dimensions = EXCLUDED.dimensions,
        total_records = EXCLUDED.total_records,
        processed_customers = EXCLUDED.processed_customers,
        processed_ads_accounts = EXCLUDED.processed_ads_accounts,
        generated_at = EXCLUDED.generated_at,
        data = EXCLUDED.data
    `;
  }

  private getCacheTTL(aggregationType: string): number {
    switch (aggregationType) {
      case 'DAILY':
        return 3600; // 1 hour
      case 'WEEKLY':
        return 21600; // 6 hours
      case 'MONTHLY':
        return 86400; // 24 hours
      default:
        return 3600;
    }
  }
}