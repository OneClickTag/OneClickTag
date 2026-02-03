import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/server/api';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildPageMetadata(
    '/early-access',
    'Join the Waitlist | OneClickTag',
    'Join the OneClickTag waitlist for early access to automated conversion tracking. Get exclusive early-bird pricing.'
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

export default function EarlyAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
