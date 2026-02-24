// GET /api/customers/[id]/trackings - Get customer trackings

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import {
  getCustomerTrackings,
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
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    const pageNum = page ? parseInt(page, 10) : 0;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    // Get trackings with multi-tenant filtering
    const result = await getCustomerTrackings(
      id,
      session.tenantId,
      session.id,
      pageNum,
      limitNum
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(`GET /api/customers/[id]/trackings error:`, error);

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
