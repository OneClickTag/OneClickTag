import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { listAccessibleAccounts } from '@/lib/google/ads';

// GET /api/google/accounts - List Google Ads accounts for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const accounts = await listAccessibleAccounts(session.id, session.tenantId);

    return NextResponse.json(accounts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to list Google Ads accounts:', message);

    if (message === 'Unauthorized' || message === 'No tenant associated with user') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to list accounts' }, { status: 500 });
  }
}
