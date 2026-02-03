import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/server/api';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildPageMetadata(
    '/login',
    'Sign In | OneClickTag',
    'Sign in to your OneClickTag account to manage your conversion tracking.'
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

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
