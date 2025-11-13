import { Injectable, Logger } from '@nestjs/common';
import { SSEService } from './sse.service';
import {
  SSEEventType,
  JobProgressEventData,
  EventFilter,
} from '../interfaces/sse.interface';

@Injectable()
export class JobEventsService {
  private readonly logger = new Logger(JobEventsService.name);

  constructor(private readonly sseService: SSEService) {}

  /**
   * Emit job started event
   */
  async emitJobStarted(
    tenantId: string,
    jobId: string,
    jobType: string,
    queueName: string,
    jobData?: any,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting job started event: ${jobId} (${jobType}) for tenant: ${tenantId}`);

    const eventData: JobProgressEventData = {
      jobId,
      jobType,
      queueName,
      status: 'started',
      progress: {
        percentage: 0,
        currentStep: 'Starting...',
      },
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.JOB_STARTED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'job',
        action: 'started',
        jobType,
        queueName,
      },
    });

    this.logger.debug(`Job started event sent to ${sent} connections`);
  }

  /**
   * Emit job progress event
   */
  async emitJobProgress(
    tenantId: string,
    jobId: string,
    jobType: string,
    queueName: string,
    progress: {
      percentage: number;
      currentStep?: string;
      estimatedTimeRemaining?: number;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting job progress event: ${jobId} (${progress.percentage}%) for tenant: ${tenantId}`);

    const eventData: JobProgressEventData = {
      jobId,
      jobType,
      queueName,
      status: 'progress',
      progress,
    };

    // Send to all tenant connections
    const sentGeneral = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.JOB_PROGRESS,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'job',
        action: 'progress',
        jobType,
        queueName,
      },
    });

    // Also send with filtering for specific job watchers
    const jobFilter: EventFilter = {
      eventTypes: [SSEEventType.JOB_PROGRESS],
      jobTypes: [jobType],
    };

    const sentFiltered = this.sseService.sendEventWithFilter({
      event: SSEEventType.JOB_PROGRESS,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'job',
        action: 'progress',
        filtered: true,
      },
    }, jobFilter);

    this.logger.debug(`Job progress event sent to ${sentGeneral} general + ${sentFiltered} filtered connections`);
  }

  /**
   * Emit job completed event
   */
  async emitJobCompleted(
    tenantId: string,
    jobId: string,
    jobType: string,
    queueName: string,
    result?: any,
    duration?: number,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting job completed event: ${jobId} (${jobType}) for tenant: ${tenantId}`);

    const eventData: JobProgressEventData = {
      jobId,
      jobType,
      queueName,
      status: 'completed',
      progress: {
        percentage: 100,
        currentStep: 'Completed',
      },
      result,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.JOB_COMPLETED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'job',
        action: 'completed',
        jobType,
        queueName,
        duration,
        success: true,
      },
    });

    this.logger.debug(`Job completed event sent to ${sent} connections`);
  }

  /**
   * Emit job failed event
   */
  async emitJobFailed(
    tenantId: string,
    jobId: string,
    jobType: string,
    queueName: string,
    error: string,
    progress?: {
      percentage: number;
      currentStep?: string;
    },
    attempts?: number,
    maxAttempts?: number,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting job failed event: ${jobId} (${jobType}) for tenant: ${tenantId}`);

    const eventData: JobProgressEventData = {
      jobId,
      jobType,
      queueName,
      status: 'failed',
      progress: progress || {
        percentage: 0,
        currentStep: 'Failed',
      },
      error,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.JOB_FAILED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'job',
        action: 'failed',
        jobType,
        queueName,
        attempts,
        maxAttempts,
        success: false,
        retryable: attempts && maxAttempts ? attempts < maxAttempts : false,
      },
    });

    this.logger.debug(`Job failed event sent to ${sent} connections`);
  }

  /**
   * Emit batch job progress (for bulk operations)
   */
  async emitBatchJobProgress(
    tenantId: string,
    batchId: string,
    jobType: string,
    progress: {
      total: number;
      completed: number;
      failed: number;
      percentage: number;
      currentItem?: string;
      estimatedTimeRemaining?: number;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting batch job progress: ${batchId} (${jobType}) for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'job.batch.progress',
      data: {
        batchId,
        jobType,
        progress,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'job',
        action: 'batch_progress',
        jobType,
        batchId,
      },
    });

    this.logger.debug(`Batch job progress event sent to ${sent} connections`);
  }

  /**
   * Emit batch job completed
   */
  async emitBatchJobCompleted(
    tenantId: string,
    batchId: string,
    jobType: string,
    results: {
      total: number;
      successful: number;
      failed: number;
      duration: number;
      errors?: any[];
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting batch job completed: ${batchId} (${jobType}) for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'job.batch.completed',
      data: {
        batchId,
        jobType,
        results,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'job',
        action: 'batch_completed',
        jobType,
        batchId,
        success: results.failed === 0,
      },
    });

    this.logger.debug(`Batch job completed event sent to ${sent} connections`);
  }

  /**
   * Emit queue status update
   */
  async emitQueueStatus(
    tenantId: string,
    queueName: string,
    status: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      paused: boolean;
      health: 'healthy' | 'warning' | 'critical';
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting queue status update: ${queueName} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'queue.status',
      data: {
        queueName,
        status,
        triggeredBy,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'queue',
        action: 'status_update',
        queueName,
        health: status.health,
      },
    });

    this.logger.debug(`Queue status event sent to ${sent} connections`);
  }

  /**
   * Emit system maintenance notification
   */
  async emitSystemMaintenance(
    tenantId: string,
    maintenanceType: 'scheduled' | 'emergency' | 'completed',
    message: string,
    details: {
      startTime?: Date;
      endTime?: Date;
      affectedServices?: string[];
      severity?: 'low' | 'medium' | 'high';
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting system maintenance notification: ${maintenanceType} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.SYSTEM_MAINTENANCE,
      data: {
        maintenanceType,
        message,
        details,
        triggeredBy,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'system',
        action: 'maintenance',
        maintenanceType,
        severity: details.severity || 'medium',
      },
    });

    this.logger.debug(`System maintenance notification sent to ${sent} connections`);
  }

  /**
   * Emit system notification
   */
  async emitSystemNotification(
    tenantId: string,
    notificationType: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string,
    details?: {
      actionRequired?: boolean;
      actionUrl?: string;
      actionText?: string;
      dismissible?: boolean;
      expiresAt?: Date;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting system notification: ${notificationType} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.SYSTEM_NOTIFICATION,
      data: {
        notificationType,
        title,
        message,
        details,
        triggeredBy,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'system',
        action: 'notification',
        notificationType,
      },
    });

    this.logger.debug(`System notification sent to ${sent} connections`);
  }
}