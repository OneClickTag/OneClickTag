import { Response } from 'express';

export interface SSEConnection {
  id: string;
  tenantId: string;
  userId?: string;
  response: Response;
  isActive: boolean;
  connectedAt: Date;
  lastHeartbeat: Date;
  eventFilters: string[];
  metadata?: Record<string, any>;
}

export interface SSEEvent {
  id?: string;
  event: string;
  data: any;
  retry?: number;
  timestamp: Date;
  tenantId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export enum SSEEventType {
  // Customer events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  CUSTOMER_BULK_IMPORT_PROGRESS = 'customer.bulk_import.progress',
  CUSTOMER_BULK_IMPORT_COMPLETED = 'customer.bulk_import.completed',
  
  // Campaign events
  CAMPAIGN_CREATED = 'campaign.created',
  CAMPAIGN_UPDATED = 'campaign.updated',
  CAMPAIGN_STATUS_CHANGED = 'campaign.status_changed',
  CAMPAIGN_METRICS_UPDATED = 'campaign.metrics_updated',
  CAMPAIGN_DELETED = 'campaign.deleted',
  
  // GTM sync events
  GTM_SYNC_STARTED = 'gtm.sync.started',
  GTM_SYNC_PROGRESS = 'gtm.sync.progress',
  GTM_SYNC_COMPLETED = 'gtm.sync.completed',
  GTM_SYNC_FAILED = 'gtm.sync.failed',
  GTM_TAG_CREATED = 'gtm.tag.created',
  GTM_TAG_UPDATED = 'gtm.tag.updated',
  GTM_TAG_DELETED = 'gtm.tag.deleted',
  
  // Job events
  JOB_STARTED = 'job.started',
  JOB_PROGRESS = 'job.progress',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  
  // Error events
  ERROR_API_LIMIT_EXCEEDED = 'error.api_limit_exceeded',
  ERROR_AUTHENTICATION_FAILED = 'error.authentication_failed',
  ERROR_PERMISSION_DENIED = 'error.permission_denied',
  ERROR_SYSTEM_ERROR = 'error.system_error',
  ERROR_VALIDATION_FAILED = 'error.validation_failed',
  
  // System events
  SYSTEM_MAINTENANCE = 'system.maintenance',
  SYSTEM_NOTIFICATION = 'system.notification',
  
  // Connection events
  CONNECTION_ESTABLISHED = 'connection.established',
  HEARTBEAT = 'heartbeat',
}

export interface CustomerUpdateEventData {
  customerId: string;
  action: 'created' | 'updated' | 'deleted';
  customer?: any;
  changes?: Record<string, any>;
  triggeredBy?: string;
}

export interface CampaignStatusEventData {
  campaignId: string;
  adsAccountId: string;
  customerId: string;
  previousStatus?: string;
  newStatus: string;
  campaign?: any;
  metrics?: any;
  triggeredBy?: string;
}

export interface GTMSyncProgressEventData {
  jobId: string;
  customerId: string;
  adsAccountId: string;
  conversionActionId: string;
  gtmContainerId: string;
  syncType: 'CREATE' | 'UPDATE' | 'DELETE';
  progress: {
    percentage: number;
    currentStep?: string;
    totalSteps?: number;
    completedSteps?: number;
  };
  result?: any;
  error?: string;
}

export interface ErrorNotificationEventData {
  errorId: string;
  errorType: string;
  message: string;
  details?: any;
  affectedResource?: {
    type: string;
    id: string;
    name?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionRequired?: boolean;
  suggestedActions?: string[];
  retryable?: boolean;
}

export interface JobProgressEventData {
  jobId: string;
  jobType: string;
  queueName: string;
  status: 'started' | 'progress' | 'completed' | 'failed';
  progress: {
    percentage: number;
    currentStep?: string;
    estimatedTimeRemaining?: number;
  };
  result?: any;
  error?: string;
}

export interface SSEConnectionOptions {
  heartbeatInterval?: number;
  connectionTimeout?: number;
  maxConnections?: number;
  eventFilters?: string[];
  compression?: boolean;
}

export interface SSEStats {
  totalConnections: number;
  activeConnections: number;
  connectionsByTenant: Record<string, number>;
  eventsSentToday: number;
  averageLatency: number;
  uptime: number;
}

export interface ReconnectionConfig {
  enabled: boolean;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface EventFilter {
  eventTypes?: SSEEventType[];
  customerId?: string;
  adsAccountId?: string;
  campaignId?: string;
  jobTypes?: string[];
  errorSeverities?: string[];
}