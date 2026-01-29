// GET /api/customers/by-slug/[slug] - Get customer by slug

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import {
  findCustomerBySlug,
  CustomerNotFoundError,
} from '@/lib/api/customers/service';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and verify tenant
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { slug } = await params;

    // Check if includeGoogleAds is requested
    const { searchParams } = new URL(request.url);
    const includeGoogleAds = searchParams.get('includeGoogleAds') === 'true';

    // Get customer by slug with multi-tenant filtering
    const customer = await findCustomerBySlug(
      slug,
      session.tenantId,
      includeGoogleAds
    );

    return NextResponse.json(customer);
  } catch (error) {
    console.error(`GET /api/customers/by-slug/[slug] error:`, error);

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
