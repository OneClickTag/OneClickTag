import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { CookieConsentCategory } from '@prisma/client';

interface CreateCookieCategoryBody {
  category: CookieConsentCategory;
  name: string;
  description: string;
  isRequired: boolean;
}

/**
 * GET /api/compliance/cookie-categories
 * List all cookie categories for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const categories = await prisma.cookieCategory.findMany({
      where: { tenantId: session.tenantId },
      include: {
        cookies: true,
      },
      orderBy: {
        category: 'asc',
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('List cookie categories error:', error);

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
 * POST /api/compliance/cookie-categories
 * Create a new cookie category
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const body: CreateCookieCategoryBody = await request.json();

    // Validate required fields
    if (!body.category || !body.name || !body.description || body.isRequired === undefined) {
      return NextResponse.json(
        { error: 'category, name, description, and isRequired are required' },
        { status: 400 }
      );
    }

    // Validate category enum
    const validCategories = Object.values(CookieConsentCategory);
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const category = await prisma.cookieCategory.create({
      data: {
        tenantId: session.tenantId,
        category: body.category,
        name: body.name,
        description: body.description,
        isRequired: body.isRequired,
      },
      include: {
        cookies: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Create cookie category error:', error);

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
