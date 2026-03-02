import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { broadcastBatchProgress } from '@/lib/supabase/batch-progress';

interface RouteParams {
  params: Promise<{ batchId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { batchId } = await params;

    const batch = await prisma.trackingBatch.findFirst({
      where: { id: batchId, tenantId: session.tenantId },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Batch already finished' }, { status: 400 });
    }

    // Cancel all non-terminal jobs (including PROCESSING) and update trackings
    await prisma.$transaction(async (tx) => {
      // Get all non-terminal jobs
      const pendingJobs = await tx.trackingQueueJob.findMany({
        where: {
          batchId,
          status: { in: ['QUEUED', 'PROCESSING', 'RETRYING', 'PAUSED'] },
        },
        select: { id: true, trackingId: true },
      });

      // Mark jobs as FAILED
      if (pendingJobs.length > 0) {
        await tx.trackingQueueJob.updateMany({
          where: {
            id: { in: pendingJobs.map((j) => j.id) },
          },
          data: {
            status: 'FAILED',
            lastError: 'Cancelled by user',
            completedAt: new Date(),
          },
        });

        // Update corresponding trackings to FAILED
        await tx.tracking.updateMany({
          where: {
            id: { in: pendingJobs.map((j) => j.trackingId) },
            status: { in: ['PENDING', 'CREATING'] },
          },
          data: {
            status: 'FAILED',
            lastError: 'Cancelled by user',
          },
        });
      }

      // Mark batch as CANCELLED with accurate counts from actual jobs
      const completedCount = await tx.trackingQueueJob.count({
        where: { batchId, status: 'COMPLETED' },
      });

      await tx.trackingBatch.update({
        where: { id: batchId },
        data: {
          status: 'CANCELLED',
          completed: completedCount,
          failed: pendingJobs.length,
          pausedAt: null,
          resumeAfter: null,
          pauseReason: null,
        },
      });
    });

    // Fetch updated batch for broadcast
    const updatedBatch = await prisma.trackingBatch.findUnique({
      where: { id: batchId },
      select: { completed: true, failed: true, totalJobs: true },
    });

    await broadcastBatchProgress(batchId, {
      type: 'batch_completed',
      timestamp: new Date().toISOString(),
      data: {
        completed: updatedBatch?.completed || 0,
        failed: updatedBatch?.failed || 0,
        total: updatedBatch?.totalJobs || 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
