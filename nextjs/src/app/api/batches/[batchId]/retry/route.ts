// POST /api/batches/[batchId]/retry
// Manually triggers queue processing for a stuck batch

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { waitUntil } from '@vercel/functions';
import { runProcessingLoop } from '@/lib/queue/process-job';
import prisma from '@/lib/prisma';

export const maxDuration = 30;

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
      select: { status: true },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status !== 'PROCESSING' && batch.status !== 'PAUSED') {
      return NextResponse.json({ error: 'Batch is not in a retryable state' }, { status: 400 });
    }

    // If paused, resume it first
    if (batch.status === 'PAUSED') {
      await prisma.trackingBatch.update({
        where: { id: batchId },
        data: { status: 'PROCESSING', pausedAt: null, resumeAfter: null, pauseReason: null },
      });
    }

    // Trigger processing in background
    waitUntil(runProcessingLoop());

    return NextResponse.json({ success: true, message: 'Processing triggered' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
