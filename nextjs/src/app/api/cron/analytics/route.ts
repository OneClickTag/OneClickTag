import { NextRequest, NextResponse } from 'next/server';
import { addAnalyticsJob } from '@/lib/queue';

// Vercel Cron job for daily analytics aggregation
export async function GET(request: NextRequest) {
  // Verify this is a cron request from Vercel
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Get all tenants and queue analytics jobs
    const prisma = (await import('@/lib/prisma')).default;
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const jobs = await Promise.all(
      tenants.map((tenant) =>
        addAnalyticsJob({
          tenantId: tenant.id,
          aggregationType: 'DAILY',
          dateRangeStart: yesterday.toISOString(),
          dateRangeEnd: endOfYesterday.toISOString(),
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Queued ${jobs.length} analytics jobs`,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron analytics error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
