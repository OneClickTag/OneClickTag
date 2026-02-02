import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/content-pages/[id]/publish - Publish or unpublish content page
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;
    const body = await request.json();
    const { isPublished } = body;

    if (typeof isPublished !== 'boolean') {
      return NextResponse.json({ error: 'isPublished must be a boolean' }, { status: 400 });
    }

    const page = await prisma.contentPage.findUnique({ where: { id } });

    if (!page) {
      return NextResponse.json(
        { error: `Content page with ID ${id} not found` },
        { status: 404 }
      );
    }

    const updatedPage = await prisma.contentPage.update({
      where: { id },
      data: { isPublished },
    });

    // Note: Pages use dynamic = 'force-dynamic' so they always fetch fresh data

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error publishing content page:', error);
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Admin access required') || error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
