import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

/**
 * GET /api/admin/leads/analytics
 * Get lead analytics and statistics - Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Get general statistics
    const [
      totalLeads,
      completedQuestionnaires,
      todayLeads,
      sourceBreakdown,
    ] = await Promise.all([
      // Total leads
      prisma.lead.count(),

      // Completed questionnaires
      prisma.lead.count({
        where: { questionnaireCompleted: true },
      }),

      // Today's leads
      prisma.lead.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Breakdown by source
      prisma.lead.groupBy({
        by: ['source'],
        _count: true,
      }),
    ]);

    const completionRate =
      totalLeads > 0
        ? parseFloat(((completedQuestionnaires / totalLeads) * 100).toFixed(2))
        : 0;

    // Get daily lead counts for the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const leadsForDaily = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date
    const dailyCounts = leadsForDaily.reduce((acc, lead) => {
      const date = lead.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Fill in missing dates with 0
    const dailyLeadCounts = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyLeadCounts.unshift({
        date: dateStr,
        count: dailyCounts[dateStr] || 0,
      });
    }

    // Get page view analytics (last 7 days)
    const pageViewStartDate = new Date();
    pageViewStartDate.setDate(pageViewStartDate.getDate() - 7);
    pageViewStartDate.setHours(0, 0, 0, 0);

    const [totalViews, uniqueSessions, topPages] = await Promise.all([
      // Total page views
      prisma.leadPageView.count({
        where: {
          createdAt: { gte: pageViewStartDate },
        },
      }),

      // Unique sessions
      prisma.leadPageView.findMany({
        where: {
          createdAt: { gte: pageViewStartDate },
        },
        distinct: ['sessionId'],
        select: {
          sessionId: true,
        },
      }),

      // Top pages
      prisma.leadPageView.groupBy({
        by: ['path'],
        where: {
          createdAt: { gte: pageViewStartDate },
        },
        _count: true,
        orderBy: {
          _count: {
            path: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalLeads,
        completedQuestionnaires,
        pendingQuestionnaires: totalLeads - completedQuestionnaires,
        todayLeads,
        completionRate,
        sourceBreakdown: sourceBreakdown.map((s) => ({
          source: s.source || 'unknown',
          count: s._count,
        })),
      },
      dailyLeadCounts,
      pageViewStats: {
        totalViews,
        uniqueSessions: uniqueSessions.length,
        topPages: topPages.map((p) => ({
          path: p.path,
          views: p._count,
        })),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to fetch lead analytics: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch lead analytics', message: errorMessage },
      { status: 500 }
    );
  }
}
