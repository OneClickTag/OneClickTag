import Script from 'next/script';
import { getSiteSettings } from '@/lib/server/api';

/**
 * Server component that renders Google Analytics and GTM scripts
 * based on admin settings
 */
export async function AnalyticsScripts() {
  try {
    const settings = await getSiteSettings();
    const seoSettings = settings?.seoSettings as Record<string, unknown> | null;

    const ga4Id = seoSettings?.googleAnalyticsId as string | undefined;
    const gtmId = seoSettings?.googleTagManagerId as string | undefined;

    // Validate IDs format
    const validGa4Id = ga4Id && /^G-[A-Z0-9]+$/.test(ga4Id) ? ga4Id : null;
    const validGtmId = gtmId && /^GTM-[A-Z0-9]+$/.test(gtmId) ? gtmId : null;

    return (
      <>
        {/* Google Tag Manager - Head Script */}
        {validGtmId && (
          <Script
            id="gtm-head"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${validGtmId}');
              `,
            }}
          />
        )}

        {/* Google Analytics 4 - Only if GTM is not configured */}
        {validGa4Id && !validGtmId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${validGa4Id}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga4-config"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  gtag('js', new Date());
                  gtag('config', '${validGa4Id}', {
                    page_path: window.location.pathname,
                    anonymize_ip: true,
                  });
                `,
              }}
            />
          </>
        )}
      </>
    );
  } catch (error) {
    console.error('Error loading analytics scripts:', error);
    return null;
  }
}

/**
 * GTM noscript iframe - should be placed right after opening body tag
 */
export async function GTMNoScript() {
  try {
    const settings = await getSiteSettings();
    const seoSettings = settings?.seoSettings as Record<string, unknown> | null;

    const gtmId = seoSettings?.googleTagManagerId as string | undefined;
    const validGtmId = gtmId && /^GTM-[A-Z0-9]+$/.test(gtmId) ? gtmId : null;

    if (!validGtmId) return null;

    return (
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${validGtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    );
  } catch (error) {
    console.error('Error loading GTM noscript:', error);
    return null;
  }
}
