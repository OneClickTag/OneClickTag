import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

interface UpdateCookieBody {
  categoryId?: string;
  name?: string;
  provider?: string;
  purpose?: string;
  duration?: string;
  type?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/compliance/cookies/[id]
 * Get a specific cookie
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    const cookie = await prisma.cookie.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
      include: {
        category: true,
      },
    });

    if (!cookie) {
      return NextResponse.json(
        { error: `Cookie with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(cookie);
  } catch (error) {
    console.error('Get cookie error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/compliance/cookies/[id]
 * Update a cookie
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;
    const body: UpdateCookieBody = await request.json();

    // Verify cookie exists and belongs to tenant
    const existing = await prisma.cookie.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Cookie with ID ${id} not found` },
        { status: 404 }
      );
    }

    // If updating category, verify new category belongs to tenant
    if (body.categoryId) {
      const category = await prisma.cookieCategory.findFirst({
        where: {
          id: body.categoryId,
          tenantId: session.tenantId,
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: `Cookie category with ID ${body.categoryId} not found` },
          { status: 404 }
        );
      }
    }

    const cookie = await prisma.cookie.update({
      where: { id },
      data: {
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.provider !== undefined && { provider: body.provider }),
        ...(body.purpose !== undefined && { purpose: body.purpose }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.type !== undefined && { type: body.type }),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(cookie);
  } catch (error) {
    console.error('Update cookie error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/compliance/cookies/[id]
 * Delete a cookie
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Verify cookie exists and belongs to tenant
    const existing = await prisma.cookie.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Cookie with ID ${id} not found` },
        { status: 404 }
      );
    }

    await prisma.cookie.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Cookie deleted successfully' });
  } catch (error) {
    console.error('Delete cookie error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
