import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

// Force dynamic to prevent database calls during build
export const dynamic = 'force-dynamic';

/**
 * Dynamic sitemap generation for OneClickTag
 * Includes static pages and dynamic content pages from database
 * Respects PageSeoSettings for exclusions and priorities
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oneclicktag.com';

  // Fetch page-level SEO settings to check for exclusions
  const pageSeoSettings = await prisma.pageSeoSettings.findMany({
    where: { excludeFromSitemap: false },
    select: {
      pageSlug: true,
      sitemapPriority: true,
      sitemapFreq: true,
      updatedAt: true,
    },
  }).catch(() => [] as Array<{
    pageSlug: string;
    sitemapPriority: number;
    sitemapFreq: string;
    updatedAt: Date;
  }>);

  // Create a map for quick lookup
  const seoSettingsMap = new Map(
    pageSeoSettings.map((s) => [s.pageSlug, s])
  );

  // Check if a page should be excluded
  const excludedSlugs = await prisma.pageSeoSettings.findMany({
    where: { excludeFromSitemap: true },
    select: { pageSlug: true },
  }).catch(() => [] as Array<{ pageSlug: string }>);
  const excludedSet = new Set(excludedSlugs.map((s) => s.pageSlug));

  // Static pages with default settings
  const staticPages: MetadataRoute.Sitemap = [];

  // Homepage
  if (!excludedSet.has('/')) {
    const homeSeo = seoSettingsMap.get('/');
    staticPages.push({
      url: baseUrl,
      lastModified: homeSeo?.updatedAt || new Date(),
      changeFrequency: (homeSeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'daily',
      priority: homeSeo?.sitemapPriority || 1.0,
    });
  }

  // Early access page
  if (!excludedSet.has('/early-access')) {
    const earlySeo = seoSettingsMap.get('/early-access');
    staticPages.push({
      url: `${baseUrl}/early-access`,
      lastModified: earlySeo?.updatedAt || new Date(),
      changeFrequency: (earlySeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'weekly',
      priority: earlySeo?.sitemapPriority || 0.9,
    });
  }

  // Contact page (if exists)
  if (!excludedSet.has('/contact')) {
    const contactSeo = seoSettingsMap.get('/contact');
    staticPages.push({
      url: `${baseUrl}/contact`,
      lastModified: contactSeo?.updatedAt || new Date(),
      changeFrequency: (contactSeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly',
      priority: contactSeo?.sitemapPriority || 0.7,
    });
  }

  // About page
  if (!excludedSet.has('/about')) {
    const aboutSeo = seoSettingsMap.get('/about');
    staticPages.push({
      url: `${baseUrl}/about`,
      lastModified: aboutSeo?.updatedAt || new Date(),
      changeFrequency: (aboutSeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly',
      priority: aboutSeo?.sitemapPriority || 0.8,
    });
  }

  // Plans/Pricing page
  if (!excludedSet.has('/plans')) {
    const plansSeo = seoSettingsMap.get('/plans');
    staticPages.push({
      url: `${baseUrl}/plans`,
      lastModified: plansSeo?.updatedAt || new Date(),
      changeFrequency: (plansSeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'weekly',
      priority: plansSeo?.sitemapPriority || 0.8,
    });
  }

  // Cookie Policy page
  if (!excludedSet.has('/cookie-policy')) {
    const cookieSeo = seoSettingsMap.get('/cookie-policy');
    staticPages.push({
      url: `${baseUrl}/cookie-policy`,
      lastModified: cookieSeo?.updatedAt || new Date(),
      changeFrequency: (cookieSeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly',
      priority: cookieSeo?.sitemapPriority || 0.3,
    });
  }

  // Privacy Policy page
  if (!excludedSet.has('/privacy')) {
    const privacySeo = seoSettingsMap.get('/privacy');
    staticPages.push({
      url: `${baseUrl}/privacy`,
      lastModified: privacySeo?.updatedAt || new Date(),
      changeFrequency: (privacySeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly',
      priority: privacySeo?.sitemapPriority || 0.3,
    });
  }

  // Terms of Service page
  if (!excludedSet.has('/terms')) {
    const termsSeo = seoSettingsMap.get('/terms');
    staticPages.push({
      url: `${baseUrl}/terms`,
      lastModified: termsSeo?.updatedAt || new Date(),
      changeFrequency: (termsSeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly',
      priority: termsSeo?.sitemapPriority || 0.3,
    });
  }

  // Thank you page
  if (!excludedSet.has('/thank-you')) {
    const thankYouSeo = seoSettingsMap.get('/thank-you');
    staticPages.push({
      url: `${baseUrl}/thank-you`,
      lastModified: thankYouSeo?.updatedAt || new Date(),
      changeFrequency: (thankYouSeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'yearly',
      priority: thankYouSeo?.sitemapPriority || 0.3,
    });
  }

  // Dynamic content pages from database
  const contentPages = await prisma.contentPage.findMany({
    where: {
      isPublished: true,
    },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const dynamicPages: MetadataRoute.Sitemap = contentPages
    .filter((page) => !excludedSet.has(`/content/${page.slug}`))
    .map((page) => {
      const pageSeo = seoSettingsMap.get(`/content/${page.slug}`);

      // Determine priority based on common content types
      let defaultPriority = 0.6;
      if (['about', 'pricing', 'plans'].includes(page.slug)) {
        defaultPriority = 0.8;
      } else if (['terms', 'privacy', 'cookie-policy'].includes(page.slug)) {
        defaultPriority = 0.3;
      }

      return {
        url: `${baseUrl}/content/${page.slug}`,
        lastModified: page.updatedAt,
        changeFrequency: (pageSeo?.sitemapFreq as 'daily' | 'weekly' | 'monthly' | 'yearly') || 'monthly',
        priority: pageSeo?.sitemapPriority || defaultPriority,
      };
    });

  return [...staticPages, ...dynamicPages];
}
