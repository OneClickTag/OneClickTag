// POST /api/customers/[id]/scans/[scanId]/recommendations/bulk-accept

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
    const { recommendationIds } = body;

    if (!Array.isArray(recommendationIds) || recommendationIds.length === 0) {
      return NextResponse.json({ error: 'recommendationIds array is required' }, { status: 400 });
    }

    // Verify scan belongs to customer and tenant
    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId, customer: { userId: session.id } },
    });
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const result = await prisma.trackingRecommendation.updateMany({
      where: {
        id: { in: recommendationIds },
        scanId,
        status: 'PENDING',
      },
      data: { status: 'ACCEPTED' },
    });

    return NextResponse.json({ accepted: result.count });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to bulk accept:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
