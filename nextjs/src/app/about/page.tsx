import { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getAboutPageContent, getSiteSettings } from '@/lib/server/api';
import { AboutPageContent } from './AboutPageContent';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const [pageData, settings] = await Promise.all([
    getAboutPageContent(),
    getSiteSettings(),
  ]);

  return {
    title: pageData?.metaTitle || pageData?.title || 'About Us | OneClickTag',
    description: pageData?.metaDescription || 'Learn about OneClickTag.',
    openGraph: {
      title: pageData?.metaTitle || pageData?.title || 'About Us | OneClickTag',
      description: pageData?.metaDescription || 'Learn about OneClickTag.',
      images: settings?.socialImageUrl ? [settings.socialImageUrl] : undefined,
    },
  };
}

export default async function AboutPage() {
  // Fetch about page content server-side from ContentPage
  const pageData = await getAboutPageContent();

  // Log for debugging
  console.log('[AboutPage] Fetched data:', pageData ? 'Found' : 'Not found', pageData?.title);

  const EARLY_ACCESS_MODE = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <AboutPageContent
        title={pageData?.title || 'About OneClickTag'}
        content={pageData?.content || null}
        earlyAccessMode={EARLY_ACCESS_MODE}
      />

      <Footer />
    </div>
  );
}
