import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { TenantCacheService } from '../../modules/tenant/services/tenant-cache.service';
import {
  JobQueues,
  JobStatus,
  QueueStats,
  JobMonitoringData,
  QueueJobData,
  GTMSyncJobData,
  BulkCustomerImportJobData,
  FailedApiCallRetryJobData,
  AnalyticsAggregationJobData,
} from '../interfaces/job.interface';

@Injectable()
export class JobMonitoringService {
  private readonly logger = new Logger(JobMonitoringService.name);

  constructor(
    @InjectQueue(JobQueues.GTM_SYNC) private gtmSyncQueue: Queue<GTMSyncJobData>,
    @InjectQueue(JobQueues.BULK_IMPORT) private bulkImportQueue: Queue<BulkCustomerImportJobData>,
    @InjectQueue(JobQueues.API_RETRY) private apiRetryQueue: Queue<FailedApiCallRetryJobData>,
    @InjectQueue(JobQueues.ANALYTICS) private analyticsQueue: Queue<AnalyticsAggregationJobData>,
    private cacheService: TenantCacheService,
  ) {}

  /**
   * Get queue statistics for all queues
   */
  async getAllQueueStats(): Promise<QueueStats[]> {
    const queues = [
      { name: JobQueues.GTM_SYNC, queue: this.gtmSyncQueue },
      { name: JobQueues.BULK_IMPORT, queue: this.bulkImportQueue },
      { name: JobQueues.API_RETRY, queue: this.apiRetryQueue },
      { name: JobQueues.ANALYTICS, queue: this.analyticsQueue },
    ];

    const stats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);

