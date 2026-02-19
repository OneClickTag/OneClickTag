import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// Static page slugs managed by this endpoint
const STATIC_PAGE_SLUGS = ['about', 'terms', 'privacy', 'cookie-policy'];

const DEFAULT_TITLES: Record<string, string> = {
  about: 'About Us',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  'cookie-policy': 'Cookie Policy',
};

// GET /api/admin/static-pages - Get all static pages or a specific page
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      // Get specific page
      if (!STATIC_PAGE_SLUGS.includes(slug)) {
        return NextResponse.json({ error: 'Invalid static page slug' }, { status: 400 });
      }

      const page = await prisma.contentPage.findUnique({
        where: { slug },
      });

      if (page) {
        return NextResponse.json({
          slug: page.slug,
          title: page.title,
          content: page.content,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          isPublished: page.isPublished,
          updatedAt: page.updatedAt,
        });
      }

      // Return empty page if not exists
      return NextResponse.json({
        slug,
        title: DEFAULT_TITLES[slug] || slug,
        content: '',
        metaTitle: '',
        metaDescription: '',
        isPublished: false,
        updatedAt: null,
      });
    }

    // Get all static pages
    const pages = await prisma.contentPage.findMany({
      where: {
        slug: { in: STATIC_PAGE_SLUGS },
      },
      orderBy: { order: 'asc' },
    });

    // Build response with all static pages (including those not yet created)
    const allPages = STATIC_PAGE_SLUGS.map((pageSlug) => {
      const savedPage = pages.find((p) => p.slug === pageSlug);
      return {
        slug: pageSlug,
        title: savedPage?.title || DEFAULT_TITLES[pageSlug] || pageSlug,
        content: savedPage?.content || '',
        metaTitle: savedPage?.metaTitle || '',
        metaDescription: savedPage?.metaDescription || '',
        isPublished: savedPage?.isPublished ?? false,
        updatedAt: savedPage?.updatedAt || null,
      };
    });

    return NextResponse.json(allPages);
  } catch (error) {
    console.error('Error fetching static pages:', error);
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/static-pages - Update or create a static page
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const { slug, title, content, metaTitle, metaDescription, isPublished } = body;

    if (!slug || !STATIC_PAGE_SLUGS.includes(slug)) {
      return NextResponse.json({ error: 'Invalid static page slug' }, { status: 400 });
    }

    // Check if page exists
    const existingPage = await prisma.contentPage.findUnique({
      where: { slug },
    });

    let page;
    if (existingPage) {
      page = await prisma.contentPage.update({
        where: { slug },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(metaTitle !== undefined && { metaTitle }),
          ...(metaDescription !== undefined && { metaDescription }),
          ...(isPublished !== undefined && { isPublished }),
        },
      });
    } else {
      page = await prisma.contentPage.create({
        data: {
          slug,
          title: title || DEFAULT_TITLES[slug] || slug,
          content: content || '',
          metaTitle: metaTitle || '',
          metaDescription: metaDescription || '',
          isPublished: isPublished ?? false,
          order: STATIC_PAGE_SLUGS.indexOf(slug),
        },
      });
    }

    // Note: Pages use dynamic = 'force-dynamic' so they always fetch fresh data
    // No revalidation needed

    return NextResponse.json({
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      isPublished: page.isPublished,
      updatedAt: page.updatedAt,
    });
  } catch (error) {
    console.error('Error updating static page:', error);
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Admin access required')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
