import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/seo
 * List all page SEO settings with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const excludedOnly = searchParams.get('excludedOnly') === 'true';
    const noIndexOnly = searchParams.get('noIndexOnly') === 'true';

    const where: Record<string, boolean> = {};
    if (excludedOnly) where.excludeFromSitemap = true;
    if (noIndexOnly) where.noIndex = true;

    const pageSeoSettings = await prisma.pageSeoSettings.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { pageSlug: 'asc' },
    });

    // Get list of all known pages for displaying options
    const contentPages = await prisma.contentPage.findMany({
      where: { isPublished: true },
      select: { slug: true, title: true },
    });

    // Static pages that should appear in SEO management
    const staticPages = [
      { slug: '/', title: 'Homepage' },
      { slug: '/early-access', title: 'Early Access' },
      { slug: '/contact', title: 'Contact' },
      { slug: '/thank-you', title: 'Thank You' },
      { slug: '/login', title: 'Login' },
      { slug: '/register', title: 'Register' },
    ];

    // Combine all pages
    const allPages = [
      ...staticPages,
      ...contentPages.map((p) => ({
        slug: `/content/${p.slug}`,
        title: p.title,
      })),
    ];

    // Merge with existing SEO settings
    const pagesWithSeo = allPages.map((page) => {
      const seoSetting = pageSeoSettings.find((s) => s.pageSlug === page.slug);
      return {
        pageSlug: page.slug,
        pageTitle: page.title,
        seoSettings: seoSetting || null,
      };
    });

    return NextResponse.json({
      pages: pagesWithSeo,
      settings: pageSeoSettings,
    });
  } catch (error) {
    console.error('Error fetching page SEO settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page SEO settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/seo
 * Create or update page SEO settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pageSlug,
      metaTitle,
      metaDescription,
      canonicalUrl,
      noIndex,
      noFollow,
      structuredData,
      sitemapPriority,
      sitemapFreq,
      excludeFromSitemap,
    } = body;

    if (!pageSlug) {
      return NextResponse.json(
        { error: 'pageSlug is required' },
        { status: 400 }
      );
    }

    // Validate structured data if provided
    if (structuredData && structuredData.trim() !== '') {
      try {
        JSON.parse(structuredData);
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON in structuredData' },
          { status: 400 }
        );
      }
    }

    // Validate sitemap priority
    const priority = sitemapPriority !== undefined ? parseFloat(sitemapPriority) : 0.5;
    if (priority < 0 || priority > 1) {
      return NextResponse.json(
        { error: 'sitemapPriority must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Validate sitemap frequency
    const validFreqs = ['daily', 'weekly', 'monthly', 'yearly', 'always', 'hourly', 'never'];
    const freq = sitemapFreq || 'monthly';
    if (!validFreqs.includes(freq)) {
      return NextResponse.json(
        { error: 'Invalid sitemapFreq value' },
        { status: 400 }
      );
    }

    // Upsert the page SEO settings
    const pageSeoSettings = await prisma.pageSeoSettings.upsert({
      where: { pageSlug },
      update: {
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        canonicalUrl: canonicalUrl || null,
        noIndex: Boolean(noIndex),
        noFollow: Boolean(noFollow),
        structuredData: structuredData || null,
        sitemapPriority: priority,
        sitemapFreq: freq,
        excludeFromSitemap: Boolean(excludeFromSitemap),
        updatedAt: new Date(),
      },
      create: {
        pageSlug,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        canonicalUrl: canonicalUrl || null,
        noIndex: Boolean(noIndex),
        noFollow: Boolean(noFollow),
        structuredData: structuredData || null,
        sitemapPriority: priority,
        sitemapFreq: freq,
        excludeFromSitemap: Boolean(excludeFromSitemap),
      },
    });

    return NextResponse.json(pageSeoSettings);
  } catch (error) {
    console.error('Error saving page SEO settings:', error);
    return NextResponse.json(
      { error: 'Failed to save page SEO settings' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/seo
 * Delete page SEO settings (revert to defaults)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageSlug } = body;

    if (!pageSlug) {
      return NextResponse.json(
        { error: 'pageSlug is required' },
        { status: 400 }
      );
    }

    await prisma.pageSeoSettings.delete({
      where: { pageSlug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page SEO settings:', error);
    return NextResponse.json(
      { error: 'Failed to delete page SEO settings' },
      { status: 500 }
    );
  }
}
