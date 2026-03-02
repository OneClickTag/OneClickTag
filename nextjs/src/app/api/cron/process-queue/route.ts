import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processQueueJob, resumePausedBatches, recoverStuckJobs, finalizeBatches } from '@/lib/queue/process-job';

const MAX_RUNTIME_MS = 25_000; // Stop before Vercel's 30s limit
const ADVISORY_LOCK_ID = 42;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Acquire advisory lock to prevent concurrent cron invocations
    const lockResult = await prisma.$queryRawUnsafe<{ locked: boolean }[]>(
      `SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) as locked`
    );
    if (!lockResult[0]?.locked) {
      return NextResponse.json({
        success: true,
        message: 'Another instance is already processing',
        skipped: true,
      });
    }

    try {
      // 1. Recover stuck jobs (serverless function died mid-execution)
      const recovered = await recoverStuckJobs();

      // 2. Resume any paused batches whose cooldown has expired
      const resumed = await resumePausedBatches();

      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      let paused = 0;
      let quotaPaused = false;

      // 3. Process jobs ONE AT A TIME per customer, sequentially.
      //    This avoids Google API race conditions (CONCURRENT_MODIFICATION, quota).
      //    We process one job, check the result, then pick the next one.
      while (Date.now() - startTime < MAX_RUNTIME_MS) {
        // Pick ONE job from a PROCESSING batch, prioritizing by batch order
        const job = await prisma.trackingQueueJob.findFirst({
          where: {
            status: { in: ['QUEUED', 'RETRYING'] },
            OR: [
              { nextRetryAt: null },
              { nextRetryAt: { lte: new Date() } },
            ],
            batch: {
              status: 'PROCESSING',
            },
          },
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' },
          ],
          include: {
            batch: {
              select: {
                customerId: true,
                tenantId: true,
                userId: true,
                totalJobs: true,
                completed: true,
                failed: true,
              },
            },
          },
        });

        if (!job) break;

        // Process this single job
        try {
          const result = await processQueueJob(job);
          processed++;

          if (result.success) {
            succeeded++;
          } else if (result.quotaError) {
            // Batch has been paused by processQueueJob — stop processing
            // this batch. We can still process other batches.
            paused++;
            quotaPaused = true;
            console.log(`[Cron] Quota hit on batch ${job.batchId}, moving to next batch`);
            // Continue the loop — findFirst will skip this paused batch
            // because it requires batch.status === 'PROCESSING'
            continue;
          } else {
            failed++;
          }
        } catch (err) {
          // Unexpected error in processQueueJob itself — shouldn't happen
          // but ensure we don't leave the job stuck in PROCESSING
          console.error(`[Cron] Unexpected error processing job ${job.id}:`, err);
          processed++;
          failed++;

          try {
            await prisma.trackingQueueJob.update({
              where: { id: job.id },
              data: {
                status: 'QUEUED',
                step: null,
                startedAt: null,
              },
            });
          } catch {
            // Best effort recovery
          }
        }

        // Small delay between jobs to spread API requests
        await new Promise((r) => setTimeout(r, 1500));
      }

      // 4. Finalize batches with no remaining jobs
      const finalized = await finalizeBatches();

      return NextResponse.json({
        success: true,
        recovered,
        resumed,
        processed,
        succeeded,
        failed,
        paused,
        finalized,
        quotaPaused,
        durationMs: Date.now() - startTime,
      });
    } finally {
      await prisma.$queryRawUnsafe(
        `SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] process-queue error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
