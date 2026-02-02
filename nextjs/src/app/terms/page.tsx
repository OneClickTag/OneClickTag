import { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { FileText, AlertCircle } from 'lucide-react';
import { getTermsPageContent, getSiteSettings } from '@/lib/server/api';
import { LegalPageContent } from './LegalPageContent';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const [pageData, settings] = await Promise.all([
    getTermsPageContent(),
    getSiteSettings(),
  ]);

  return {
    title: pageData?.metaTitle || pageData?.title || 'Terms of Service | OneClickTag',
    description: pageData?.metaDescription || 'Read our Terms of Service.',
    openGraph: {
      title: pageData?.metaTitle || pageData?.title || 'Terms of Service | OneClickTag',
      description: pageData?.metaDescription || 'Read our Terms of Service.',
      images: settings?.socialImageUrl ? [settings.socialImageUrl] : undefined,
    },
  };
}

export default async function TermsPage() {
  // Fetch terms content server-side from ContentPage
  const pageData = await getTermsPageContent();

  // Log for debugging
  console.log('[TermsPage] Fetched data:', pageData ? 'Found' : 'Not found', pageData?.title);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          {/* Header */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  {pageData?.title || 'Terms of Service'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: January 1, 2025
                </p>
              </div>
            </div>
          </div>

          {/* Content from Database */}
          {pageData?.content ? (
            <LegalPageContent content={pageData.content} pageType="terms" />
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
                Admin: Create a content page with slug <code className="font-mono bg-gray-200 px-1 rounded">terms</code> and publish it.
              </p>
            </div>
          )}
        </div>
      </article>

      <Footer />
    </div>
  );
}
