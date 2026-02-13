// POST /api/customers/[id]/scans/[scanId]/cancel

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

    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const terminalStatuses = ['COMPLETED', 'FAILED', 'CANCELLED'];
    if (terminalStatuses.includes(scan.status)) {
      return NextResponse.json({ error: `Cannot cancel scan in status: ${scan.status}` }, { status: 400 });
    }

    const updated = await prisma.siteScan.update({
      where: { id: scanId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to cancel scan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
