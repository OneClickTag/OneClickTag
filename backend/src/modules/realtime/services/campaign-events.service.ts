import { Injectable, Logger } from '@nestjs/common';
import { SSEService } from './sse.service';
import {
  SSEEventType,
  CampaignStatusEventData,
  EventFilter,
} from '../interfaces/sse.interface';

@Injectable()
export class CampaignEventsService {
  private readonly logger = new Logger(CampaignEventsService.name);

  constructor(private readonly sseService: SSEService) {}

  /**
   * Emit campaign created event
   */
  async emitCampaignCreated(
    tenantId: string,
    campaignId: string,
    adsAccountId: string,
    customerId: string,
    campaign: any,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting campaign created event: ${campaignId} for tenant: ${tenantId}`);

    const eventData: CampaignStatusEventData = {
      campaignId,
      adsAccountId,
      customerId,
      newStatus: campaign.status || 'UNKNOWN',
      campaign,
      triggeredBy,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CAMPAIGN_CREATED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: 'created',
        customerId,
        adsAccountId,
      },
    });

    this.logger.debug(`Campaign created event sent to ${sent} connections`);
  }

  /**
   * Emit campaign updated event
   */
  async emitCampaignUpdated(
    tenantId: string,
    campaignId: string,
    adsAccountId: string,
    customerId: string,
    campaign: any,
    changes?: Record<string, any>,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting campaign updated event: ${campaignId} for tenant: ${tenantId}`);

