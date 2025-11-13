import { Injectable, Logger } from '@nestjs/common';
import { SSEService } from './sse.service';
import {
  SSEEventType,
  GTMSyncProgressEventData,
  EventFilter,
} from '../interfaces/sse.interface';

@Injectable()
export class GTMEventsService {
  private readonly logger = new Logger(GTMEventsService.name);

  constructor(private readonly sseService: SSEService) {}

  /**
   * Emit GTM sync started event
   */
  async emitGTMSyncStarted(
    tenantId: string,
    jobId: string,
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    gtmContainerId: string,
    syncType: 'CREATE' | 'UPDATE' | 'DELETE',
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting GTM sync started event: ${jobId} for tenant: ${tenantId}`);

    const eventData: GTMSyncProgressEventData = {
      jobId,
      customerId,
      adsAccountId,
      conversionActionId,
      gtmContainerId,
      syncType,
      progress: {
        percentage: 0,
        currentStep: 'Initializing',
        totalSteps: 5,
        completedSteps: 0,
      },
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.GTM_SYNC_STARTED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'sync_started',
        jobId,
        customerId,
        adsAccountId,
        syncType,
      },
    });

    this.logger.debug(`GTM sync started event sent to ${sent} connections`);
  }

  /**
   * Emit GTM sync progress event
   */
  async emitGTMSyncProgress(
    tenantId: string,
    jobId: string,
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    gtmContainerId: string,
    syncType: 'CREATE' | 'UPDATE' | 'DELETE',
    progress: {
      percentage: number;
      currentStep?: string;
      totalSteps?: number;
      completedSteps?: number;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting GTM sync progress event: ${jobId} (${progress.percentage}%) for tenant: ${tenantId}`);

    const eventData: GTMSyncProgressEventData = {
      jobId,
      customerId,
      adsAccountId,
      conversionActionId,
      gtmContainerId,
      syncType,
      progress,
    };

