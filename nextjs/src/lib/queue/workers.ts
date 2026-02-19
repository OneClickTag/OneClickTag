import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '@/lib/prisma';
import { executeGTMSync, executeAdsSync } from './sync';
import { QUEUE_NAMES, GTMSyncJob, AdsSyncJob, AnalyticsAggregationJob } from './index';

// Only create workers if Redis URL is configured
const REDIS_URL = process.env.REDIS_URL;

function createConnection() {
  if (!REDIS_URL) return null;
  try {
    return new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  } catch {
    console.warn('[Workers] Failed to connect to Redis');
    return null;
  }
}

// Export function to start all workers (only when Redis is available)
export function startWorkers() {
  const connection = createConnection();
  if (!connection) {
    console.log('[Workers] Redis not available - workers will not start. Jobs run inline.');
    return null;
  }

  console.log('Starting background job workers...');

  // GTM Sync Worker
  const gtmSyncWorker = new Worker(
    QUEUE_NAMES.GTM_SYNC,
    async (job: Job<GTMSyncJob>) => executeGTMSync(job.data),
    { connection }
  );

  // Google Ads Sync Worker
  const adsSyncWorker = new Worker(
    QUEUE_NAMES.ADS_SYNC,
    async (job: Job<AdsSyncJob>) => executeAdsSync(job.data),
    { connection }
  );

  // Analytics Aggregation Worker
  const analyticsWorker = new Worker(
    QUEUE_NAMES.ANALYTICS_AGGREGATION,
    async (job: Job<AnalyticsAggregationJob>) => {
      const { tenantId, aggregationType, dateRangeStart, dateRangeEnd } = job.data;

      const customers = await prisma.customer.count({ where: { tenantId } });
      const trackings = await prisma.tracking.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      });
      const adsAccounts = await prisma.googleAdsAccount.count({
        where: { tenantId },
      });

      await prisma.analyticsAggregation.upsert({
        where: {
          tenantId_aggregationType_dateRangeStart_dateRangeEnd: {
            tenantId,
            aggregationType,
            dateRangeStart: new Date(dateRangeStart),
            dateRangeEnd: new Date(dateRangeEnd),
          },
        },
        update: {
          processedCustomers: customers,
          processedAdsAccounts: adsAccounts,
          data: { trackings },
          generatedAt: new Date(),
        },
        create: {
          tenantId,
          aggregationType,
          dateRangeStart: new Date(dateRangeStart),
          dateRangeEnd: new Date(dateRangeEnd),
          metrics: ['customers', 'trackings', 'adsAccounts'],
          dimensions: ['status'],
          processedCustomers: customers,
          processedAdsAccounts: adsAccounts,
          data: { trackings },
        },
      });

      return { success: true };
    },
    { connection }
  );

  gtmSyncWorker.on('completed', (job) => {
    console.log(`GTM sync job ${job.id} completed`);
  });

  gtmSyncWorker.on('failed', (job, err) => {
    console.error(`GTM sync job ${job?.id} failed:`, err.message);
  });

  adsSyncWorker.on('completed', (job) => {
    console.log(`Ads sync job ${job.id} completed`);
  });

  adsSyncWorker.on('failed', (job, err) => {
    console.error(`Ads sync job ${job?.id} failed:`, err.message);
  });

  analyticsWorker.on('completed', (job) => {
    console.log(`Analytics job ${job.id} completed`);
  });

  return { gtmSyncWorker, adsSyncWorker, analyticsWorker };
}
