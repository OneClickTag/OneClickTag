// GET /api/customers/[id]/scans/[scanId] - Get scan details

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { getScan } from '@/lib/site-scanner/services/site-scanner';

interface RouteParams {
  params: Promise<{ id: string; scanId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId, scanId } = await params;

    const scan = await getScan(customerId, scanId, session.tenantId, session.id);

    return NextResponse.json(scan);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Scan not found') {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
    console.error('Failed to get scan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
