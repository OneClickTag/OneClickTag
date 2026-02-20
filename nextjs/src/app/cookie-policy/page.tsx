import { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Cookie, AlertCircle } from 'lucide-react';
import { getCookiePolicyPageContent, buildPageMetadata } from '@/lib/server/api';
import prisma from '@/lib/prisma';
import { LegalPageContent } from './LegalPageContent';
import { CookieInventory } from './CookieInventory';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const pageData = await getCookiePolicyPageContent();

  const metadata = await buildPageMetadata(
    '/cookie-policy',
    pageData?.metaTitle || pageData?.title || 'Cookie Policy | OneClickTag',
    pageData?.metaDescription || 'Learn how OneClickTag uses cookies.'
  );

  return {
    title: metadata.title,
    description: metadata.description,
    robots: metadata.robots,
    alternates: metadata.canonical ? { canonical: metadata.canonical } : undefined,
    openGraph: metadata.openGraph,
    twitter: metadata.twitter,
  };
}

async function getCookieCategories() {
  try {
    const defaultTenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!defaultTenant) return [];

    const categories = await prisma.cookieCategory.findMany({
      where: { tenantId: defaultTenant.id },
      include: {
        cookies: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { category: 'asc' },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      category: category.category,
      isRequired: category.isRequired,
      cookies: category.cookies.map((cookie) => ({
        id: cookie.id,
        name: cookie.name,
        provider: cookie.provider,
        purpose: cookie.purpose,
        duration: cookie.duration,
        type: cookie.type,
      })),
    }));
  } catch (error) {
    console.error('[CookiePolicyPage] Error fetching cookie categories:', error);
    return [];
  }
}

function getEffectiveDate(content: string | undefined | null): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed.effectiveDate || parsed.lastUpdated || null;
  } catch {
    return null;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export default async function CookiePolicyPage() {
  const [pageData, cookieCategories] = await Promise.all([
    getCookiePolicyPageContent(),
    getCookieCategories(),
  ]);

  const effectiveDate = getEffectiveDate(pageData?.content);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          {/* Header */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Cookie className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  {pageData?.title || 'Cookie Policy'}
                </h1>
                {effectiveDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    Effective Date: {formatDate(effectiveDate)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CMS content from admin Static Pages editor */}
          {pageData?.content ? (
            <div className="mb-10">
              <LegalPageContent content={pageData.content} pageType="cookie-policy" />
            </div>
          ) : (
            <div className="text-center py-12 mb-10">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Content Not Configured
              </h2>
              <p className="text-gray-600 mb-4">
                This page content has not been set up yet.
              </p>
              <p className="text-sm text-gray-500 bg-gray-100 inline-block px-4 py-2 rounded">
                Admin: Create a content page with slug <code className="font-mono bg-gray-200 px-1 rounded">cookie-policy</code> and publish it.
              </p>
            </div>
          )}

          {/* Live cookie inventory from admin-configured categories */}
          <CookieInventory categories={cookieCategories} />
        </div>
      </article>

      <Footer />
    </div>
  );
}
