import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { addGTMSyncJob, addAdsSyncJob } from '@/lib/queue';
import { TrackingType, TrackingDestination, TrackingStatus } from '@prisma/client';

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const SelectorConfigSchema = z.object({
  selector: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  method: z.string().optional(),
});

const UpdateTrackingSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  selector: z.string().optional().nullable(),
  urlPattern: z.string().optional().nullable(),
  selectorConfig: z.array(SelectorConfigSchema).optional().nullable(),
  config: z.record(z.any()).optional().nullable(),
  destinations: z.array(z.nativeEnum(TrackingDestination)).min(1).optional(),
  status: z.nativeEnum(TrackingStatus).optional(),
  ga4EventName: z.string().optional().nullable(),
  ga4Parameters: z.record(z.any()).optional().nullable(),
  adsConversionValue: z.number().min(0).optional().nullable(),
  ga4PropertyId: z.string().optional().nullable(),
});

// ============================================================================
// Route Params Type
// ============================================================================

type RouteParams = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/trackings/[id] - Get a single tracking
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    const tracking = await prisma.tracking.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
      include: {
        customer: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            company: true,
            email: true,
            googleAccountId: true,
            googleEmail: true,
          },
        },
        conversionAction: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            googleConversionActionId: true,
            googleAccountId: true,
            valueSettings: true,
          },
        },
      },
    });

    if (!tracking) {
      return NextResponse.json(
        { error: 'Tracking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tracking);
  } catch (error) {
    console.error('Error fetching tracking:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch tracking' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/trackings/[id] - Update a tracking
// ============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;
    const body = await request.json();

    const validatedData = UpdateTrackingSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    // Check tracking exists and belongs to tenant
    const existingTracking = await prisma.tracking.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
      select: {
        id: true,
        customerId: true,
        status: true,
        destinations: true,
        gtmTriggerId: true,
        gtmTagIdGA4: true,
        gtmTagIdAds: true,
      },
    });

    if (!existingTracking) {
      return NextResponse.json(
        { error: 'Tracking not found' },
        { status: 404 }
      );
    }

    // Prevent updates to trackings that are currently syncing
    if (existingTracking.status === TrackingStatus.CREATING || existingTracking.status === TrackingStatus.SYNCING) {
      return NextResponse.json(
        { error: 'Cannot update tracking while sync is in progress' },
        { status: 409 }
      );
    }

    const {
      name,
      description,
      selector,
      urlPattern,
      selectorConfig,
      config,
      destinations,
      status,
      ga4EventName,
      ga4Parameters,
      adsConversionValue,
      ga4PropertyId,
    } = validatedData.data;

    // Build update data
    const updateData: any = {
      updatedBy: session.id,
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (selector !== undefined) updateData.selector = selector;
    if (urlPattern !== undefined) updateData.urlPattern = urlPattern;
    if (selectorConfig !== undefined) {
      updateData.selectorConfig = selectorConfig ? JSON.parse(JSON.stringify(selectorConfig)) : null;
    }
    if (config !== undefined) {
      updateData.config = config ? JSON.parse(JSON.stringify(config)) : null;
    }
    if (destinations !== undefined) updateData.destinations = destinations;
    if (status !== undefined) updateData.status = status;
    if (ga4EventName !== undefined) updateData.ga4EventName = ga4EventName;
    if (ga4Parameters !== undefined) {
      updateData.ga4Parameters = ga4Parameters ? JSON.parse(JSON.stringify(ga4Parameters)) : null;
    }
    if (adsConversionValue !== undefined) updateData.adsConversionValue = adsConversionValue;
    if (ga4PropertyId !== undefined) updateData.ga4PropertyId = ga4PropertyId;

    // Update tracking
    const tracking = await prisma.tracking.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            company: true,
          },
        },
        conversionAction: {
          select: {
            id: true,
            name: true,
            googleConversionActionId: true,
          },
        },
      },
    });

    // Queue sync jobs if there are changes that affect GTM/Ads configuration
    // and the tracking is already ACTIVE (has been synced before)
    const needsResync = (
      existingTracking.status === TrackingStatus.ACTIVE &&
      (name !== undefined || selector !== undefined || urlPattern !== undefined ||
       config !== undefined || ga4EventName !== undefined || ga4Parameters !== undefined ||
       adsConversionValue !== undefined || destinations !== undefined)
    );

    let gtmJob = null;
    let adsJob = null;

    if (needsResync && existingTracking.gtmTriggerId) {
      // Update tracking status to SYNCING
      await prisma.tracking.update({
        where: { id },
        data: { status: TrackingStatus.SYNCING },
      });

      gtmJob = await addGTMSyncJob({
        trackingId: id,
        customerId: existingTracking.customerId,
        tenantId: session.tenantId,
        userId: session.id,
        action: 'update',
      });

      // Check if we need to sync Google Ads
      const effectiveDestinations = destinations || existingTracking.destinations;
      if (effectiveDestinations.includes(TrackingDestination.GOOGLE_ADS) ||
          effectiveDestinations.includes(TrackingDestination.BOTH)) {
        adsJob = await addAdsSyncJob({
          trackingId: id,
          customerId: existingTracking.customerId,
          tenantId: session.tenantId,
          userId: session.id,
          action: 'update',
        });
      }
    }

    return NextResponse.json({
      data: tracking,
      jobs: needsResync ? {
        gtmSyncJobId: gtmJob?.id || null,
        adsSyncJobId: adsJob?.id || null,
      } : null,
      message: needsResync ? 'Tracking updated and sync jobs queued' : 'Tracking updated',
    });
  } catch (error) {
    console.error('Error updating tracking:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to update tracking' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/trackings/[id] - Delete a tracking
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Check tracking exists and belongs to tenant
    const tracking = await prisma.tracking.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
      select: {
        id: true,
        customerId: true,
        status: true,
        destinations: true,
        gtmTriggerId: true,
        gtmTagIdGA4: true,
        gtmTagIdAds: true,
        gtmContainerId: true,
        gtmWorkspaceId: true,
        conversionActionId: true,
      },
    });

    if (!tracking) {
      return NextResponse.json(
        { error: 'Tracking not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of trackings that are currently syncing
    if (tracking.status === TrackingStatus.CREATING || tracking.status === TrackingStatus.SYNCING) {
      return NextResponse.json(
        { error: 'Cannot delete tracking while sync is in progress' },
        { status: 409 }
      );
    }

    // If tracking has GTM components, queue delete jobs to clean up
    let gtmJob = null;
    let adsJob = null;

    if (tracking.gtmTriggerId || tracking.gtmTagIdGA4 || tracking.gtmTagIdAds) {
      gtmJob = await addGTMSyncJob({
        trackingId: id,
        customerId: tracking.customerId,
        tenantId: session.tenantId,
        userId: session.id,
        action: 'delete',
      });
    }

    // If tracking has Google Ads conversion action, queue delete job
    if (tracking.conversionActionId ||
        tracking.destinations.includes(TrackingDestination.GOOGLE_ADS) ||
        tracking.destinations.includes(TrackingDestination.BOTH)) {
      adsJob = await addAdsSyncJob({
        trackingId: id,
        customerId: tracking.customerId,
        tenantId: session.tenantId,
        userId: session.id,
        action: 'delete',
      });
    }

    // Delete the tracking record
    await prisma.tracking.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Tracking deleted successfully',
      jobs: {
        gtmSyncJobId: gtmJob?.id || null,
        adsSyncJobId: adsJob?.id || null,
      },
    });
  } catch (error) {
    console.error('Error deleting tracking:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to delete tracking' },
      { status: 500 }
    );
  }
}
