import { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Shield, AlertCircle } from 'lucide-react';
import { getPrivacyPageContent, buildPageMetadata } from '@/lib/server/api';
import { LegalPageContent } from './LegalPageContent';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const pageData = await getPrivacyPageContent();

  // Use page-level content as defaults, then apply any SEO overrides from admin
  const metadata = await buildPageMetadata(
    '/privacy',
    pageData?.metaTitle || pageData?.title || 'Privacy Policy | OneClickTag',
    pageData?.metaDescription || 'Learn how OneClickTag protects your privacy.'
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

export default async function PrivacyPage() {
  // Fetch privacy content server-side from ContentPage
  const pageData = await getPrivacyPageContent();

  const effectiveDate = getEffectiveDate(pageData?.content);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          {/* Header */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  {pageData?.title || 'Privacy Policy'}
                </h1>
                {effectiveDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    Effective Date: {formatDate(effectiveDate)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content from Database */}
          {pageData?.content ? (
            <>
              <LegalPageContent content={pageData.content} pageType="privacy" />

              {/* Google API Compliance Note */}
              <section className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-gray-700 text-sm">
                  <strong>Note:</strong> We do not sell your personal information to third parties.
                  Our use and transfer of information received from Google APIs adheres to the{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
                </p>
              </section>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Content Not Configured
              </h2>
              <p className="text-gray-600 mb-4">
                This page content has not been set up yet.
              </p>
              <p className="text-sm text-gray-500 bg-gray-100 inline-block px-4 py-2 rounded">
                Admin: Create a content page with slug <code className="font-mono bg-gray-200 px-1 rounded">privacy</code> and publish it.
              </p>
            </div>
          )}
        </div>
      </article>

      <Footer />
    </div>
  );
}
