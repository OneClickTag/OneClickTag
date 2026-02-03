import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/seo/sitemap
 * Get sitemap preview data for admin panel
 */
export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oneclicktag.com';

    // Get all page SEO settings
    const pageSeoSettings = await prisma.pageSeoSettings.findMany({
      orderBy: { pageSlug: 'asc' },
    });

    const seoSettingsMap = new Map(
      pageSeoSettings.map((s) => [s.pageSlug, s])
    );

    // Get content pages
    const contentPages = await prisma.contentPage.findMany({
      where: { isPublished: true },
      select: { slug: true, title: true, updatedAt: true },
    });

    // Static pages
    const staticPages = [
      { slug: '/', title: 'Homepage', updatedAt: new Date() },
      { slug: '/early-access', title: 'Early Access', updatedAt: new Date() },
      { slug: '/contact', title: 'Contact', updatedAt: new Date() },
      { slug: '/thank-you', title: 'Thank You', updatedAt: new Date() },
    ];

    // Build sitemap preview
    const sitemapEntries = [
      ...staticPages.map((page) => {
        const seo = seoSettingsMap.get(page.slug);
        return {
          url: page.slug === '/' ? baseUrl : `${baseUrl}${page.slug}`,
          pageSlug: page.slug,
          pageTitle: page.title,
          lastModified: seo?.updatedAt || page.updatedAt,
          changeFrequency: seo?.sitemapFreq || 'monthly',
          priority: seo?.sitemapPriority || 0.5,
          excluded: seo?.excludeFromSitemap || false,
          noIndex: seo?.noIndex || false,
        };
      }),
      ...contentPages.map((page) => {
        const slug = `/content/${page.slug}`;
        const seo = seoSettingsMap.get(slug);
        return {
          url: `${baseUrl}${slug}`,
          pageSlug: slug,
          pageTitle: page.title,
          lastModified: seo?.updatedAt || page.updatedAt,
          changeFrequency: seo?.sitemapFreq || 'monthly',
          priority: seo?.sitemapPriority || 0.5,
          excluded: seo?.excludeFromSitemap || false,
          noIndex: seo?.noIndex || false,
        };
      }),
    ];

    // Stats
    const includedCount = sitemapEntries.filter((e) => !e.excluded).length;
    const excludedCount = sitemapEntries.filter((e) => e.excluded).length;
    const noIndexCount = sitemapEntries.filter((e) => e.noIndex).length;

    return NextResponse.json({
      baseUrl,
      sitemapUrl: `${baseUrl}/sitemap.xml`,
      entries: sitemapEntries,
      stats: {
        total: sitemapEntries.length,
        included: includedCount,
        excluded: excludedCount,
        noIndex: noIndexCount,
      },
    });
  } catch (error) {
    console.error('Error generating sitemap preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate sitemap preview' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/seo/sitemap
 * Ping search engines to re-crawl the sitemap
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'ping') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oneclicktag.com';
    const sitemapUrl = encodeURIComponent(`${baseUrl}/sitemap.xml`);

    const results: Array<{ engine: string; status: string; error?: string }> = [];

    // Ping Google
    try {
      const googleUrl = `https://www.google.com/ping?sitemap=${sitemapUrl}`;
      const googleResponse = await fetch(googleUrl, { method: 'GET' });
      results.push({
        engine: 'Google',
        status: googleResponse.ok ? 'success' : 'failed',
      });
    } catch (error) {
      results.push({
        engine: 'Google',
        status: 'failed',
        error: (error as Error).message,
      });
    }

    // Ping Bing
    try {
      const bingUrl = `https://www.bing.com/ping?sitemap=${sitemapUrl}`;
      const bingResponse = await fetch(bingUrl, { method: 'GET' });
      results.push({
        engine: 'Bing',
        status: bingResponse.ok ? 'success' : 'failed',
      });
    } catch (error) {
      results.push({
        engine: 'Bing',
        status: 'failed',
        error: (error as Error).message,
      });
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Sitemap ping requests sent',
    });
  } catch (error) {
    console.error('Error pinging search engines:', error);
    return NextResponse.json(
      { error: 'Failed to ping search engines' },
      { status: 500 }
    );
  }
}
