// POST /api/customers/[id]/connect-google - Connect Google account

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { CustomerNotFoundError } from '@/lib/api/customers/service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Validate connect Google input
function validateConnectInput(
  data: unknown
): { valid: true; code: string; redirectUri?: string } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const input = data as Record<string, unknown>;

  if (!input.code || typeof input.code !== 'string') {
    return { valid: false, error: 'Authorization code is required' };
  }

  if (input.redirectUri !== undefined && typeof input.redirectUri !== 'string') {
    return { valid: false, error: 'Redirect URI must be a string' };
  }

  return {
    valid: true,
    code: input.code,
    redirectUri: input.redirectUri as string | undefined,
  };
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

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = validateConnectInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // NOTE: The actual Google OAuth integration logic would go here
    // This requires the GoogleIntegrationService which handles:
    // 1. Exchanging the authorization code for tokens
    // 2. Storing tokens in the database
    // 3. Syncing Google Ads accounts
    // 4. Syncing GA4 properties
    // 5. Setting up GTM workspace and essentials
    //
    // For now, we return a placeholder response indicating this endpoint
    // needs the Google integration service to be migrated

    // TODO: Migrate GoogleIntegrationService from NestJS
    // The service is located at:
    // /Users/orharazi/OneClickTag/backend/src/modules/customer/services/google-integration.service.ts

    return NextResponse.json(
      {
        error: 'Google integration service not yet migrated to Next.js',
        message: 'This endpoint requires the GoogleIntegrationService to be migrated from the NestJS backend',
        customerId: id,
        // Returning the structure that would be expected
        expectedResponse: {
          id: customer.id,
          googleAccountId: null,
          googleEmail: null,
          googleAccount: {
            connected: false,
            hasGTMAccess: false,
            hasGA4Access: false,
            hasAdsAccess: false,
          },
        },
      },
      { status: 501 }
    );
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
