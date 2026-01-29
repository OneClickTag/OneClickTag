import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

// GET /api/analytics/customers/[customerId] - Get analytics for a specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { customerId } = params;

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: session.tenantId,
      },
      include: {
        googleAdsAccounts: true,
        ga4Properties: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const [
      totalTrackings,
      trackingsByStatus,
      trackingsByType,
      recentTrackings,
      conversionActions,
    ] = await Promise.all([
      // Total trackings
      prisma.tracking.count({
        where: { customerId },
      }),
      // Trackings by status
      prisma.tracking.groupBy({
        by: ['status'],
        where: { customerId },
        _count: true,
      }),
      // Trackings by type
      prisma.tracking.groupBy({
        by: ['type'],
        where: { customerId },
        _count: true,
      }),
      // Recent trackings
      prisma.tracking.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          lastError: true,
          lastSyncAt: true,
          createdAt: true,
        },
      }),
      // Conversion actions
      prisma.conversionAction.findMany({
        where: { customerId },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          googleConversionActionId: true,
        },
      }),
    ]);

    const statusCounts = trackingsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    const typeCounts = trackingsByType.reduce(
      (acc, item) => {
        acc[item.type] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        googleConnected: !!customer.googleAccountId,
        googleEmail: customer.googleEmail,
        adsAccountsCount: customer.googleAdsAccounts.length,
        ga4PropertiesCount: customer.ga4Properties.length,
      },
      overview: {
        totalTrackings,
        activeTrackings: statusCounts['ACTIVE'] || 0,
        failedTrackings: statusCounts['FAILED'] || 0,
        pendingTrackings: statusCounts['PENDING'] || 0,
      },
      trackingsByStatus: statusCounts,
      trackingsByType: typeCounts,
      recentTrackings,
      conversionActions,
      googleAdsAccounts: customer.googleAdsAccounts,
      ga4Properties: customer.ga4Properties,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch customer analytics:', message);

    if (message === 'Unauthorized' || message === 'No tenant associated with user') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
