/**
 * Queue Job Processor — cron-driven, sequential-per-customer design.
 *
 * Key principles:
 *   1. The cron is the SOLE driver. No fire-and-forget from API routes.
 *   2. Jobs for the same customer run sequentially (Google APIs hate concurrency).
 *   3. Jobs for DIFFERENT customers can run in parallel.
 *   4. Quota errors pause the batch with a DB timestamp — cron resumes later.
 *   5. Stuck jobs are recovered aggressively (60s threshold).
 *   6. Batch finalization is driven by actual job counts, not counters.
 */

import prisma from '@/lib/prisma';
import { broadcastBatchProgress } from '@/lib/supabase/batch-progress';
import { executeAdsSync } from './sync';
import { executeGTMSync } from './sync';
import type { AdsSyncJob, GTMSyncJob } from './index';

// ============================================================================
// Error classification
// ============================================================================

const QUOTA_PATTERNS = [
  '429',
  'RESOURCE_EXHAUSTED',
  'rateLimitExceeded',
  'dailyLimitExceeded',
  'quotaExceeded',
  'Quota exceeded',
  'Rate limit',
  'Queries per minute',
  'too many requests',
];

const RETRYABLE_PATTERNS = [
  '500',
  '502',
  '503',
  '504',
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'CONCURRENT_MODIFICATION',
  'Unique constraint failed',
  'socket hang up',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'label could not be retrieved',
  'Retry should resolve this',
  'Sync incomplete',
  'Multiple requests were attempting',
];

function isQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return QUOTA_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function isRetryableError(message: string): boolean {
  return RETRYABLE_PATTERNS.some((p) => message.includes(p));
}

/**
 * Parse the error message to determine the base cooldown needed.
 * Escalates based on consecutive pauses: base → 2x → 3x (capped at 5 min for per-minute quotas).
 */
function getQuotaCooldownSeconds(errorMessage: string, consecutivePauses: number = 0): number {
  let base: number;
  if (errorMessage.includes('per day') || errorMessage.includes('daily') || errorMessage.includes('dailyLimit')) {
    base = 3600;
  } else if (errorMessage.includes('per 100 seconds') || errorMessage.includes('per100s')) {
    base = 105;
  } else {
    // Default: per-minute quota
    base = 65;
  }

  // Escalate: multiply by (1 + consecutivePauses), cap at 5 min for non-daily quotas
  const multiplier = Math.min(1 + consecutivePauses, 5);
  const cooldown = base * multiplier;
  return base >= 3600 ? cooldown : Math.min(cooldown, 300);
}

function getRetryDelay(attempt: number): number {
  const delays = [15, 30, 60, 120];
  return delays[Math.min(attempt - 1, delays.length - 1)];
}

// ============================================================================
// Types
// ============================================================================

interface ProcessJobResult {
  success: boolean;
  quotaError?: string;
}

type QueueJob = {
  id: string;
  batchId: string;
  trackingId: string;
  recommendationId: string;
  attempts: number;
  maxAttempts: number;
  batch: {
    customerId: string;
    tenantId: string;
    userId: string;
    totalJobs: number;
    completed: number;
    failed: number;
  };
};

// ============================================================================
// Core job processor — runs Ads then GTM sequentially
// ============================================================================

