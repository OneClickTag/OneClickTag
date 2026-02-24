import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { addGTMSyncJob, addAdsSyncJob } from '@/lib/queue';
import { TrackingDestination, TrackingStatus } from '@prisma/client';

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const TriggerSyncSchema = z.object({
  force: z.boolean().optional().default(false),
  syncGTM: z.boolean().optional().default(true),
  syncAds: z.boolean().optional().default(true),
});

// ============================================================================
// Route Params Type
// ============================================================================

type RouteParams = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// POST /api/trackings/[id]/sync - Manually trigger sync for a tracking
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Parse optional body
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional, use defaults
    }

    const validatedData = TriggerSyncSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { force, syncGTM, syncAds } = validatedData.data;

    // Get tracking with user ownership check
    const tracking = await prisma.tracking.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
        customer: { userId: session.id },
      },
      select: {
        id: true,
        customerId: true,
        status: true,
        destinations: true,
        gtmTriggerId: true,
        gtmTagIdGA4: true,
        gtmTagIdAds: true,
        conversionActionId: true,
        lastSyncAt: true,
        syncAttempts: true,
      },
    });

    if (!tracking) {
      return NextResponse.json(
        { error: 'Tracking not found' },
        { status: 404 }
      );
    }

    // Check if already syncing (unless force is true)
    if (!force && (tracking.status === TrackingStatus.CREATING || tracking.status === TrackingStatus.SYNCING)) {
      return NextResponse.json(
        {
          error: 'Sync already in progress',
          currentStatus: tracking.status,
          hint: 'Use force=true to override',
        },
        { status: 409 }
      );
    }

    // Verify customer has Google account connected
    const customer = await prisma.customer.findFirst({
      where: {
        id: tracking.customerId,
        tenantId: session.tenantId,
        userId: session.id,
      },
      select: {
        id: true,
        googleAccountId: true,
      },
    });

    if (!customer?.googleAccountId) {
      return NextResponse.json(
        { error: 'Customer must have a connected Google account' },
        { status: 400 }
      );
    }

    // Determine action: 'create' for new trackings without GTM IDs, 'update' for existing
    const hasExistingGTMComponents = tracking.gtmTriggerId || tracking.gtmTagIdGA4 || tracking.gtmTagIdAds;
    const action = hasExistingGTMComponents ? 'update' : 'create';

    // Update status to SYNCING
    await prisma.tracking.update({
      where: { id },
      data: {
        status: TrackingStatus.SYNCING,
        syncAttempts: { increment: 1 },
      },
    });

    // Run Ads sync FIRST (awaited) so adsConversionLabel is available for GTM sync
    let gtmJob = null;
    let adsJob = null;

    const shouldSyncAds = syncAds && (
      tracking.destinations.includes(TrackingDestination.GOOGLE_ADS) ||
      tracking.destinations.includes(TrackingDestination.BOTH)
    );

    if (shouldSyncAds) {
      try {
        adsJob = await addAdsSyncJob({
          trackingId: id,
          customerId: tracking.customerId,
          tenantId: session.tenantId,
          userId: session.id,
          action,
        });
      } catch (err: any) {
        console.error('[Sync] Ads sync failed, continuing with GTM sync:', err.message);
      }
    }

    // Then run GTM sync — now has access to adsConversionLabel via DB
    if (syncGTM) {
      gtmJob = await addGTMSyncJob({
        trackingId: id,
        customerId: tracking.customerId,
        tenantId: session.tenantId,
        userId: session.id,
        action,
      });
    }

    return NextResponse.json({
      message: 'Sync jobs queued successfully',
      tracking: {
        id: tracking.id,
        previousStatus: tracking.status,
        newStatus: TrackingStatus.SYNCING,
        action,
      },
      jobs: {
        gtmSyncJobId: gtmJob?.id || null,
        adsSyncJobId: adsJob?.id || null,
      },
    });
  } catch (error) {
    console.error('Error triggering sync:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}
