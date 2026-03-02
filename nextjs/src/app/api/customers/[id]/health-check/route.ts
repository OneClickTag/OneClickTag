import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { verifyCustomerHealth } from '@/lib/health-check/verify-customer';
import { broadcastHealthProgress } from '@/lib/supabase/health-progress';

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const customerId = params.id;

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: session.tenantId },
      select: { id: true, lastHealthCheckAt: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Rate limit: reject if last check was < 5 minutes ago
    if (customer.lastHealthCheckAt) {
      const elapsed = Date.now() - customer.lastHealthCheckAt.getTime();
      if (elapsed < RATE_LIMIT_MS) {
        const waitSeconds = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before checking again` },
          { status: 429 },
        );
      }
    }

    const result = await verifyCustomerHealth(customerId);

    // Broadcast result via Supabase
    if (result.totalChecked > 0) {
      await broadcastHealthProgress(customerId, {
        type: 'health_checked',
        timestamp: new Date().toISOString(),
        data: {
          customerId,
          totalChecked: result.totalChecked,
          healthy: result.healthy,
          issues: result.issues,
          trackingIssues: result.trackingIssues,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized' || message === 'No tenant associated with user') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error('[HealthCheck] On-demand error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
