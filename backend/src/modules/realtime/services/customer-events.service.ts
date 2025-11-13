import { Injectable, Logger } from '@nestjs/common';
import { SSEService } from './sse.service';
import {
  SSEEventType,
  CustomerUpdateEventData,
} from '../interfaces/sse.interface';

@Injectable()
export class CustomerEventsService {
  private readonly logger = new Logger(CustomerEventsService.name);

  constructor(private readonly sseService: SSEService) {}

  /**
   * Emit customer created event
   */
  async emitCustomerCreated(
    tenantId: string,
    customerId: string,
    customer: any,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting customer created event: ${customerId} for tenant: ${tenantId}`);

    const eventData: CustomerUpdateEventData = {
      customerId,
      action: 'created',
      customer,
      triggeredBy,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CUSTOMER_CREATED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'created',
      },
    });

    this.logger.debug(`Customer created event sent to ${sent} connections`);
  }

  /**
   * Emit customer updated event
   */
  async emitCustomerUpdated(
    tenantId: string,
    customerId: string,
    customer: any,
    changes: Record<string, any>,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting customer updated event: ${customerId} for tenant: ${tenantId}`);

    const eventData: CustomerUpdateEventData = {
      customerId,
      action: 'updated',
      customer,
      changes,
      triggeredBy,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CUSTOMER_UPDATED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'updated',
        changedFields: Object.keys(changes),
      },
    });

    this.logger.debug(`Customer updated event sent to ${sent} connections`);
  }

  /**
   * Emit customer deleted event
   */
  async emitCustomerDeleted(
    tenantId: string,
    customerId: string,
    customer?: any,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting customer deleted event: ${customerId} for tenant: ${tenantId}`);

    const eventData: CustomerUpdateEventData = {
      customerId,
      action: 'deleted',
      customer,
      triggeredBy,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CUSTOMER_DELETED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'deleted',
      },
    });

    this.logger.debug(`Customer deleted event sent to ${sent} connections`);
  }

  /**
   * Emit bulk import progress event
   */
  async emitBulkImportProgress(
    tenantId: string,
    importId: string,
    progress: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
      percentage: number;
      currentBatch?: number;
      totalBatches?: number;
      estimatedTimeRemaining?: number;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting bulk import progress event: ${importId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CUSTOMER_BULK_IMPORT_PROGRESS,
      data: {
        importId,
        progress,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'bulk_import_progress',
        importId,
      },
    });

    this.logger.debug(`Bulk import progress event sent to ${sent} connections`);
  }

  /**
   * Emit bulk import completed event
   */
  async emitBulkImportCompleted(
    tenantId: string,
    importId: string,
    results: {
      total: number;
      successful: number;
      failed: number;
      skipped: number;
      duration: number;
      errors?: any[];
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting bulk import completed event: ${importId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CUSTOMER_BULK_IMPORT_COMPLETED,
      data: {
        importId,
        results,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'bulk_import_completed',
        importId,
        success: results.failed === 0,
      },
    });

    this.logger.debug(`Bulk import completed event sent to ${sent} connections`);
  }

  /**
   * Emit customer list refresh event (for when filters or sorting changes)
   */
  async emitCustomerListRefresh(
    tenantId: string,
    reason: string,
    affectedCount?: number,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting customer list refresh event for tenant: ${tenantId}, reason: ${reason}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'customer.list.refresh',
      data: {
        reason,
        affectedCount,
        triggeredBy,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'list_refresh',
      },
    });

    this.logger.debug(`Customer list refresh event sent to ${sent} connections`);
  }

  /**
   * Emit customer export progress event
   */
  async emitCustomerExportProgress(
    tenantId: string,
    exportId: string,
    progress: {
      total: number;
      processed: number;
      percentage: number;
      estimatedTimeRemaining?: number;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting customer export progress event: ${exportId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'customer.export.progress',
      data: {
        exportId,
        progress,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'export_progress',
        exportId,
      },
    });

    this.logger.debug(`Customer export progress event sent to ${sent} connections`);
  }

  /**
   * Emit customer export completed event
   */
  async emitCustomerExportCompleted(
    tenantId: string,
    exportId: string,
    results: {
      total: number;
      exported: number;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      duration: number;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting customer export completed event: ${exportId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'customer.export.completed',
      data: {
        exportId,
        results,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'export_completed',
        exportId,
      },
    });

    this.logger.debug(`Customer export completed event sent to ${sent} connections`);
  }

  /**
   * Emit customer statistics updated event
   */
  async emitCustomerStatsUpdated(
    tenantId: string,
    stats: {
      total: number;
      active: number;
      inactive: number;
      withGoogleAccount: number;
      recentlyCreated: number;
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting customer stats updated event for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'customer.stats.updated',
      data: {
        stats,
        triggeredBy,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'customer',
        action: 'stats_updated',
      },
    });

    this.logger.debug(`Customer stats updated event sent to ${sent} connections`);
  }
}