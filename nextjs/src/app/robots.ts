import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

/**
 * Dynamic robots.txt generation for OneClickTag
 * Respects site-wide SEO settings from admin panel
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oneclicktag.com';

  // Fetch site settings to check for noindex flag
  const settings = await prisma.siteSettings.findUnique({
    where: { key: 'global' },
    select: { seoSettings: true },
  }).catch(() => null);

  const seoSettings = (settings?.seoSettings as Record<string, unknown>) || {};

  // If site is set to noindex, block all crawlers
  if (seoSettings.robotsNoIndex) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  // Standard robots.txt configuration
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Authentication pages
          '/login',
          '/register',

          // Dashboard and app pages (require auth)
          '/dashboard/',
          '/customers/',
          '/analytics/',
          '/campaigns/',
          '/tags/',

          // Admin pages
          '/admin/',

          // API routes
          '/api/',

          // Internal Next.js paths
          '/_next/',
          '/static/',

          // Early access questionnaire (private)
          '/early-access/questionnaire',

          // Utility pages (not useful for search engines)
          '/unsubscribe',
          '/thank-you',
        ],
      },
      // Additional rules for specific bots
      {
        userAgent: 'GPTBot',
        disallow: '/', // Block GPT crawler if desired
      },
      {
        userAgent: 'CCBot',
        disallow: '/', // Block Common Crawl
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
