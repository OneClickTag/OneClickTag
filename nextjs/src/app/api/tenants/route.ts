import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

// GET /api/tenants - Get current user's tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAuth(session);

    if (!session.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 404 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true,
        name: true,
        domain: true,
        settings: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch tenant:', message);

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

// PUT /api/tenants - Update current user's tenant
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAuth(session);

    if (!session.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 404 });
    }

    const body = await request.json();
    const { name, settings } = body;

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        ...(name && { name }),
        ...(settings !== undefined && { settings }),
      },
      select: {
        id: true,
        name: true,
        domain: true,
        settings: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update tenant:', message);

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}
