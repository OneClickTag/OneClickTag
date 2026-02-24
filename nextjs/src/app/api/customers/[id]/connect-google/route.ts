// POST /api/customers/[id]/connect-google - Initiate Google OAuth for customer

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { getAuthUrl, buildCallbackUrl } from '@/lib/google/oauth';
import { CustomerNotFoundError } from '@/lib/api/customers/service';
import crypto from 'crypto';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Verify customer exists and belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!customer) {
      throw new CustomerNotFoundError(id);
    }

    // Build state object for OAuth callback
    const state = {
      nonce: crypto.randomUUID(),
      userId: session.id,
      tenantId: session.tenantId,
      customerId: id,
      redirectUrl: `${request.nextUrl.origin}/customers/${id}`,
      timestamp: Date.now(),
    };

    // Base64url-encode the state
    const encodedState = Buffer.from(JSON.stringify(state)).toString('base64url');

    // Generate Google OAuth URL using request origin for callback
    const callbackUrl = buildCallbackUrl(request.nextUrl.origin);
    const authUrl = getAuthUrl(encodedState, callbackUrl);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error(`POST /api/customers/[id]/connect-google error:`, error);

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
