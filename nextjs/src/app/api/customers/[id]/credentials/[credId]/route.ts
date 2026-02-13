// DELETE /api/customers/[id]/credentials/[credId] - Remove stored credentials

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; credId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId, credId } = await params;

    // Verify credential belongs to customer + tenant
    const credential = await prisma.siteCredential.findFirst({
      where: { id: credId, customerId, tenantId: session.tenantId },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    await prisma.siteCredential.delete({
      where: { id: credId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to delete credential:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
