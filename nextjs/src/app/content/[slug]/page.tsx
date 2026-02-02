import { notFound, redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Metadata } from 'next';
import { MarkdownContent } from './MarkdownContent';
import { getContentPage, getSiteSettings } from '@/lib/server/api';

// Revalidate every 5 minutes
export const revalidate = 300;

// These slugs have dedicated styled pages - redirect to them
const DEDICATED_PAGE_SLUGS = ['about', 'terms', 'privacy'];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Don't generate metadata for slugs that will redirect
  if (DEDICATED_PAGE_SLUGS.includes(slug)) {
    return {};
  }

  const [page, settings] = await Promise.all([
    getContentPage(slug),
    getSiteSettings(),
  ]);

  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || undefined,
      images: settings?.socialImageUrl ? [settings.socialImageUrl] : undefined,
    },
  };
}

export default async function ContentPageView({ params }: PageProps) {
  const { slug } = await params;

  // Redirect dedicated page slugs to their styled routes
  if (DEDICATED_PAGE_SLUGS.includes(slug)) {
    redirect(`/${slug}`);
  }

  const page = await getContentPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <article>
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{page.title}</h1>
            {page.metaDescription && (
              <p className="text-xl text-gray-600">{page.metaDescription}</p>
            )}
          </header>

          <MarkdownContent content={page.content || ''} />
        </article>
      </main>

      <Footer />
    </div>
  );
}
