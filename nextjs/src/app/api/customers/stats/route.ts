// GET /api/customers/stats - Get customer statistics

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { getCustomerStats } from '@/lib/api/customers/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    // Get customer statistics with multi-tenant filtering
    const stats = await getCustomerStats(session.tenantId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/customers/stats error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json(
          { error: 'No tenant associated with user' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
