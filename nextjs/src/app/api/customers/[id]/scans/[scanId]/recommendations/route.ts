// GET /api/customers/[id]/scans/[scanId]/recommendations

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; scanId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId, scanId } = await params;

    // Verify scan belongs to customer and tenant
    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId, customer: { userId: session.id } },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Auto-verify: detect broken recommendations
    await verifyCreatedRecommendations(scanId);
    await verifyCreatingRecommendations(scanId);

    // Parse filters from query params
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = { scanId };
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (type) where.trackingType = type;

    const recommendations = await prisma.trackingRecommendation.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to get recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Verify CREATED recommendations against their linked tracking's actual state.
 * If a recommendation says CREATED but the tracking is FAILED or missing
 * Google resources, mark it as REPAIR so the user can see and re-trigger.
 */
async function verifyCreatedRecommendations(scanId: string): Promise<void> {
  const createdRecs = await prisma.trackingRecommendation.findMany({
    where: { scanId, status: 'CREATED', trackingId: { not: null } },
    select: { id: true, trackingId: true },
  });

  if (createdRecs.length === 0) return;

  const trackingIds = createdRecs.map((r) => r.trackingId!);
  const trackings = await prisma.tracking.findMany({
    where: { id: { in: trackingIds } },
    select: {
      id: true,
      status: true,
      destinations: true,
      gtmTagId: true,
      gtmTriggerId: true,
      adsConversionLabel: true,
      gtmTagIdAds: true,
    },
  });

  const trackingMap = new Map(trackings.map((t) => [t.id, t]));

  const repairIds: string[] = [];
  for (const rec of createdRecs) {
    const tracking = trackingMap.get(rec.trackingId!);
    if (!tracking) {
      repairIds.push(rec.id);
      continue;
    }
    if (tracking.status === 'FAILED' || tracking.status === 'PENDING') {
      repairIds.push(rec.id);
      continue;
    }
    if (tracking.status === 'ACTIVE') {
      // Check GTM basics
      if (!tracking.gtmTagId || !tracking.gtmTriggerId) {
        repairIds.push(rec.id);
        continue;
      }
      // Check Ads resources if destination requires it
      const needsAds =
        tracking.destinations?.includes('GOOGLE_ADS') ||
        tracking.destinations?.includes('BOTH');
      if (needsAds && (!tracking.adsConversionLabel || !tracking.gtmTagIdAds)) {
        repairIds.push(rec.id);
        continue;
      }
    }
  }

  if (repairIds.length > 0) {
    await prisma.trackingRecommendation.updateMany({
      where: { id: { in: repairIds } },
      data: { status: 'REPAIR', trackingId: null },
    });
    console.log(`[Verify] Marked ${repairIds.length} CREATED recommendations as REPAIR for scan ${scanId}`);
  }
}

/**
 * Verify CREATING recommendations — catch ones stuck in "syncing" state.
 * If the linked tracking is FAILED, or the batch job is done/cancelled,
 * flip the recommendation to FAILED (with error) or REPAIR so it doesn't
 * show "Syncing..." forever.
 */
async function verifyCreatingRecommendations(scanId: string): Promise<void> {
  const creatingRecs = await prisma.trackingRecommendation.findMany({
    where: { scanId, status: 'CREATING' },
    select: { id: true, trackingId: true },
  });

  if (creatingRecs.length === 0) return;

  const repairIds: string[] = [];
  const failedIds: string[] = [];

  // Check trackings with IDs
  const recsWithTracking = creatingRecs.filter((r) => r.trackingId);
  const createdIds: string[] = [];

  if (recsWithTracking.length > 0) {
    const trackingIds = recsWithTracking.map((r) => r.trackingId!);
    const trackings = await prisma.tracking.findMany({
      where: { id: { in: trackingIds } },
      select: {
        id: true,
        status: true,
        lastError: true,
        destinations: true,
        gtmTagId: true,
        gtmTriggerId: true,
        adsConversionLabel: true,
        gtmTagIdAds: true,
      },
    });
    const trackingMap = new Map(trackings.map((t) => [t.id, t]));

    for (const rec of recsWithTracking) {
      const tracking = trackingMap.get(rec.trackingId!);
      if (!tracking) {
        // Tracking deleted
        repairIds.push(rec.id);
        continue;
      }
      if (tracking.status === 'FAILED') {
        // Tracking permanently failed — show as FAILED
        failedIds.push(rec.id);
        continue;
      }
      if (tracking.status === 'ACTIVE') {
        // Already synced — verify completeness before marking CREATED
        const hasGtm = !!tracking.gtmTagId && !!tracking.gtmTriggerId;
        const needsAds =
          tracking.destinations?.includes('GOOGLE_ADS') ||
          tracking.destinations?.includes('BOTH');
        const hasAds = !!tracking.adsConversionLabel && !!tracking.gtmTagIdAds;

        if (hasGtm && (!needsAds || hasAds)) {
          // Fully synced — mark as CREATED
          createdIds.push(rec.id);
        } else {
          // Partially synced — needs repair
          repairIds.push(rec.id);
        }
        continue;
      }
      // PENDING or CREATING = still in progress, check if batch is dead
      const job = await prisma.trackingQueueJob.findFirst({
        where: { trackingId: rec.trackingId! },
        select: { status: true, batch: { select: { status: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (job) {
        if (job.status === 'FAILED') {
          failedIds.push(rec.id);
        } else if (job.batch.status === 'CANCELLED' || job.batch.status === 'COMPLETED') {
          // Batch is done but this job didn't complete successfully
          if (job.status !== 'COMPLETED') {
            repairIds.push(rec.id);
          }
        }
        // Otherwise it's still QUEUED/PROCESSING — genuinely in progress
      } else {
        // No job found at all — orphaned
        repairIds.push(rec.id);
      }
    }
  }

  // Recs with no trackingId but stuck in CREATING — orphaned
  const orphaned = creatingRecs.filter((r) => !r.trackingId);
  for (const rec of orphaned) {
    repairIds.push(rec.id);
  }

  if (createdIds.length > 0) {
    await prisma.trackingRecommendation.updateMany({
      where: { id: { in: createdIds } },
      data: { status: 'CREATED' },
    });
    console.log(`[Verify] Marked ${createdIds.length} CREATING recommendations as CREATED for scan ${scanId}`);
  }

  if (failedIds.length > 0) {
    await prisma.trackingRecommendation.updateMany({
      where: { id: { in: failedIds } },
      data: { status: 'FAILED' },
    });
    console.log(`[Verify] Marked ${failedIds.length} CREATING recommendations as FAILED for scan ${scanId}`);
  }

  if (repairIds.length > 0) {
    await prisma.trackingRecommendation.updateMany({
      where: { id: { in: repairIds } },
      data: { status: 'REPAIR', trackingId: null },
    });
    console.log(`[Verify] Marked ${repairIds.length} CREATING recommendations as REPAIR for scan ${scanId}`);
  }
}
