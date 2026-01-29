import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

// GET /api/users - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAuth(session);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch user:', message);

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/users - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAuth(session);

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update user:', message);

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
