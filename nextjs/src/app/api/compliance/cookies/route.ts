import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

interface CreateCookieBody {
  categoryId: string;
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  type?: string;
}

/**
 * GET /api/compliance/cookies
 * List all cookies for the tenant
 * Optional query param: categoryId to filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const cookies = await prisma.cookie.findMany({
      where: {
        tenantId: session.tenantId,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(cookies);
  } catch (error) {
    console.error('List cookies error:', error);

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
 * POST /api/compliance/cookies
 * Create a new cookie
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const body: CreateCookieBody = await request.json();

    // Validate required fields
    if (!body.categoryId || !body.name || !body.provider || !body.purpose || !body.duration) {
      return NextResponse.json(
        { error: 'categoryId, name, provider, purpose, and duration are required' },
        { status: 400 }
      );
    }

    // Verify category exists and belongs to tenant
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

    const cookie = await prisma.cookie.create({
      data: {
        tenantId: session.tenantId,
        categoryId: body.categoryId,
        name: body.name,
        provider: body.provider,
        purpose: body.purpose,
        duration: body.duration,
        type: body.type,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(cookie, { status: 201 });
  } catch (error) {
    console.error('Create cookie error:', error);

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
 * DELETE /api/compliance/cookies
 * Bulk delete cookies
 * Request body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      );
    }

    // Use transaction for atomic operation
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      // Verify all cookies exist and belong to tenant
      const cookies = await tx.cookie.findMany({
        where: {
          id: { in: ids },
          tenantId: session.tenantId,
        },
      });

      if (cookies.length !== ids.length) {
        const foundIds = cookies.map((c: { id: string }) => c.id);
        const missing = ids.filter((id: string) => !foundIds.includes(id));
        throw new Error(`Cookies with IDs ${missing.join(', ')} not found or do not belong to this tenant`);
      }

      // Delete all cookies
      return await tx.cookie.deleteMany({
        where: {
          id: { in: ids },
          tenantId: session.tenantId,
        },
      });
    });

    return NextResponse.json({
      message: 'Cookies deleted successfully',
      count: result.count
    });
  } catch (error) {
    console.error('Bulk delete cookies error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
      }
      if (error.message.includes('not found or do not belong')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
