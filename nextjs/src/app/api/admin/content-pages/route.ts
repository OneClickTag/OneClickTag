import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// GET /api/admin/content-pages - Get all content pages
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const publishedParam = searchParams.get('published');
    const published = publishedParam === 'true' ? true : publishedParam === 'false' ? false : undefined;

    const where = published !== undefined ? { isPublished: published } : {};

    const pages = await prisma.contentPage.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching content pages:', error);
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

// POST /api/admin/content-pages - Create content page
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const { title, slug, content, isPublished, order, metaTitle, metaDescription } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await prisma.contentPage.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Content page with slug "${slug}" already exists` },
        { status: 400 }
      );
    }

    const page = await prisma.contentPage.create({
      data: {
        title,
        slug,
        content,
        isPublished: isPublished ?? false,
        order: order ?? 0,
        metaTitle,
        metaDescription,
        createdBy: session.id,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('Error creating content page:', error);
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
