// GET /api/customers/[id]/analytics - Get customer analytics

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import {
  getCustomerAnalytics,
  CustomerNotFoundError,
} from '@/lib/api/customers/service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    // Get analytics with multi-tenant filtering
    const result = await getCustomerAnalytics(
      id,
      session.tenantId,
      session.id,
      fromDate,
      toDate
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(`GET /api/customers/[id]/analytics error:`, error);

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

    if (error instanceof CustomerNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
