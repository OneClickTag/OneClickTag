import { getSiteSettings } from '@/lib/server/api';

/**
 * Server component that renders JSON-LD structured data from admin settings
 * Validates JSON before rendering to prevent errors
 */
export async function StructuredData() {
  const settings = await getSiteSettings();
  const seoSettings = settings?.seoSettings as Record<string, unknown> | null;
  const jsonLd = seoSettings?.structuredData as string | undefined;

  if (!jsonLd || jsonLd.trim() === '') {
    return null;
  }

  // Validate JSON before rendering
  try {
    JSON.parse(jsonLd);
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
    );
  } catch {
    // Invalid JSON - don't render
    console.warn('Invalid JSON-LD structured data in site settings');
    return null;
  }
}

/**
 * Organization schema - can be used as a default if none is configured
 */
export function OrganizationSchema({
  name,
  url,
  logo,
  description,
}: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    ...(logo && { logo }),
    ...(description && { description }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Website schema for homepage
 */
export function WebsiteSchema({
  name,
  url,
  description,
  searchUrl,
}: {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    ...(description && { description }),
    ...(searchUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: `${searchUrl}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Software Application schema for OneClickTag
 */
export function SoftwareApplicationSchema({
  name,
  description,
  applicationCategory = 'BusinessApplication',
  operatingSystem = 'Web',
  url,
  price,
  priceCurrency = 'USD',
}: {
  name: string;
  description?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  url: string;
  price?: string;
  priceCurrency?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    ...(description && { description }),
    applicationCategory,
    operatingSystem,
    url,
    ...(price && {
      offers: {
        '@type': 'Offer',
        price,
        priceCurrency,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * FAQ schema for pages with FAQ sections
 */
export function FAQSchema({
  faqs,
}: {
  faqs: Array<{ question: string; answer: string }>;
}) {
  if (!faqs || faqs.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Breadcrumb schema for navigation
 */
export function BreadcrumbSchema({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  if (!items || items.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
