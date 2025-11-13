import { Job } from 'bull';

export interface BaseJobData {
  tenantId: string;
  triggeredBy?: string;
  metadata?: Record<string, any>;
  retryCount?: number;
  maxRetries?: number;
}

export interface GTMSyncJobData extends BaseJobData {
  customerId: string;
  adsAccountId: string;
  conversionActionId: string;
  gtmContainerId: string;
  syncType: 'CREATE' | 'UPDATE' | 'DELETE';
  changes: {
    tagName?: string;
    triggerConditions?: string[];
    customParameters?: Record<string, any>;
  };
}

export interface BulkCustomerImportJobData extends BaseJobData {
  importId: string;
  customers: Array<{
    email: string;
    firstName: string;
    lastName: string;
    company?: string;
    phone?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }>;
  importSettings: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    validateEmails: boolean;
    batchSize: number;
  };
}

export interface FailedApiCallRetryJobData extends BaseJobData {
  originalJobType: string;
  originalJobData: Record<string, any>;
  apiEndpoint: string;
  httpMethod: string;
  requestPayload?: any;
  lastError: {
    message: string;
    code?: string;
    statusCode?: number;
    timestamp: Date;
  };
  retryStrategy: {
    exponentialBackoff: boolean;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}

export interface AnalyticsAggregationJobData extends BaseJobData {
  aggregationType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: string[];
  dimensions: string[];
  customerIds?: string[];
  adsAccountIds?: string[];
  campaignIds?: string[];
  filters?: Record<string, any>;
}

export interface JobProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  currentStep?: string;
  estimatedTimeRemaining?: number;
}

export interface JobResult {
  success: boolean;
  data?: any;
  errors?: Array<{
    message: string;
    details?: any;
    timestamp: Date;
  }>;
  summary?: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duration: number;
  };
}

export type QueueJobData = 
  | GTMSyncJobData 
  | BulkCustomerImportJobData 
  | FailedApiCallRetryJobData 
  | AnalyticsAggregationJobData;

export interface QueueJob extends Job<QueueJobData> {}

export enum JobQueues {
  GTM_SYNC = 'gtm-sync',
  BULK_IMPORT = 'bulk-import',
  API_RETRY = 'api-retry',
  ANALYTICS = 'analytics-aggregation',
}

export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

export interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
}

export interface JobMonitoringData {
  id: string;
  name: string;
  queue: string;
  status: JobStatus;
  progress: JobProgress;
  data: QueueJobData;
  result?: JobResult;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
  attempts: number;
  delay: number;
  priority: number;
}