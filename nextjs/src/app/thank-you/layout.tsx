import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/server/api';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildPageMetadata(
    '/thank-you',
    'Thank You | OneClickTag',
    'Thank you for joining the OneClickTag waitlist. We will notify you when we launch.'
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

export default function ThankYouLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
