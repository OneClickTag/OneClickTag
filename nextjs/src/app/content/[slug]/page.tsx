import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Metadata } from 'next';
import { MarkdownContent } from './MarkdownContent';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getContentPage(slug: string) {
  const page = await prisma.contentPage.findUnique({
    where: { slug },
  });

  if (!page || !page.isPublished) {
    return null;
  }

  return page;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getContentPage(slug);

  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function ContentPageView({ params }: PageProps) {
  const { slug } = await params;
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
