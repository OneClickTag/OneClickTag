import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ batchId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { batchId } = await params;

    const batch = await prisma.trackingBatch.findFirst({
      where: { id: batchId, tenantId: session.tenantId },
      include: {
        jobs: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            trackingId: true,
            recommendationId: true,
            status: true,
            step: true,
            attempts: true,
            lastError: true,
            nextRetryAt: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Fetch tracking names for each job
    const trackingIds = batch.jobs.map((j) => j.trackingId);
    const trackings = await prisma.tracking.findMany({
      where: { id: { in: trackingIds } },
      select: { id: true, name: true },
    });
    const trackingNameMap = new Map(trackings.map((t) => [t.id, t.name]));

    const jobs = batch.jobs.map((j) => ({
      ...j,
      trackingName: trackingNameMap.get(j.trackingId) || 'Unknown',
    }));

    return NextResponse.json({
      id: batch.id,
      status: batch.status,
      totalJobs: batch.totalJobs,
      completed: batch.completed,
      failed: batch.failed,
      pauseReason: batch.pauseReason,
      resumeAfter: batch.resumeAfter?.toISOString() || null,
      createdAt: batch.createdAt.toISOString(),
      jobs,
    });
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
