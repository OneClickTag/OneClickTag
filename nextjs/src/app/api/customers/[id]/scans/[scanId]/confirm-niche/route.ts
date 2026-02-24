// POST /api/customers/[id]/scans/[scanId]/confirm-niche

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; scanId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId, scanId } = await params;

    const body = await request.json();
    const { niche } = body;

    if (!niche || typeof niche !== 'string') {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId, customer: { userId: session.id } },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (scan.status !== 'NICHE_DETECTED' && scan.status !== 'AWAITING_CONFIRMATION') {
      return NextResponse.json({ error: 'Scan is not awaiting niche confirmation' }, { status: 400 });
    }

    const updated = await prisma.siteScan.update({
      where: { id: scanId },
      data: {
        confirmedNiche: niche,
        status: 'DEEP_CRAWLING',
      },
    });

    // Phase 2 is now client-driven via /process-chunk calls
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to confirm niche:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
