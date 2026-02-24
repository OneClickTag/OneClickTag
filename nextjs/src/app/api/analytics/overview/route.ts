import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/analytics/overview - Get analytics overview for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const userFilter = { tenantId: session.tenantId, userId: session.id };
    const trackingUserFilter = { tenantId: session.tenantId, customer: { userId: session.id } };

    const [
      totalCustomers,
      activeCustomers,
      totalTrackings,
      trackingsByStatus,
      recentTrackings,
      customerGrowth,
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({
        where: userFilter,
      }),
      // Active customers (with Google connected)
      prisma.customer.count({
        where: {
          ...userFilter,
          googleAccountId: { not: null },
        },
      }),
      // Total trackings
      prisma.tracking.count({
        where: trackingUserFilter,
      }),
      // Trackings by status
      prisma.tracking.groupBy({
        by: ['status'],
        where: trackingUserFilter,
        _count: true,
      }),
      // Recent trackings (last 10)
      prisma.tracking.findMany({
        where: trackingUserFilter,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      // Customer growth (last 30 days)
      prisma.customer.groupBy({
        by: ['createdAt'],
        where: {
          ...userFilter,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: true,
      }),
    ]);

    // Transform trackings by status
    const statusCounts = trackingsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      overview: {
        totalCustomers,
        activeCustomers,
        totalTrackings,
        activeTrackings: statusCounts['ACTIVE'] || 0,
        failedTrackings: statusCounts['FAILED'] || 0,
        pendingTrackings: statusCounts['PENDING'] || 0,
      },
      trackingsByStatus: statusCounts,
      recentTrackings,
      customerGrowth,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch analytics:', message);

    if (message === 'Unauthorized' || message === 'No tenant associated with user') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