export async function processQueueJob(job: QueueJob): Promise<ProcessJobResult> {
  const { batch } = job;

  // Get tracking info
  const tracking = await prisma.tracking.findUnique({
    where: { id: job.trackingId },
    select: { name: true, destinations: true },
  });
  const trackingName = tracking?.name || 'Unknown';

  // Mark job PROCESSING
  await prisma.trackingQueueJob.update({
    where: { id: job.id },
    data: {
      status: 'PROCESSING',
      step: 'syncing',
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  // Read fresh batch counters for broadcast
  const freshBatch = await prisma.trackingBatch.findUnique({
    where: { id: job.batchId },
    select: { completed: true, failed: true, totalJobs: true },
  });

  await broadcastBatchProgress(job.batchId, {
    type: 'job_processing',
    timestamp: new Date().toISOString(),
    data: {
      jobId: job.id,
      trackingId: job.trackingId,
      trackingName,
      step: 'syncing',
      completed: freshBatch?.completed ?? batch.completed,
      failed: freshBatch?.failed ?? batch.failed,
      total: freshBatch?.totalJobs ?? batch.totalJobs,
    },
  });

  try {
    // Ads sync first (creates conversion action needed by GTM)
    const needsAds =
      tracking?.destinations.includes('GOOGLE_ADS') ||
      tracking?.destinations.includes('BOTH');

    if (needsAds) {
      const adsJob: AdsSyncJob = {
        trackingId: job.trackingId,
        customerId: batch.customerId,
        tenantId: batch.tenantId,
        userId: batch.userId,
        action: 'create',
      };
      await executeAdsSync(adsJob);
    }

    // GTM sync (needs adsConversionLabel from Ads sync)
    const gtmJob: GTMSyncJob = {
      trackingId: job.trackingId,
      customerId: batch.customerId,
      tenantId: batch.tenantId,
      userId: batch.userId,
      action: 'create',
    };
    await executeGTMSync(gtmJob);

    // Post-sync verification
    const finalTracking = await prisma.tracking.findUnique({
      where: { id: job.trackingId },
      select: {
        destinations: true,
        gtmTagId: true,
        gtmTriggerId: true,
        adsConversionLabel: true,
        gtmTagIdAds: true,
      },
    });

    const missingParts: string[] = [];
    if (!finalTracking?.gtmTagId) missingParts.push('GTM GA4 tag');
    if (!finalTracking?.gtmTriggerId) missingParts.push('GTM trigger');

    if (needsAds) {
      if (!finalTracking?.adsConversionLabel) missingParts.push('Google Ads conversion action');
      if (!finalTracking?.gtmTagIdAds) missingParts.push('GTM Ads conversion tag');
    }

    if (missingParts.length > 0) {
      throw new Error(`Sync incomplete — missing: ${missingParts.join(', ')}. Retry should resolve this.`);
    }

    // Mark job COMPLETED + recommendation CREATED
    const updatedBatch = await prisma.$transaction(async (tx) => {
      await tx.trackingQueueJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          step: null,
          completedAt: new Date(),
          lastError: null,
          errorCode: null,
        },
      });
      await tx.trackingRecommendation.updateMany({
        where: { trackingId: job.trackingId },
        data: { status: 'CREATED' },
      });
      return tx.trackingBatch.update({
        where: { id: job.batchId },
        data: { completed: { increment: 1 } },
      });
    });

    await broadcastBatchProgress(job.batchId, {
      type: 'job_completed',
      timestamp: new Date().toISOString(),
      data: {
        jobId: job.id,
        trackingId: job.trackingId,
        trackingName,
        completed: updatedBatch.completed,
        failed: updatedBatch.failed,
        total: updatedBatch.totalJobs,
      },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return handleJobError(job, errorMessage, trackingName);
  }
}

// ============================================================================
// Error handler — quota errors pause the BATCH, retryable errors retry the JOB
// ============================================================================

async function handleJobError(
  job: QueueJob,
  errorMessage: string,
  trackingName: string,
): Promise<ProcessJobResult> {
  const currentAttempts = job.attempts + 1; // Already incremented in processQueueJob

  // ---- QUOTA ERROR ----
  // Pause the entire batch — don't count against attempts
  if (isQuotaError(errorMessage)) {
    // Count how many times this batch has been paused for quota (for escalating cooldown)
    const quotaJobCount = await prisma.trackingQueueJob.count({
      where: { batchId: job.batchId, errorCode: 'QUOTA' },
    });
    const consecutivePauses = Math.floor(quotaJobCount / 2); // rough estimate
    const cooldownSeconds = getQuotaCooldownSeconds(errorMessage, consecutivePauses);
    const resumeAfter = new Date(Date.now() + cooldownSeconds * 1000);

    await prisma.$transaction(async (tx) => {
      // Reset this job back to QUEUED (quota is not its fault)
      await tx.trackingQueueJob.update({
        where: { id: job.id },
        data: {
          status: 'QUEUED',
          lastError: errorMessage,
          errorCode: 'QUOTA',
          step: null,
          startedAt: null,
          // Undo the attempt increment — quota is not a real attempt
          attempts: { decrement: 1 },
        },
      });

      // Pause the batch with a resumeAfter timestamp
      await tx.trackingBatch.update({
        where: { id: job.batchId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
          resumeAfter,
          pauseReason: `API quota limit — auto-resumes at ${resumeAfter.toISOString()}`,
        },
      });
    });

    const batchState = await prisma.trackingBatch.findUnique({
      where: { id: job.batchId },
      select: { completed: true, failed: true, totalJobs: true },
    });

    await broadcastBatchProgress(job.batchId, {
      type: 'batch_paused',
      timestamp: new Date().toISOString(),
      data: {
        pauseReason: `API quota limit reached. Auto-resuming in ${cooldownSeconds}s...`,
        resumeAfter: resumeAfter.toISOString(),
        completed: batchState?.completed || 0,
        failed: batchState?.failed || 0,
        total: batchState?.totalJobs || 0,
      },
    });

    console.log(`[Queue] Batch ${job.batchId} paused for ${cooldownSeconds}s due to quota`);
    return { success: false, quotaError: errorMessage };
  }

  // ---- RETRYABLE ERROR ----
  if (isRetryableError(errorMessage) && currentAttempts < job.maxAttempts) {
    const delaySeconds = getRetryDelay(currentAttempts);
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

    await prisma.trackingQueueJob.update({
      where: { id: job.id },
      data: {
        status: 'RETRYING',
        lastError: errorMessage,
        errorCode: 'RETRYABLE',
        nextRetryAt,
        step: null,
        startedAt: null,
      },
    });

    const batchState = await prisma.trackingBatch.findUnique({
      where: { id: job.batchId },
      select: { completed: true, failed: true, totalJobs: true },
    });

    await broadcastBatchProgress(job.batchId, {
      type: 'job_retrying',
      timestamp: new Date().toISOString(),
      data: {
        jobId: job.id,
        trackingId: job.trackingId,
        trackingName,
        error: errorMessage,
        nextRetryAt: nextRetryAt.toISOString(),
        completed: batchState?.completed ?? job.batch.completed,
        failed: batchState?.failed ?? job.batch.failed,
        total: batchState?.totalJobs ?? job.batch.totalJobs,
      },
    });

    console.log(`[Queue] Job ${job.id} retrying in ${delaySeconds}s (attempt ${currentAttempts}/${job.maxAttempts})`);
    return { success: false };
  }

  // ---- PERMANENT FAILURE ----
  const updatedBatch = await prisma.$transaction(async (tx) => {
    await tx.trackingQueueJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        lastError: errorMessage,
        errorCode: 'PERMANENT',
        step: null,
        completedAt: new Date(),
      },
    });
    await tx.tracking.update({
      where: { id: job.trackingId },
      data: {
        status: 'FAILED',
        lastError: errorMessage,
      },
    });
    await tx.trackingRecommendation.updateMany({
      where: { trackingId: job.trackingId },
      data: { status: 'FAILED' },
    });
    return tx.trackingBatch.update({
      where: { id: job.batchId },
      data: { failed: { increment: 1 } },
    });
  });

  await broadcastBatchProgress(job.batchId, {
    type: 'job_failed',
    timestamp: new Date().toISOString(),
    data: {
      jobId: job.id,
      trackingId: job.trackingId,
      trackingName,
      error: errorMessage,
      completed: updatedBatch.completed,
      failed: updatedBatch.failed,
      total: updatedBatch.totalJobs,
    },
  });

  console.log(`[Queue] Job ${job.id} permanently failed: ${errorMessage.substring(0, 100)}`);
  return { success: false };
}

