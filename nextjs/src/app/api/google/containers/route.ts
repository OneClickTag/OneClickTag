import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { listContainers } from '@/lib/google/gtm';

// GET /api/google/containers - List GTM containers for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const containers = await listContainers(session.id, session.tenantId);

    return NextResponse.json(containers);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to list GTM containers:', message);

    if (message === 'Unauthorized' || message === 'No tenant associated with user') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to list containers' }, { status: 500 });
  }
}
