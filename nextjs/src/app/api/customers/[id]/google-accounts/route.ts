// GET /api/customers/[id]/google-accounts
// Lists available GTM accounts for the authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Verify customer exists, belongs to tenant, and has Google connected
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId, userId: session.id },
      select: { id: true, googleAccountId: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.googleAccountId) {
      return NextResponse.json(
        { error: 'Customer is not connected to Google' },
        { status: 400 }
      );
    }

    // Find userId that has the OAuth tokens
    const oauthToken = await prisma.oAuthToken.findFirst({
      where: { tenantId: session.tenantId, provider: 'google', scope: 'gtm' },
      select: { userId: true },
    });
    const tokenUserId = oauthToken?.userId || session.id;

    const { listGtmAccounts } = await import('@/lib/google/gtm');
    const gtmAccounts = await listGtmAccounts(tokenUserId, session.tenantId);

    return NextResponse.json({ gtmAccounts });
  } catch (error) {
    console.error('GET /api/customers/[id]/google-accounts error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
