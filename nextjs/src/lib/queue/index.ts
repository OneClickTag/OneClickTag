import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Queue names
export const QUEUE_NAMES = {
  GTM_SYNC: 'gtm-sync',
  ADS_SYNC: 'google-ads-sync',
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
  BULK_IMPORT: 'bulk-customer-import',
  API_RETRY: 'api-retry',
} as const;

// Redis connection - lazy initialization
let connection: IORedis | null = null;
let connectionFailed = false;

function getConnection(): IORedis | null {
  if (connectionFailed) return null;
  if (connection) return connection;

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[Queue] REDIS_URL not configured - running without background jobs');
      connectionFailed = true;
      return null;
    }

    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    connection.on('error', (err) => {
      console.warn('[Queue] Redis connection error:', err.message);
      connectionFailed = true;
    });

    return connection;
  } catch (error) {
    console.warn('[Queue] Failed to create Redis connection:', error);
    connectionFailed = true;
    return null;
  }
}

// Lazy queue creation
let gtmSyncQueue: Queue | null = null;
let adsSyncQueue: Queue | null = null;
let analyticsQueue: Queue | null = null;
let bulkImportQueue: Queue | null = null;
let apiRetryQueue: Queue | null = null;

function getQueue(name: string): Queue | null {
  const conn = getConnection();
  if (!conn) return null;

  try {
    return new Queue(name, { connection: conn });
  } catch (error) {
    console.warn(`[Queue] Failed to create queue ${name}:`, error);
    return null;
  }
}

// Job types
export interface GTMSyncJob {
  trackingId: string;
  customerId: string;
  tenantId: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
}

export interface AdsSyncJob {
  trackingId: string;
  customerId: string;
  tenantId: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
}

export interface AnalyticsAggregationJob {
  tenantId: string;
  aggregationType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface BulkImportJob {
  tenantId: string;
  userId: string;
  fileUrl: string;
  mapping: Record<string, string>;
}

// Add jobs - always execute inline in Next.js (no separate worker process)
export async function addGTMSyncJob(data: GTMSyncJob) {
  console.log('[Queue] Running GTM sync inline:', data.trackingId);
  const { executeGTMSync } = await import('./sync');
  executeGTMSync(data).catch((err) => {
    console.error('[Queue] Inline GTM sync failed:', err.message);
  });
  return { id: `inline-${Date.now()}`, name: 'sync', data };
}

export async function addAdsSyncJob(data: AdsSyncJob) {
  console.log('[Queue] Running Ads sync inline:', data.trackingId);
  const { executeAdsSync } = await import('./sync');
  executeAdsSync(data).catch((err) => {
    console.error('[Queue] Inline Ads sync failed:', err.message);
  });
  return { id: `inline-${Date.now()}`, name: 'sync', data };
}

export async function addAnalyticsJob(data: AnalyticsAggregationJob) {
  if (!analyticsQueue) analyticsQueue = getQueue(QUEUE_NAMES.ANALYTICS_AGGREGATION);
  if (!analyticsQueue) {
    console.log('[Queue] Analytics job would run inline (Redis not available)');
    return { id: `inline-${Date.now()}`, name: 'aggregate', data };
  }

  return analyticsQueue.add('aggregate', data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  });
}

export async function addBulkImportJob(data: BulkImportJob) {
  if (!bulkImportQueue) bulkImportQueue = getQueue(QUEUE_NAMES.BULK_IMPORT);
  if (!bulkImportQueue) {
    console.log('[Queue] Bulk import would run inline (Redis not available)');
    return { id: `inline-${Date.now()}`, name: 'import', data };
  }

  return bulkImportQueue.add('import', data, {
    attempts: 1,
  });
}

// Get job status
export async function getJobStatus(queueName: string, jobId: string) {
  // Handle inline jobs
  if (jobId.startsWith('inline-')) {
    return {
      id: jobId,
      state: 'completed',
      progress: 100,
      data: null,
      returnvalue: null,
      failedReason: null,
    };
  }

  const conn = getConnection();
  if (!conn) {
    return null;
  }

  const queues: Record<string, Queue | null> = {
    [QUEUE_NAMES.GTM_SYNC]: gtmSyncQueue || getQueue(QUEUE_NAMES.GTM_SYNC),
    [QUEUE_NAMES.ADS_SYNC]: adsSyncQueue || getQueue(QUEUE_NAMES.ADS_SYNC),
    [QUEUE_NAMES.ANALYTICS_AGGREGATION]: analyticsQueue || getQueue(QUEUE_NAMES.ANALYTICS_AGGREGATION),
    [QUEUE_NAMES.BULK_IMPORT]: bulkImportQueue || getQueue(QUEUE_NAMES.BULK_IMPORT),
    [QUEUE_NAMES.API_RETRY]: apiRetryQueue || getQueue(QUEUE_NAMES.API_RETRY),
  };

  const queue = queues[queueName];
  if (!queue) {
    return null;
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
  };
}

// Check if queues are available
export function isQueueAvailable(): boolean {
  return !connectionFailed && !!getConnection();
}
