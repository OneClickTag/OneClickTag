import { Injectable, Logger } from '@nestjs/common';
import { SSEService } from './sse.service';
import { CustomerEventsService } from './customer-events.service';
import { CampaignEventsService } from './campaign-events.service';
import { GTMEventsService } from './gtm-events.service';
import { ErrorEventsService } from './error-events.service';
import { JobEventsService } from './job-events.service';
import { TenantContextService } from '../../tenant/services/tenant-context.service';

/**
 * Unified service for emitting real-time events from any module
 * This service provides a simplified interface for other modules to emit SSE events
 */
@Injectable()
export class RealtimeEventService {
  private readonly logger = new Logger(RealtimeEventService.name);

  constructor(
    private readonly sseService: SSEService,
    private readonly customerEventsService: CustomerEventsService,
    private readonly campaignEventsService: CampaignEventsService,
    private readonly gtmEventsService: GTMEventsService,
    private readonly errorEventsService: ErrorEventsService,
    private readonly jobEventsService: JobEventsService,
  ) {}

  // Customer Events
  async customerCreated(customerId: string, customer: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.customerEventsService.emitCustomerCreated(tenantId, customerId, customer, triggeredBy);
    }
  }

  async customerUpdated(customerId: string, customer: any, changes: Record<string, any>, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.customerEventsService.emitCustomerUpdated(tenantId, customerId, customer, changes, triggeredBy);
    }
  }

  async customerDeleted(customerId: string, customer?: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.customerEventsService.emitCustomerDeleted(tenantId, customerId, customer, triggeredBy);
    }
  }

  async bulkImportProgress(importId: string, progress: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.customerEventsService.emitBulkImportProgress(tenantId, importId, progress, triggeredBy);
    }
  }

  async bulkImportCompleted(importId: string, results: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.customerEventsService.emitBulkImportCompleted(tenantId, importId, results, triggeredBy);
    }
  }

  // Campaign Events
  async campaignCreated(campaignId: string, adsAccountId: string, customerId: string, campaign: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.campaignEventsService.emitCampaignCreated(tenantId, campaignId, adsAccountId, customerId, campaign, triggeredBy);
    }
  }

  async campaignUpdated(campaignId: string, adsAccountId: string, customerId: string, campaign: any, changes?: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.campaignEventsService.emitCampaignUpdated(tenantId, campaignId, adsAccountId, customerId, campaign, changes, triggeredBy);
    }
  }

  async campaignStatusChanged(campaignId: string, adsAccountId: string, customerId: string, previousStatus: string, newStatus: string, campaign?: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.campaignEventsService.emitCampaignStatusChanged(tenantId, campaignId, adsAccountId, customerId, previousStatus, newStatus, campaign, triggeredBy);
    }
  }

  async campaignDeleted(campaignId: string, adsAccountId: string, customerId: string, campaign?: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.campaignEventsService.emitCampaignDeleted(tenantId, campaignId, adsAccountId, customerId, campaign, triggeredBy);
    }
  }

  // GTM Events
  async gtmSyncStarted(jobId: string, customerId: string, adsAccountId: string, conversionActionId: string, gtmContainerId: string, syncType: 'CREATE' | 'UPDATE' | 'DELETE', triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.gtmEventsService.emitGTMSyncStarted(tenantId, jobId, customerId, adsAccountId, conversionActionId, gtmContainerId, syncType, triggeredBy);
    }
  }

  async gtmSyncProgress(jobId: string, customerId: string, adsAccountId: string, conversionActionId: string, gtmContainerId: string, syncType: 'CREATE' | 'UPDATE' | 'DELETE', progress: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.gtmEventsService.emitGTMSyncProgress(tenantId, jobId, customerId, adsAccountId, conversionActionId, gtmContainerId, syncType, progress, triggeredBy);
    }
  }

  async gtmSyncCompleted(jobId: string, customerId: string, adsAccountId: string, conversionActionId: string, gtmContainerId: string, syncType: 'CREATE' | 'UPDATE' | 'DELETE', result: any, duration?: number, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.gtmEventsService.emitGTMSyncCompleted(tenantId, jobId, customerId, adsAccountId, conversionActionId, gtmContainerId, syncType, result, duration, triggeredBy);
    }
  }

  async gtmSyncFailed(jobId: string, customerId: string, adsAccountId: string, conversionActionId: string, gtmContainerId: string, syncType: 'CREATE' | 'UPDATE' | 'DELETE', error: string, progress?: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.gtmEventsService.emitGTMSyncFailed(tenantId, jobId, customerId, adsAccountId, conversionActionId, gtmContainerId, syncType, error, progress, triggeredBy);
    }
  }

  // Job Events
  async jobStarted(jobId: string, jobType: string, queueName: string, jobData?: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.jobEventsService.emitJobStarted(tenantId, jobId, jobType, queueName, jobData, triggeredBy);
    }
  }

  async jobProgress(jobId: string, jobType: string, queueName: string, progress: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.jobEventsService.emitJobProgress(tenantId, jobId, jobType, queueName, progress, triggeredBy);
    }
  }

  async jobCompleted(jobId: string, jobType: string, queueName: string, result?: any, duration?: number, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.jobEventsService.emitJobCompleted(tenantId, jobId, jobType, queueName, result, duration, triggeredBy);
    }
  }

  async jobFailed(jobId: string, jobType: string, queueName: string, error: string, progress?: any, attempts?: number, maxAttempts?: number, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.jobEventsService.emitJobFailed(tenantId, jobId, jobType, queueName, error, progress, attempts, maxAttempts, triggeredBy);
    }
  }

  // Error Events
  async apiLimitExceeded(apiType: string, limitType: string, details: any, affectedResource?: any, userId?: string, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.errorEventsService.emitApiLimitExceeded(tenantId, apiType, limitType, details, affectedResource, userId, triggeredBy);
    }
  }

  async authenticationFailed(authType: string, provider: string, details: any, affectedResource?: any, userId?: string, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.errorEventsService.emitAuthenticationFailed(tenantId, authType, provider, details, affectedResource, userId, triggeredBy);
    }
  }

  async permissionDenied(operation: string, resourceType: string, details: any, affectedResource?: any, userId?: string, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.errorEventsService.emitPermissionDenied(tenantId, operation, resourceType, details, affectedResource, userId, triggeredBy);
    }
  }

  async systemError(component: string, errorCode: string, message: string, details: any, affectedResource?: any, severity?: 'low' | 'medium' | 'high' | 'critical', userId?: string, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.errorEventsService.emitSystemError(tenantId, component, errorCode, message, details, affectedResource, severity, userId, triggeredBy);
    }
  }

  // System Events
  async systemMaintenance(maintenanceType: 'scheduled' | 'emergency' | 'completed', message: string, details: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.jobEventsService.emitSystemMaintenance(tenantId, maintenanceType, message, details, triggeredBy);
    }
  }

  async systemNotification(notificationType: 'info' | 'warning' | 'error' | 'success', title: string, message: string, details?: any, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      await this.jobEventsService.emitSystemNotification(tenantId, notificationType, title, message, details, triggeredBy);
    }
  }

  // Custom Events
  async customEvent(eventType: string, data: any, userId?: string, triggeredBy?: string): Promise<void> {
    const tenantId = TenantContextService.getTenantId();
    if (tenantId) {
      const sent = this.sseService.broadcastToTenant(tenantId, {
        event: eventType,
        data: {
          ...data,
          triggeredBy,
        },
        timestamp: new Date(),
        tenantId,
        userId,
        metadata: {
          resourceType: 'custom',
          action: 'custom_event',
          eventType,
        },
      });

      this.logger.debug(`Custom event ${eventType} sent to ${sent} connections`);
    }
  }

  // Utility methods
  async broadcastToTenant(tenantId: string, eventType: string, data: any): Promise<number> {
    return this.sseService.broadcastToTenant(tenantId, {
      event: eventType,
      data,
      timestamp: new Date(),
      tenantId,
    });
  }

  async getConnectionStats() {
    return this.sseService.getStats();
  }

  async getTenantConnections(tenantId: string) {
    return this.sseService.getTenantConnections(tenantId);
  }
}