import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { CookieConsentCategory } from '@prisma/client';

interface UpdateCookieCategoryBody {
  category?: CookieConsentCategory;
  name?: string;
  description?: string;
  isRequired?: boolean;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/compliance/cookie-categories/[id]
 * Get a specific cookie category
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    const category = await prisma.cookieCategory.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
      include: {
        cookies: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: `Cookie category with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Get cookie category error:', error);

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
 * PUT /api/compliance/cookie-categories/[id]
 * Update a cookie category
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;
    const body: UpdateCookieCategoryBody = await request.json();

    // Verify category exists and belongs to tenant
    const existing = await prisma.cookieCategory.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Cookie category with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Validate category enum if provided
    if (body.category) {
      const validCategories = Object.values(CookieConsentCategory);
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const category = await prisma.cookieCategory.update({
      where: { id },
      data: {
        ...(body.category !== undefined && { category: body.category }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isRequired !== undefined && { isRequired: body.isRequired }),
      },
      include: {
        cookies: true,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Update cookie category error:', error);

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
 * DELETE /api/compliance/cookie-categories/[id]
 * Delete a cookie category (cascades to related cookies)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Verify category exists and belongs to tenant
    const existing = await prisma.cookieCategory.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Cookie category with ID ${id} not found` },
        { status: 404 }
      );
    }

    await prisma.cookieCategory.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Cookie category deleted successfully' });
  } catch (error) {
    console.error('Delete cookie category error:', error);

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