        return {
          queueName: name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          paused: 0, // paused jobs not supported in current Bull version
          total: waiting.length + active.length + completed.length + failed.length + delayed.length,
        };
      }),
    );

    return stats;
  }

  /**
   * Get statistics for a specific queue
   */
  async getQueueStats(queueName: JobQueues): Promise<QueueStats> {
    const queue = this.getQueueByName(queueName);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: 0, // paused jobs not supported in current Bull version
      total: waiting.length + active.length + completed.length + failed.length + delayed.length,
    };
  }

  /**
   * Get jobs for a specific queue with filtering and pagination
   */
  async getQueueJobs(
    queueName: JobQueues,
    status?: JobStatus,
    limit = 50,
    offset = 0,
  ): Promise<JobMonitoringData[]> {
    const queue = this.getQueueByName(queueName);
    let jobs: Job[] = [];

    switch (status) {
      case JobStatus.WAITING:
        jobs = await queue.getWaiting(offset, offset + limit - 1);
        break;
      case JobStatus.ACTIVE:
        jobs = await queue.getActive(offset, offset + limit - 1);
        break;
      case JobStatus.COMPLETED:
        jobs = await queue.getCompleted(offset, offset + limit - 1);
        break;
      case JobStatus.FAILED:
        jobs = await queue.getFailed(offset, offset + limit - 1);
        break;
      case JobStatus.DELAYED:
        jobs = await queue.getDelayed(offset, offset + limit - 1);
        break;
      case JobStatus.PAUSED:
        jobs = []; // paused jobs not supported in current Bull version
        break;
      default:
        // Get all jobs
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed, ...delayed]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(offset, offset + limit);
    }

    return jobs.map(job => this.mapJobToMonitoringData(job, queueName));
  }

  /**
   * Get a specific job by ID and queue
   */
  async getJob(queueName: JobQueues, jobId: string): Promise<JobMonitoringData | null> {
    const queue = this.getQueueByName(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return this.mapJobToMonitoringData(job, queueName);
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
      this.logger.log(`Job ${jobId} cancelled from queue ${queueName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: JobQueues, jobId: string): Promise<boolean> {
    try {
      const queue = this.getQueueByName(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        return false;
      }

      await job.retry();
      this.logger.log(`Job ${jobId} retried in queue ${queueName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get queue health status
   */
  async getQueueHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    stats: QueueStats[];
  }> {
    const stats = await this.getAllQueueStats();
    const issues: string[] = [];
    let healthy = true;

    for (const stat of stats) {
      // Check for high failure rates
      if (stat.failed > 0 && stat.total > 0) {
        const failureRate = stat.failed / stat.total;
        if (failureRate > 0.1) { // More than 10% failure rate
          issues.push(`High failure rate in ${stat.queueName}: ${(failureRate * 100).toFixed(1)}%`);
          healthy = false;
        }
      }

      // Check for stuck jobs (too many active for too long)
      if (stat.active > 10) {
        issues.push(`Many active jobs in ${stat.queueName}: ${stat.active}`);
      }

      // Check for queue backlog
      if (stat.waiting > 100) {
        issues.push(`Large backlog in ${stat.queueName}: ${stat.waiting} waiting jobs`);
      }
    }

    return {
      healthy,
      issues,
      stats,
    };
  }

  /**
   * Clean old completed jobs
   */
  async cleanOldJobs(olderThanHours = 24): Promise<{ cleaned: number; queues: string[] }> {
    const queues = [
      { name: JobQueues.GTM_SYNC, queue: this.gtmSyncQueue },
      { name: JobQueues.BULK_IMPORT, queue: this.bulkImportQueue },
      { name: JobQueues.API_RETRY, queue: this.apiRetryQueue },
      { name: JobQueues.ANALYTICS, queue: this.analyticsQueue },
    ];

    let totalCleaned = 0;
    const cleanedQueues: string[] = [];

    for (const { name, queue } of queues) {
      try {
        const cleanedJobs = await queue.clean(olderThanHours * 60 * 60 * 1000, 'completed');
        const cleanedCount = Array.isArray(cleanedJobs) ? cleanedJobs.length : cleanedJobs;
        if (cleanedCount > 0) {
          totalCleaned += cleanedCount;
          cleanedQueues.push(name);
          this.logger.log(`Cleaned ${cleanedCount} old jobs from ${name} queue`);
        }
      } catch (error) {
        this.logger.error(`Failed to clean jobs from ${name}: ${error.message}`);
      }
    }

    return {
      cleaned: totalCleaned,
      queues: cleanedQueues,
    };
  }

  /**
   * Get jobs for a specific tenant
   */
  async getTenantJobs(tenantId: string, limit = 50): Promise<JobMonitoringData[]> {
    const allJobs: JobMonitoringData[] = [];

    const queues = [JobQueues.GTM_SYNC, JobQueues.BULK_IMPORT, JobQueues.API_RETRY, JobQueues.ANALYTICS];

    for (const queueName of queues) {
      const jobs = await this.getQueueJobs(queueName, undefined, limit);
      const tenantJobs = jobs.filter(job => job.data.tenantId === tenantId);
      allJobs.push(...tenantJobs);
    }

    return allJobs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

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

  private mapJobToMonitoringData(job: Job, queueName: string): JobMonitoringData {
    return {
      id: job.id.toString(),
      name: job.name || 'unnamed',
      queue: queueName,
      status: this.getJobStatus(job),
      progress: {
        total: 100,
        completed: job.progress() as number || 0,
        failed: job.failedReason ? 1 : 0,
        percentage: job.progress() as number || 0,
      },
      data: job.data,
      result: job.returnvalue,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      delay: job.opts.delay || 0,
      priority: job.opts.priority || 0,
    };
  }

  private getJobStatus(job: Job): JobStatus {
    if (job.finishedOn && !job.failedReason) {
      return JobStatus.COMPLETED;
    }
    if (job.failedReason) {
      return JobStatus.FAILED;
    }
    if (job.processedOn) {
      return JobStatus.ACTIVE;
    }
    if (job.opts.delay && job.opts.delay > Date.now()) {
      return JobStatus.DELAYED;
    }
    // Note: paused status not supported in current Bull version
    // if (job.opts.paused) {
    //   return JobStatus.PAUSED;
    // }
    return JobStatus.WAITING;
  }
}