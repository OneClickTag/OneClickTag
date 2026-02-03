import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/server/api';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildPageMetadata(
    '/register',
    'Create Account | OneClickTag',
    'Create your OneClickTag account and start automating your conversion tracking setup.'
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

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
