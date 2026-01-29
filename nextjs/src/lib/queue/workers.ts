import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '@/lib/prisma';
import { getGTMClient, getOrCreateWorkspace, createTrigger, createTag } from '@/lib/google/gtm';
import { createConversionAction } from '@/lib/google/ads';
import { QUEUE_NAMES, GTMSyncJob, AdsSyncJob, AnalyticsAggregationJob } from './index';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// GTM Sync Worker
export const gtmSyncWorker = new Worker(
  QUEUE_NAMES.GTM_SYNC,
  async (job: Job<GTMSyncJob>) => {
    const { trackingId, customerId, tenantId, userId, action } = job.data;

    const tracking = await prisma.tracking.findUnique({
      where: { id: trackingId },
      include: { customer: true },
    });

    if (!tracking) {
      throw new Error(`Tracking ${trackingId} not found`);
    }

    // Update status to CREATING
    await prisma.tracking.update({
      where: { id: trackingId },
      data: { status: 'CREATING' },
    });

    try {
      const gtm = await getGTMClient(userId, tenantId);

      // Get customer's GTM container
      const customer = tracking.customer;
      if (!customer.googleAccountId) {
        throw new Error('Customer not connected to Google account');
      }

      // For this example, we'll assume the container ID is stored somewhere
      // In production, you'd query GTM for available containers
      const containerId = tracking.gtmContainerId;
      if (!containerId) {
        throw new Error('No GTM container configured for this customer');
      }

      // Get or create OneClickTag workspace
      const workspaceId = await getOrCreateWorkspace(gtm, containerId);

      if (action === 'create') {
        // Create trigger based on tracking type
        const trigger = await createTriggerForTracking(gtm, containerId, workspaceId, tracking);

        // Create tag
        const tag = await createTagForTracking(gtm, containerId, workspaceId, tracking, trigger.triggerId!);

        // Update tracking with GTM IDs
        await prisma.tracking.update({
          where: { id: trackingId },
          data: {
            gtmTriggerId: trigger.triggerId,
            gtmTagId: tag.tagId,
            gtmWorkspaceId: workspaceId,
            status: 'ACTIVE',
            lastSyncAt: new Date(),
            lastError: null,
          },
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.tracking.update({
        where: { id: trackingId },
        data: {
          status: 'FAILED',
          lastError: errorMessage,
          syncAttempts: { increment: 1 },
        },
      });

      throw error;
    }
  },
  { connection }
);

// Google Ads Sync Worker
export const adsSyncWorker = new Worker(
  QUEUE_NAMES.ADS_SYNC,
  async (job: Job<AdsSyncJob>) => {
    const { trackingId, customerId, tenantId, userId, action } = job.data;

    const tracking = await prisma.tracking.findUnique({
      where: { id: trackingId },
      include: { customer: { include: { googleAdsAccounts: true } } },
    });

    if (!tracking) {
      throw new Error(`Tracking ${trackingId} not found`);
    }

    try {
      if (action === 'create' && tracking.destinations.includes('GOOGLE_ADS')) {
        const adsAccount = tracking.customer.googleAdsAccounts[0];
        if (!adsAccount) {
          console.log('No Google Ads account found, skipping Ads sync');
          return { success: true, skipped: true };
        }

        // Create conversion action
        const result = await createConversionAction(userId, tenantId, adsAccount.accountId, {
          name: tracking.name,
          category: 'PURCHASE', // Map from tracking type
          type: 'WEBPAGE',
        });

        // Create or update conversion action in DB
        await prisma.conversionAction.create({
          data: {
            name: tracking.name,
            type: 'WEBPAGE',
            status: 'ENABLED',
            googleConversionActionId: result.conversionActionId,
            googleAccountId: adsAccount.accountId,
            customerId,
            tenantId,
          },
        });

        // Update tracking with conversion label
        await prisma.tracking.update({
          where: { id: trackingId },
          data: {
            adsConversionLabel: result.conversionLabel,
          },
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Ads sync error:', errorMessage);
      throw error;
    }
  },
  { connection }
);

// Analytics Aggregation Worker
export const analyticsWorker = new Worker(
  QUEUE_NAMES.ANALYTICS_AGGREGATION,
  async (job: Job<AnalyticsAggregationJob>) => {
    const { tenantId, aggregationType, dateRangeStart, dateRangeEnd } = job.data;

    // Aggregate customer data
    const customers = await prisma.customer.count({ where: { tenantId } });
    const trackings = await prisma.tracking.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });
    const adsAccounts = await prisma.googleAdsAccount.count({
      where: { tenantId },
    });

    // Store aggregation
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

// Helper functions
async function createTriggerForTracking(
  gtm: Awaited<ReturnType<typeof getGTMClient>>,
  containerId: string,
  workspaceId: string,
  tracking: { name: string; type: string; selector?: string | null; urlPattern?: string | null }
) {
  const triggerConfig: {
    name: string;
    type: string;
    filter?: Array<{ type: string; parameter: Array<{ type: string; key: string; value: string }> }>;
    customEventFilter?: Array<{ type: string; parameter: Array<{ type: string; key: string; value: string }> }>;
  } = {
    name: `${tracking.name} - Trigger`,
    type: 'CLICK', // Default, will be overridden based on type
  };

  switch (tracking.type) {
    case 'BUTTON_CLICK':
    case 'LINK_CLICK':
      triggerConfig.type = 'CLICK';
      if (tracking.selector) {
        triggerConfig.filter = [
          {
            type: 'CONTAINS',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{Click Element}}' },
              { type: 'TEMPLATE', key: 'arg1', value: tracking.selector },
            ],
          },
        ];
      }
      break;

    case 'PAGE_VIEW':
      triggerConfig.type = 'PAGEVIEW';
      if (tracking.urlPattern) {
        triggerConfig.filter = [
          {
            type: 'MATCHES_CSS_SELECTOR',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{Page URL}}' },
              { type: 'TEMPLATE', key: 'arg1', value: tracking.urlPattern },
            ],
          },
        ];
      }
      break;

    case 'FORM_SUBMIT':
      triggerConfig.type = 'FORM_SUBMISSION';
      break;

    default:
      triggerConfig.type = 'CUSTOM_EVENT';
  }

  return createTrigger(gtm, containerId, workspaceId, triggerConfig);
}

async function createTagForTracking(
  gtm: Awaited<ReturnType<typeof getGTMClient>>,
  containerId: string,
  workspaceId: string,
  tracking: { name: string; ga4EventName?: string | null },
  triggerId: string
) {
  return createTag(gtm, containerId, workspaceId, {
    name: `${tracking.name} - Tag`,
    type: 'gaawe', // GA4 Event tag
    parameter: [
      {
        type: 'TEMPLATE',
        key: 'eventName',
        value: tracking.ga4EventName || tracking.name.toLowerCase().replace(/\s+/g, '_'),
      },
    ],
    firingTriggerId: [triggerId],
  });
}

// Export function to start all workers
export function startWorkers() {
  console.log('Starting background job workers...');

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
