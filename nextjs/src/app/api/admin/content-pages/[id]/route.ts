import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/content-pages/[id] - Get content page by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;

    const page = await prisma.contentPage.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json(
        { error: `Content page with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching content page:', error);
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

// PUT /api/admin/content-pages/[id] - Update content page
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;
    const body = await request.json();
    const { title, slug, content, isPublished, order, metadata, metaTitle, metaDescription } = body;

    const page = await prisma.contentPage.findUnique({ where: { id } });

    if (!page) {
      return NextResponse.json(
        { error: `Content page with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Check if slug is being changed and if it's already taken
    if (slug && slug !== page.slug) {
      const existing = await prisma.contentPage.findUnique({
        where: { slug },
      });

      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: `Content page with slug "${slug}" already exists` },
          { status: 400 }
        );
      }
    }

    const updatedPage = await prisma.contentPage.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(content !== undefined && { content }),
        ...(isPublished !== undefined && { isPublished }),
        ...(order !== undefined && { order }),
        ...(metadata !== undefined && { metadata }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        updatedBy: session.id,
      },
    });

    // Note: Pages use dynamic = 'force-dynamic' so they always fetch fresh data

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error updating content page:', error);
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

// DELETE /api/admin/content-pages/[id] - Delete content page
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;

    const page = await prisma.contentPage.findUnique({ where: { id } });

    if (!page) {
      return NextResponse.json(
        { error: `Content page with ID ${id} not found` },
        { status: 404 }
      );
    }

    await prisma.contentPage.delete({ where: { id } });

    // Note: Pages use dynamic = 'force-dynamic' so they always fetch fresh data

    return NextResponse.json({ message: 'Content page deleted successfully' });
  } catch (error) {
    console.error('Error deleting content page:', error);
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
