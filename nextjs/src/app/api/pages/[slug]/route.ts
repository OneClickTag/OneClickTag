import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Valid page slugs - NO DEFAULT CONTENT, everything comes from DB
const validSlugs = ['about', 'terms', 'privacy'];

// GET /api/pages/[slug] - Get public page content from database ONLY
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Check if it's a valid page slug
    if (!validSlugs.includes(slug)) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Get content from ContentPage table (same as the SSR pages use)
    const page = await prisma.contentPage.findUnique({
      where: { slug },
    });

    // If page doesn't exist or is not published, return 404
    if (!page || !page.isPublished) {
      return NextResponse.json({
        error: 'Page not configured',
        message: `No published content page found for slug "${slug}". Create it in Admin → Content Pages.`
      }, { status: 404 });
    }

    // Return database content
    return NextResponse.json({
      slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
