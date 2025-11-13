import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import {
  JobQueues,
  GTMSyncJobData,
  BulkCustomerImportJobData,
  FailedApiCallRetryJobData,
  AnalyticsAggregationJobData,
} from '../interfaces/job.interface';

@Injectable()
export class JobSchedulerService {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @InjectQueue(JobQueues.GTM_SYNC) private gtmSyncQueue: Queue<GTMSyncJobData>,
    @InjectQueue(JobQueues.BULK_IMPORT) private bulkImportQueue: Queue<BulkCustomerImportJobData>,
    @InjectQueue(JobQueues.API_RETRY) private apiRetryQueue: Queue<FailedApiCallRetryJobData>,
    @InjectQueue(JobQueues.ANALYTICS) private analyticsQueue: Queue<AnalyticsAggregationJobData>,
  ) {}

  /**
   * Schedule GTM sync job
   */
  async scheduleGTMSync(
    data: GTMSyncJobData,
    options: JobOptions = {},
  ): Promise<string> {
    const job = await this.gtmSyncQueue.add(data, {
      priority: 10,
      delay: 0,
      ...options,
    });

    this.logger.log(`Scheduled GTM sync job ${job.id} for customer ${data.customerId}`);
    return job.id.toString();
  }

  /**
   * Schedule bulk customer import job
   */
  async scheduleBulkCustomerImport(
    data: BulkCustomerImportJobData,
    options: JobOptions = {},
  ): Promise<string> {
    const job = await this.bulkImportQueue.add(data, {
      priority: 5,
      delay: 0,
      ...options,
    });

    this.logger.log(`Scheduled bulk import job ${job.id} for ${data.customers.length} customers`);
    return job.id.toString();
  }

  /**
   * Schedule API retry job
   */
  async scheduleApiRetry(
    data: FailedApiCallRetryJobData,
    options: JobOptions = {},
  ): Promise<string> {
    // Calculate delay based on retry strategy
    const delay = this.calculateRetryDelay(data.retryStrategy, data.retryCount || 0);

    const job = await this.apiRetryQueue.add(data, {
      priority: 15,
      delay,
      ...options,
    });

    this.logger.log(`Scheduled API retry job ${job.id} for ${data.originalJobType} (retry ${data.retryCount})`);
    return job.id.toString();
  }

  /**
   * Schedule analytics aggregation job
   */
  async scheduleAnalyticsAggregation(
    data: AnalyticsAggregationJobData,
    options: JobOptions = {},
  ): Promise<string> {
    const job = await this.analyticsQueue.add(data, {
      priority: 3,
      delay: 0,
      ...options,
    });

    this.logger.log(`Scheduled analytics aggregation job ${job.id} for ${data.aggregationType}`);
    return job.id.toString();
  }

  /**
   * Schedule recurring analytics aggregation
   */
  async scheduleRecurringAnalytics(
    data: Omit<AnalyticsAggregationJobData, 'dateRange'>,
    cronPattern: string,
  ): Promise<void> {
    const jobName = `analytics-${data.aggregationType.toLowerCase()}-${data.tenantId}`;

    // Remove existing recurring job if any
    await this.analyticsQueue.removeRepeatable(jobName, { cron: cronPattern });

    // Add new recurring job
    await this.analyticsQueue.add(
      {
        ...data,
        dateRange: this.generateDateRange(data.aggregationType),
      },
      {
        repeat: { cron: cronPattern },
        jobId: jobName,
        removeOnComplete: 5,
        removeOnFail: 2,
      },
    );

    this.logger.log(`Scheduled recurring analytics job: ${jobName} with pattern: ${cronPattern}`);
  }

  /**
   * Cancel a job
   */
  async cancelJob(queueName: JobQueues, jobId: string): Promise<boolean> {
    try {
      const queue = this.getQueueByName(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        return false;
      }

      await job.remove();
      this.logger.log(`Cancelled job ${jobId} from queue ${queueName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: JobQueues): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.log(`Paused queue: ${queueName}`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: JobQueues): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`Resumed queue: ${queueName}`);
  }

  /**
   * Get queue by name
   */
  private getQueueByName(queueName: JobQueues): Queue {
    switch (queueName) {
      case JobQueues.GTM_SYNC:
        return this.gtmSyncQueue;
      case JobQueues.BULK_IMPORT:
        return this.bulkImportQueue;
      case JobQueues.API_RETRY:
        return this.apiRetryQueue;
      case JobQueues.ANALYTICS:
        return this.analyticsQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(strategy: FailedApiCallRetryJobData['retryStrategy'], retryCount: number): number {
    if (!strategy.exponentialBackoff) {
      return strategy.baseDelayMs;
    }

    const delay = strategy.baseDelayMs * Math.pow(strategy.backoffMultiplier, retryCount);
    return Math.min(delay, strategy.maxDelayMs);
  }

  /**
   * Generate date range for analytics aggregation
   */
  private generateDateRange(aggregationType: string): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate: Date;

    switch (aggregationType) {
      case 'DAILY':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'WEEKLY':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'MONTHLY':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  }
}