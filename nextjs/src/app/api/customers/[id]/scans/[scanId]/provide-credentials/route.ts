// POST /api/customers/[id]/scans/[scanId]/provide-credentials
// Submit login credentials mid-scan when authentication is detected

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
    const { username, password, saveForFuture } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Verify scan exists and belongs to customer
    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId },
      select: { id: true, status: true, websiteUrl: true, tenantId: true },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (scan.status !== 'AWAITING_AUTH') {
      return NextResponse.json(
        { error: `Cannot provide credentials in status: ${scan.status}` },
        { status: 400 }
      );
    }

    // Update scan status to resume crawling
    await prisma.siteScan.update({
      where: { id: scanId },
      data: { status: 'DEEP_CRAWLING' },
    });

    // Note: We don't store credentials in the database for now since encryption
    // is not yet implemented. The credentials are returned to the client who
    // passes them to subsequent process-chunk calls.

    return NextResponse.json({
      success: true,
      message: 'Credentials received. Resuming scan...',
      // Return credentials back so the client can pass them to process-chunk
      credentials: { username, password },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Provide credentials error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save credentials';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
