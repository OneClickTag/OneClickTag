import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { getJobStatus, QUEUE_NAMES } from '@/lib/queue';
import { TrackingStatus } from '@prisma/client';

// ============================================================================
// Route Params Type
// ============================================================================

type RouteParams = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/trackings/[id]/status - Get sync status for a tracking
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Get tracking with user ownership check
    const tracking = await prisma.tracking.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
        customer: { userId: session.id },
      },
      select: {
        id: true,
        name: true,
        status: true,
        destinations: true,
        gtmTriggerId: true,
        gtmTagId: true,
        gtmTagIdGA4: true,
        gtmTagIdAds: true,
        gtmContainerId: true,
        gtmWorkspaceId: true,
        conversionActionId: true,
        adsConversionLabel: true,
        lastError: true,
        lastSyncAt: true,
        syncAttempts: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tracking) {
      return NextResponse.json(
        { error: 'Tracking not found' },
        { status: 404 }
      );
    }

    // Build status response
    const statusResponse: {
      tracking: {
        id: string;
        name: string;
        status: TrackingStatus;
        lastSyncAt: Date | null;
        syncAttempts: number;
        lastError: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
      gtm: {
        synced: boolean;
        triggerId: string | null;
        tagIdGA4: string | null;
        tagIdAds: string | null;
        containerId: string | null;
        workspaceId: string | null;
      };
      googleAds: {
        synced: boolean;
        conversionActionId: string | null;
        conversionLabel: string | null;
      };
      jobs?: {
        gtm: any;
        ads: any;
      };
    } = {
      tracking: {
        id: tracking.id,
        name: tracking.name,
        status: tracking.status,
        lastSyncAt: tracking.lastSyncAt,
        syncAttempts: tracking.syncAttempts,
        lastError: tracking.lastError,
        createdAt: tracking.createdAt,
        updatedAt: tracking.updatedAt,
      },
      gtm: {
        synced: !!(tracking.gtmTriggerId && (tracking.gtmTagIdGA4 || tracking.gtmTagIdAds)),
        triggerId: tracking.gtmTriggerId,
        tagIdGA4: tracking.gtmTagIdGA4,
        tagIdAds: tracking.gtmTagIdAds,
        containerId: tracking.gtmContainerId,
        workspaceId: tracking.gtmWorkspaceId,
      },
      googleAds: {
        synced: !!(tracking.conversionActionId || tracking.adsConversionLabel),
        conversionActionId: tracking.conversionActionId,
        conversionLabel: tracking.adsConversionLabel,
      },
    };

    // If tracking is in CREATING or SYNCING state, try to get job status from queue
    if (tracking.status === TrackingStatus.CREATING || tracking.status === TrackingStatus.SYNCING) {
      try {
        // Get recent job IDs from query params or attempt to find active jobs
        const { searchParams } = new URL(request.url);
        const gtmJobId = searchParams.get('gtmJobId');
        const adsJobId = searchParams.get('adsJobId');

        const jobsStatus: { gtm: any; ads: any } = {
          gtm: null,
          ads: null,
        };

        if (gtmJobId) {
          jobsStatus.gtm = await getJobStatus(QUEUE_NAMES.GTM_SYNC, gtmJobId);
        }

        if (adsJobId) {
          jobsStatus.ads = await getJobStatus(QUEUE_NAMES.ADS_SYNC, adsJobId);
        }

        statusResponse.jobs = jobsStatus;
      } catch (jobError) {
        // Job status retrieval failed, but continue with main response
        console.warn('Failed to retrieve job status:', jobError);
      }
    }

    // Determine overall health
    const isHealthy = tracking.status === TrackingStatus.ACTIVE && !tracking.lastError;
    const needsAttention = tracking.status === TrackingStatus.FAILED ||
                          (tracking.syncAttempts > 0 && tracking.lastError);

    return NextResponse.json({
      ...statusResponse,
      health: {
        isHealthy,
        needsAttention,
        statusLabel: getStatusLabel(tracking.status),
        statusColor: getStatusColor(tracking.status),
      },
    });
  } catch (error) {
    console.error('Error getting tracking status:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to get tracking status' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusLabel(status: TrackingStatus): string {
  const labels: Record<TrackingStatus, string> = {
    PENDING: 'Pending Sync',
    CREATING: 'Creating in GTM',
    ACTIVE: 'Active',
    FAILED: 'Sync Failed',
    PAUSED: 'Paused',
    SYNCING: 'Syncing Updates',
  };
  return labels[status] || 'Unknown';
}

function getStatusColor(status: TrackingStatus): string {
  const colors: Record<TrackingStatus, string> = {
    PENDING: 'yellow',
    CREATING: 'blue',
    ACTIVE: 'green',
    FAILED: 'red',
    PAUSED: 'gray',
    SYNCING: 'blue',
  };
  return colors[status] || 'gray';
}