// ============================================================================
// Batch lifecycle helpers (called by the cron)
// ============================================================================

/**
 * Recover jobs stuck in PROCESSING status.
 * Serverless functions can die mid-execution. 60s threshold.
 */
export async function recoverStuckJobs(): Promise<number> {
  const stuckThreshold = new Date(Date.now() - 60 * 1000); // 1 minute

  const result = await prisma.trackingQueueJob.updateMany({
    where: {
      status: 'PROCESSING',
      startedAt: { lte: stuckThreshold },
    },
    data: {
      status: 'QUEUED',
      step: null,
      startedAt: null,
    },
  });

  if (result.count > 0) {
    console.log(`[Recovery] Reset ${result.count} stuck PROCESSING jobs back to QUEUED`);
  }

  return result.count;
}

/**
 * Resume batches whose cooldown has expired.
 */
export async function resumePausedBatches(): Promise<number> {
  const now = new Date();

  const pausedBatches = await prisma.trackingBatch.findMany({
    where: {
      status: 'PAUSED',
      resumeAfter: { lte: now },
    },
    select: { id: true, totalJobs: true, completed: true, failed: true },
  });

  if (pausedBatches.length === 0) return 0;

  for (const batch of pausedBatches) {
    await prisma.trackingBatch.update({
      where: { id: batch.id },
      data: {
        status: 'PROCESSING',
        pausedAt: null,
        resumeAfter: null,
        pauseReason: null,
      },
    });

    // QUEUED jobs stay QUEUED — the cron will pick them up.
    // No need to change job statuses since quota-paused jobs are already QUEUED.

    await broadcastBatchProgress(batch.id, {
      type: 'batch_resumed',
      timestamp: new Date().toISOString(),
      data: {
        completed: batch.completed,
        failed: batch.failed,
        total: batch.totalJobs,
      },
    });

    console.log(`[Recovery] Resumed paused batch ${batch.id}`);
  }

  return pausedBatches.length;
}