    const eventData: CampaignStatusEventData = {
      campaignId,
      adsAccountId,
      customerId,
      newStatus: campaign.status || 'UNKNOWN',
      campaign,
      triggeredBy,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CAMPAIGN_UPDATED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: 'updated',
        customerId,
        adsAccountId,
        changedFields: changes ? Object.keys(changes) : undefined,
      },
    });

    this.logger.debug(`Campaign updated event sent to ${sent} connections`);
  }

  /**
   * Emit campaign status changed event
   */
  async emitCampaignStatusChanged(
    tenantId: string,
    campaignId: string,
    adsAccountId: string,
    customerId: string,
    previousStatus: string,
    newStatus: string,
    campaign?: any,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting campaign status changed event: ${campaignId} (${previousStatus} -> ${newStatus}) for tenant: ${tenantId}`);

    const eventData: CampaignStatusEventData = {
      campaignId,
      adsAccountId,
      customerId,
      previousStatus,
      newStatus,
      campaign,
      triggeredBy,
    };

    // Send to all tenant connections
    const sentGeneral = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CAMPAIGN_STATUS_CHANGED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: 'status_changed',
        customerId,
        adsAccountId,
        statusChange: `${previousStatus} -> ${newStatus}`,
      },
    });

    // Also send with filtering for specific campaign watchers
    const campaignFilter: EventFilter = {
      eventTypes: [SSEEventType.CAMPAIGN_STATUS_CHANGED],
      campaignId,
      adsAccountId,
      customerId,
    };

    const sentFiltered = this.sseService.sendEventWithFilter({
      event: SSEEventType.CAMPAIGN_STATUS_CHANGED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: 'status_changed',
        filtered: true,
      },
    }, campaignFilter);

    this.logger.debug(`Campaign status changed event sent to ${sentGeneral} general + ${sentFiltered} filtered connections`);
  }

  /**
   * Emit campaign metrics updated event
   */
  async emitCampaignMetricsUpdated(
    tenantId: string,
    campaignId: string,
    adsAccountId: string,
    customerId: string,
    metrics: any,
    previousMetrics?: any,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting campaign metrics updated event: ${campaignId} for tenant: ${tenantId}`);

    const eventData: CampaignStatusEventData = {
      campaignId,
      adsAccountId,
      customerId,
      newStatus: 'ACTIVE', // Metrics updates typically mean campaign is active
      metrics,
      triggeredBy,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CAMPAIGN_METRICS_UPDATED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: 'metrics_updated',
        customerId,
        adsAccountId,
        metricsKeys: metrics ? Object.keys(metrics) : undefined,
      },
    });

    this.logger.debug(`Campaign metrics updated event sent to ${sent} connections`);
  }

  /**
   * Emit campaign deleted event
   */
  async emitCampaignDeleted(
    tenantId: string,
    campaignId: string,
    adsAccountId: string,
    customerId: string,
    campaign?: any,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting campaign deleted event: ${campaignId} for tenant: ${tenantId}`);

    const eventData: CampaignStatusEventData = {
      campaignId,
      adsAccountId,
      customerId,
      newStatus: 'REMOVED',
      campaign,
      triggeredBy,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.CAMPAIGN_DELETED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: 'deleted',
        customerId,
        adsAccountId,
      },
    });

    this.logger.debug(`Campaign deleted event sent to ${sent} connections`);
  }

  /**
   * Emit bulk campaign operation progress
   */
  async emitBulkCampaignProgress(
    tenantId: string,
    operationId: string,
    operationType: 'create' | 'update' | 'delete' | 'pause' | 'resume',
    progress: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
      percentage: number;
      currentCampaign?: string;
      estimatedTimeRemaining?: number;
    },
    adsAccountId?: string,
    customerId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting bulk campaign ${operationType} progress: ${operationId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'campaign.bulk.progress',
      data: {
        operationId,
        operationType,
        progress,
        adsAccountId,
        customerId,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: `bulk_${operationType}_progress`,
        operationId,
      },
    });

    this.logger.debug(`Bulk campaign ${operationType} progress event sent to ${sent} connections`);
  }

  /**
   * Emit bulk campaign operation completed
   */
  async emitBulkCampaignCompleted(
    tenantId: string,
    operationId: string,
    operationType: 'create' | 'update' | 'delete' | 'pause' | 'resume',
    results: {
      total: number;
      successful: number;
      failed: number;
      duration: number;
      errors?: any[];
      campaignIds?: string[];
    },
    adsAccountId?: string,
    customerId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting bulk campaign ${operationType} completed: ${operationId} for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'campaign.bulk.completed',
      data: {
        operationId,
        operationType,
        results,
        adsAccountId,
        customerId,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: `bulk_${operationType}_completed`,
        operationId,
        success: results.failed === 0,
      },
    });

    this.logger.debug(`Bulk campaign ${operationType} completed event sent to ${sent} connections`);
  }

  /**
   * Emit campaign performance alert
   */
  async emitCampaignPerformanceAlert(
    tenantId: string,
    campaignId: string,
    adsAccountId: string,
    customerId: string,
    alertType: 'low_performance' | 'high_cost' | 'budget_exceeded' | 'conversion_drop',
    alertData: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      currentValue?: number;
      thresholdValue?: number;
      recommendations?: string[];
    },
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting campaign performance alert: ${campaignId} (${alertType}) for tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'campaign.performance.alert',
      data: {
        campaignId,
        adsAccountId,
        customerId,
        alertType,
        alertData,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: 'performance_alert',
        customerId,
        adsAccountId,
        alertType,
        severity: alertData.severity,
      },
    });

    this.logger.debug(`Campaign performance alert sent to ${sent} connections`);
  }

  /**
   * Emit campaign sync status update (for Google Ads API sync)
   */
  async emitCampaignSyncStatus(
    tenantId: string,
    adsAccountId: string,
    customerId: string,
    syncStatus: 'started' | 'in_progress' | 'completed' | 'failed',
    progress?: {
      total?: number;
      processed?: number;
      percentage?: number;
    },
    error?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting campaign sync status: ${syncStatus} for account ${adsAccountId} in tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'campaign.sync.status',
      data: {
        adsAccountId,
        customerId,
        syncStatus,
        progress,
        error,
        triggeredBy,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      tenantId,
      metadata: {
        resourceType: 'campaign',
        action: 'sync_status',
        customerId,
        adsAccountId,
        syncStatus,
      },
    });

    this.logger.debug(`Campaign sync status event sent to ${sent} connections`);
  }
}