import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyCustomerHealth } from '@/lib/health-check/verify-customer';
import { broadcastHealthProgress } from '@/lib/supabase/health-progress';

const MAX_RUNTIME_MS = 25_000;
const ADVISORY_LOCK_ID = 43;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Acquire advisory lock to prevent concurrent cron invocations
    const lockResult = await prisma.$queryRawUnsafe<{ locked: boolean }[]>(
      `SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) as locked`,
    );
    if (!lockResult[0]?.locked) {
      return NextResponse.json({
        success: true,
        message: 'Another instance is already processing',
        skipped: true,
      });
    }

    try {
      // Select up to 3 customers ordered by lastHealthCheckAt ASC NULLS FIRST
      // Only customers with Google connected and GTM container set up
      const customers = await prisma.customer.findMany({
        where: {
          googleAccountId: { not: null },
          gtmContainerId: { not: null },
        },
        orderBy: {
          lastHealthCheckAt: { sort: 'asc', nulls: 'first' },
        },
        take: 3,
        select: { id: true, fullName: true },
      });

      let checked = 0;
      let issuesFound = 0;

      for (const customer of customers) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) break;

        try {
          const result = await verifyCustomerHealth(customer.id);
          checked++;

          if (result.issues > 0) {
            issuesFound += result.issues;
          }

          // Broadcast result via Supabase
          if (result.totalChecked > 0) {
            await broadcastHealthProgress(customer.id, {
              type: 'health_checked',
              timestamp: new Date().toISOString(),
              data: {
                customerId: customer.id,
                totalChecked: result.totalChecked,
                healthy: result.healthy,
                issues: result.issues,
                trackingIssues: result.trackingIssues,
              },
            });
          }
        } catch (error) {
          // Per-customer error — log and continue
          const msg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[HealthCron] Failed for customer ${customer.id} (${customer.fullName}):`, msg);
        }
      }

      return NextResponse.json({
        success: true,
        checked,
        issuesFound,
        durationMs: Date.now() - startTime,
      });
    } finally {
      await prisma.$queryRawUnsafe(
        `SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HealthCron] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