/**
 * Finalize batches that have no more active jobs.
 * Uses actual job counts (not the batch counters) for reliability.
 */
export async function finalizeBatches(): Promise<number> {
  const activeBatches = await prisma.trackingBatch.findMany({
    where: { status: 'PROCESSING' },
    select: { id: true, totalJobs: true },
  });

  let finalized = 0;

  for (const batch of activeBatches) {
    const activeJobs = await prisma.trackingQueueJob.count({
      where: {
        batchId: batch.id,
        status: { in: ['QUEUED', 'PROCESSING', 'RETRYING'] },
      },
    });

    if (activeJobs === 0) {
      // Count actual completed/failed from jobs (source of truth)
      const [completedCount, failedCount] = await Promise.all([
        prisma.trackingQueueJob.count({
          where: { batchId: batch.id, status: 'COMPLETED' },
        }),
        prisma.trackingQueueJob.count({
          where: { batchId: batch.id, status: 'FAILED' },
        }),
      ]);

      await prisma.trackingBatch.update({
        where: { id: batch.id },
        data: {
          status: 'COMPLETED',
          completed: completedCount,
          failed: failedCount,
          pausedAt: null,
          resumeAfter: null,
          pauseReason: null,
        },
      });

      await broadcastBatchProgress(batch.id, {
        type: 'batch_completed',
        timestamp: new Date().toISOString(),
        data: {
          completed: completedCount,
          failed: failedCount,
          total: batch.totalJobs,
        },
      });

      console.log(`[Queue] Finalized batch ${batch.id}: ${completedCount} completed, ${failedCount} failed`);
      finalized++;
    }
  }

  return finalized;
}
