import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { CookieBanner } from '@/components/CookieBanner';
import { StructuredData, ConsentModeDefaults, AnalyticsScripts, GTMNoScript } from '@/components/seo';
import { getSiteSettings } from '@/lib/server/api';

const inter = Inter({ subsets: ['latin'] });

/**
 * Generate dynamic metadata from site settings
 * Falls back to defaults if settings are not configured
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const seoSettings = (settings?.seoSettings as Record<string, unknown>) || {};

  // Build robots directive
  const robotsDirectives: string[] = [];
  if (seoSettings.robotsNoIndex) robotsDirectives.push('noindex');
  else robotsDirectives.push('index');
  if (seoSettings.robotsNoFollow) robotsDirectives.push('nofollow');
  else robotsDirectives.push('follow');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oneclicktag.com';
  const canonicalUrl = (seoSettings.canonicalUrl as string) || baseUrl;

  return {
    title: {
      default: settings?.metaTitle || 'OneClickTag - Simplify Google Tracking',
      template: '%s | OneClickTag',
    },
    description:
      settings?.metaDescription ||
      'Automate Google Tag Manager and Google Ads tracking setup with OneClickTag',
    manifest: '/site.webmanifest',
    metadataBase: new URL(canonicalUrl),
    robots: robotsDirectives.join(', '),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: (seoSettings.ogType as 'website' | 'article') || 'website',
      siteName: settings?.brandName || 'OneClickTag',
      title: settings?.metaTitle || 'OneClickTag - Simplify Google Tracking',
      description: settings?.metaDescription || 'Automate Google Tag Manager and Google Ads tracking setup',
      images: settings?.socialImageUrl ? [settings.socialImageUrl] : undefined,
      url: canonicalUrl,
    },
    twitter: {
      card: (seoSettings.twitterCardType as 'summary' | 'summary_large_image') || 'summary_large_image',
      title: settings?.metaTitle || 'OneClickTag - Simplify Google Tracking',
      description: settings?.metaDescription || 'Automate Google Tag Manager and Google Ads tracking setup',
      images: settings?.socialImageUrl ? [settings.socialImageUrl] : undefined,
    },
    icons: {
      icon: [
        { url: settings?.faviconUrl || '/favicon.ico', sizes: 'any' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      other: [
        { rel: 'icon', url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { rel: 'icon', url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
        <ConsentModeDefaults />
        <AnalyticsScripts />
      </head>
      <body className={inter.className}>
        <GTMNoScript />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster position="bottom-right" />
              <CookieBanner />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