    // Send to all tenant connections
    const sentGeneral = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.GTM_SYNC_PROGRESS,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'sync_progress',
        jobId,
        customerId,
        adsAccountId,
        syncType,
      },
    });

    // Also send with filtering for specific job watchers
    const jobFilter: EventFilter = {
      eventTypes: [SSEEventType.GTM_SYNC_PROGRESS],
      customerId,
      adsAccountId,
    };

    const sentFiltered = this.sseService.sendEventWithFilter({
      event: SSEEventType.GTM_SYNC_PROGRESS,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'sync_progress',
        filtered: true,
      },
    }, jobFilter);

    this.logger.debug(`GTM sync progress event sent to ${sentGeneral} general + ${sentFiltered} filtered connections`);
  }

  /**
   * Emit GTM sync completed event
   */
  async emitGTMSyncCompleted(
    tenantId: string,
    jobId: string,
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    gtmContainerId: string,
    syncType: 'CREATE' | 'UPDATE' | 'DELETE',
    result: any,
    duration?: number,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting GTM sync completed event: ${jobId} for tenant: ${tenantId}`);

    const eventData: GTMSyncProgressEventData = {
      jobId,
      customerId,
      adsAccountId,
      conversionActionId,
      gtmContainerId,
      syncType,
      progress: {
        percentage: 100,
        currentStep: 'Completed',
        totalSteps: 5,
        completedSteps: 5,
      },
      result,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.GTM_SYNC_COMPLETED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'sync_completed',
        jobId,
        customerId,
        adsAccountId,
        syncType,
        duration,
        success: true,
      },
    });

    this.logger.debug(`GTM sync completed event sent to ${sent} connections`);
  }

  /**
   * Emit GTM sync failed event
   */
  async emitGTMSyncFailed(
    tenantId: string,
    jobId: string,
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    gtmContainerId: string,
    syncType: 'CREATE' | 'UPDATE' | 'DELETE',
    error: string,
    progress?: {
      percentage: number;
      currentStep?: string;
      totalSteps?: number;
      completedSteps?: number;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting GTM sync failed event: ${jobId} for tenant: ${tenantId}`);

    const eventData: GTMSyncProgressEventData = {
      jobId,
      customerId,
      adsAccountId,
      conversionActionId,
      gtmContainerId,
      syncType,
      progress: progress || {
        percentage: 0,
        currentStep: 'Failed',
      },
      error,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.GTM_SYNC_FAILED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'sync_failed',
        jobId,
        customerId,
        adsAccountId,
        syncType,
        success: false,
        error: error,
      },
    });

    this.logger.debug(`GTM sync failed event sent to ${sent} connections`);
  }

  /**
   * Emit GTM tag created event
   */
  async emitGTMTagCreated(
    tenantId: string,
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    gtmContainerId: string,
    tagData: {
      gtmTagId: string;
      tagName: string;
      conversionId: string;
      conversionLabel: string;
      triggerIds?: string[];
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting GTM tag created event: ${tagData.gtmTagId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.GTM_TAG_CREATED,
      data: {
        customerId,
        adsAccountId,
        conversionActionId,
        gtmContainerId,
        tagData,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'tag_created',
        customerId,
        adsAccountId,
        gtmTagId: tagData.gtmTagId,
      },
    });

    this.logger.debug(`GTM tag created event sent to ${sent} connections`);
  }

  /**
   * Emit GTM tag updated event
   */
  async emitGTMTagUpdated(
    tenantId: string,
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    gtmContainerId: string,
    tagData: {
      gtmTagId: string;
      tagName?: string;
      updatedFields: string[];
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting GTM tag updated event: ${tagData.gtmTagId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.GTM_TAG_UPDATED,
      data: {
        customerId,
        adsAccountId,
        conversionActionId,
        gtmContainerId,
        tagData,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'tag_updated',
        customerId,
        adsAccountId,
        gtmTagId: tagData.gtmTagId,
        updatedFields: tagData.updatedFields,
      },
    });

    this.logger.debug(`GTM tag updated event sent to ${sent} connections`);
  }

  /**
   * Emit GTM tag deleted event
   */
  async emitGTMTagDeleted(
    tenantId: string,
    customerId: string,
    adsAccountId: string,
    conversionActionId: string,
    gtmContainerId: string,
    tagData: {
      gtmTagId: string;
      tagName?: string;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting GTM tag deleted event: ${tagData.gtmTagId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.GTM_TAG_DELETED,
      data: {
        customerId,
        adsAccountId,
        conversionActionId,
        gtmContainerId,
        tagData,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'tag_deleted',
        customerId,
        adsAccountId,
        gtmTagId: tagData.gtmTagId,
      },
    });

    this.logger.debug(`GTM tag deleted event sent to ${sent} connections`);
  }

  /**
   * Emit GTM container status update
   */
  async emitGTMContainerStatus(
    tenantId: string,
    customerId: string,
    gtmContainerId: string,
    status: 'connected' | 'disconnected' | 'sync_pending' | 'sync_failed',
    details?: {
      lastSyncAt?: Date;
      tagCount?: number;
      triggerCount?: number;
      error?: string;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting GTM container status event: ${gtmContainerId} (${status}) for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'gtm.container.status',
      data: {
        customerId,
        gtmContainerId,
        status,
        details,
        triggeredBy,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: 'container_status',
        customerId,
        gtmContainerId,
        status,
      },
    });

    this.logger.debug(`GTM container status event sent to ${sent} connections`);
  }

  /**
   * Emit bulk GTM operations progress
   */
  async emitBulkGTMProgress(
    tenantId: string,
    operationId: string,
    operationType: 'sync_all' | 'create_tags' | 'update_tags' | 'delete_tags',
    progress: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
      percentage: number;
      currentItem?: string;
      estimatedTimeRemaining?: number;
    },
    customerId?: string,
    gtmContainerId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting bulk GTM ${operationType} progress: ${operationId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'gtm.bulk.progress',
      data: {
        operationId,
        operationType,
        progress,
        customerId,
        gtmContainerId,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: `bulk_${operationType}_progress`,
        operationId,
      },
    });

    this.logger.debug(`Bulk GTM ${operationType} progress event sent to ${sent} connections`);
  }

  /**
   * Emit bulk GTM operations completed
   */
  async emitBulkGTMCompleted(
    tenantId: string,
    operationId: string,
    operationType: 'sync_all' | 'create_tags' | 'update_tags' | 'delete_tags',
    results: {
      total: number;
      successful: number;
      failed: number;
      duration: number;
      errors?: any[];
      details?: any;
    },
    customerId?: string,
    gtmContainerId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting bulk GTM ${operationType} completed: ${operationId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'gtm.bulk.completed',
      data: {
        operationId,
        operationType,
        results,
        customerId,
        gtmContainerId,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'gtm',
        action: `bulk_${operationType}_completed`,
        operationId,
        success: results.failed === 0,
      },
    });

    this.logger.debug(`Bulk GTM ${operationType} completed event sent to ${sent} connections`);
  }
}