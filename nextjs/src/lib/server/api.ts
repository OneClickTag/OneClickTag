/**
 * Server-side API utilities for SSR data fetching
 * These functions fetch data directly from the database for server components
 *
 * Caching is handled at the page level via `export const revalidate = 300`
 * which caches the entire page for 5 minutes.
 */

import prisma from '@/lib/prisma';

// Types for landing page content
export interface BadgeContent {
  icon?: string;
  text?: string;
}

export interface CTAButton {
  url?: string;
  text?: string;
}

export interface HeroContent {
  badge?: BadgeContent;
  headline?: string;
  headlineHighlight?: string;
  subtitle?: string;
  benefits?: string[];
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
  trustIndicators?: string;
}

export interface FeatureItem {
  id?: string;
  icon?: string;
  color?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface FeaturesContent {
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  features?: FeatureItem[];
  bottomCTA?: {
    text?: string;
    linkText?: string;
    linkUrl?: string;
  };
}

export interface StepItem {
  id?: string;
  step?: string;
  icon?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface HowItWorksContent {
  title?: string;
  subtitle?: string;
  steps?: StepItem[];
  stats?: Array<{
    value?: string;
    label?: string;
    isActive?: boolean;
  }>;
}

export interface TestimonialItem {
  id?: string;
  author?: string;
  role?: string;
  company?: string;
  quote?: string;
  isActive?: boolean;
}

export interface SocialProofContent {
  trustTitle?: string;
  testimonials?: TestimonialItem[];
  stats?: Array<{
    value?: string;
    label?: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
  }>;
}

export interface CtaContent {
  badge?: BadgeContent;
  headline?: string;
  headlineSecondLine?: string;
  subtitle?: string;
  features?: string[];
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
  trustBadge?: string;
}

export interface LandingPageContent {
  hero?: HeroContent;
  features?: FeaturesContent;
  'how-it-works'?: HowItWorksContent;
  'social-proof'?: SocialProofContent;
  cta?: CtaContent;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: string;
  features: string[];
  isFeatured: boolean;
  ctaText: string;
  ctaUrl: string | null;
  order: number;
}

export interface FooterSection {
  title: string;
  links: Array<{ label: string; url: string }>;
}

export interface FooterSocialLink {
  platform: string;
  url: string;
  icon?: string;
}

export interface FooterContent {
  brandName?: string;
  brandDescription?: string;
  socialLinks?: FooterSocialLink[];
  sections?: FooterSection[];
  copyrightText?: string;
}

export interface ContactFieldType {
  type: 'email' | 'phone' | 'address' | 'hours' | 'website' | 'custom';
}

export interface ContactInfoField {
  id: string;
  type: 'email' | 'phone' | 'address' | 'hours' | 'website' | 'custom';
  label: string;
  value: string;
  enabled: boolean;
  order: number;
}

export interface ContentBlock {
  id: string;
  type: 'hero' | 'contact-info' | 'contact-form' | 'faqs' | 'custom-text';
  title: string;
  enabled: boolean;
  order: number;
  content: Record<string, unknown>;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface FormSettings {
  enableForm?: boolean;
  emailTo?: string;
  successMessage?: string;
  subjects?: string[];
}

export interface ContactPageData {
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  faqs?: FAQ[];
  formSettings?: FormSettings;
  contentBlocks?: ContentBlock[];
  contactFields?: ContactInfoField[];
  customContent?: Record<string, unknown>;
}

export interface SiteSettings {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  brandName?: string | null;
  brandColors?: Record<string, string> | null;
  heroBackgroundUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  socialImageUrl?: string | null;
  customCSS?: string | null;
  customJS?: string | null;
  seoSettings?: Record<string, unknown> | null;
}

/**
 * Fetch all landing page sections
 */
export async function getLandingPageContent(): Promise<LandingPageContent> {
  const sections = await prisma.landingPageContent.findMany({
    where: { isActive: true },
  });

  const content: LandingPageContent = {};
  for (const section of sections) {
    const key = section.key;
    // Use type assertion to handle dynamic key assignment
    if (key === 'hero') {
      content.hero = section.content as unknown as HeroContent;
    } else if (key === 'features') {
      content.features = section.content as unknown as FeaturesContent;
    } else if (key === 'how-it-works') {
      content['how-it-works'] = section.content as unknown as HowItWorksContent;
    } else if (key === 'social-proof') {
      content['social-proof'] = section.content as unknown as SocialProofContent;
    } else if (key === 'cta') {
      content.cta = section.content as unknown as CtaContent;
    }
  }

  return content;
}

/**
 * Fetch all active plans
 */
export async function getPlans(): Promise<Plan[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: Number(plan.price),
    billingPeriod: plan.billingPeriod,
    features: Array.isArray(plan.features)
      ? (plan.features as string[])
      : typeof plan.features === 'string'
      ? JSON.parse(plan.features)
      : [],
    isFeatured: plan.isFeatured,
    ctaText: plan.ctaText,
    ctaUrl: plan.ctaUrl,
    order: plan.order,
  }));
}

/**
 * Fetch footer content
 */
export async function getFooterContent(): Promise<FooterContent | null> {
  const footer = await prisma.footerContent.findFirst({
    where: { isActive: true },
  });

  if (!footer) return null;

  return {
    brandName: footer.brandName || undefined,
    brandDescription: footer.brandDescription || undefined,
    socialLinks: footer.socialLinks as unknown as FooterSocialLink[] | undefined,
    sections: footer.sections as unknown as FooterSection[] | undefined,
    copyrightText: footer.copyrightText || undefined,
  };
}

/**
 * Fetch contact page data
 */
export async function getContactPageData(): Promise<ContactPageData | null> {
  const contact = await prisma.contactPageContent.findFirst({
    where: { isActive: true },
  });

  if (!contact) return null;

  const customContent = contact.customContent as unknown as Record<string, unknown> | undefined;

  return {
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    address: contact.address || undefined,
    businessHours: contact.businessHours || undefined,
    socialLinks: contact.socialLinks as unknown as ContactPageData['socialLinks'],
    faqs: contact.faqs as unknown as FAQ[] | undefined,
    formSettings: contact.formSettings as unknown as FormSettings | undefined,
    customContent: customContent,
    // Parse contentBlocks and contactFields from customContent if present
    contentBlocks: customContent?.contentBlocks as ContentBlock[] | undefined,
    contactFields: customContent?.contactFields as ContactInfoField[] | undefined,
  };
}

/**
 * Fetch site settings
 */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  const settings = await prisma.siteSettings.findUnique({
    where: { key: 'global' },
  });

  if (!settings) return null;

  return {
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    brandName: settings.brandName,
    brandColors: settings.brandColors as unknown as Record<string, string> | null,
    heroBackgroundUrl: settings.heroBackgroundUrl,
    metaTitle: settings.metaTitle,
    metaDescription: settings.metaDescription,
    socialImageUrl: settings.socialImageUrl,
    customCSS: settings.customCSS,
    customJS: settings.customJS,
    seoSettings: settings.seoSettings as unknown as Record<string, unknown> | null,
  };
}

/**
 * Fetch content page by slug
 */
export async function getContentPage(slug: string) {
  const page = await prisma.contentPage.findUnique({
    where: { slug },
  });

  if (!page || !page.isPublished) {
    return null;
  }

  return page;
}

/**
 * Fetch about page content (stored as content page with slug 'about')
 */
export async function getAboutPageContent() {
  // Try to get from content pages first
  const page = await prisma.contentPage.findUnique({
    where: { slug: 'about' },
  });

  if (page && page.isPublished) {
    return {
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
    };
  }

  return null;
}

/**
 * Fetch terms page content
 */
export async function getTermsPageContent() {
  const page = await prisma.contentPage.findUnique({
    where: { slug: 'terms' },
  });

  if (page && page.isPublished) {
    return {
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
    };
  }

  return null;
}

/**
 * Fetch privacy page content
 */
export async function getPrivacyPageContent() {
  const page = await prisma.contentPage.findUnique({
    where: { slug: 'privacy' },
  });

  if (page && page.isPublished) {
    return {
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
    };
  }

  return null;
}

/**
 * Page-level SEO settings interface
 */
export interface PageSeoSettings {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  noIndex: boolean;
  noFollow: boolean;
  structuredData?: string | null;
  sitemapPriority: number;
  sitemapFreq: string;
  excludeFromSitemap: boolean;
}

/**
 * Fetch page-level SEO settings by slug
 * Returns null if no custom settings exist for this page
 */
export async function getPageSeoSettings(pageSlug: string): Promise<PageSeoSettings | null> {
  const settings = await prisma.pageSeoSettings.findUnique({
    where: { pageSlug },
  });

  if (!settings) return null;

  return {
    metaTitle: settings.metaTitle,
    metaDescription: settings.metaDescription,
    canonicalUrl: settings.canonicalUrl,
    noIndex: settings.noIndex,
    noFollow: settings.noFollow,
    structuredData: settings.structuredData,
    sitemapPriority: settings.sitemapPriority,
    sitemapFreq: settings.sitemapFreq,
    excludeFromSitemap: settings.excludeFromSitemap,
  };
}

/**
 * Helper to build metadata for a page using site settings and page-level overrides
 * This should be used in generateMetadata() for all public pages
 */
export async function buildPageMetadata(
  pageSlug: string,
  defaultTitle: string,
  defaultDescription: string
): Promise<{
  title: string;
  description: string;
  robots: string;
  canonical?: string;
  openGraph: {
    title: string;
    description: string;
    images?: string[];
  };
  twitter: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    images?: string[];
  };
}> {
  const [siteSettings, pageSeo] = await Promise.all([
    getSiteSettings(),
    getPageSeoSettings(pageSlug),
  ]);

  const seoSettings = (siteSettings?.seoSettings as Record<string, unknown>) || {};

  // Page-level overrides take precedence, then site settings, then defaults
  const title = pageSeo?.metaTitle || defaultTitle;
  const description = pageSeo?.metaDescription || defaultDescription;

  // Build robots directive - page-level overrides site-level
  const noIndex = pageSeo?.noIndex ?? seoSettings.robotsNoIndex ?? false;
  const noFollow = pageSeo?.noFollow ?? seoSettings.robotsNoFollow ?? false;
  const robotsDirectives: string[] = [];
  if (noIndex) robotsDirectives.push('noindex');
  else robotsDirectives.push('index');
  if (noFollow) robotsDirectives.push('nofollow');
  else robotsDirectives.push('follow');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oneclicktag.com';
  const canonical = pageSeo?.canonicalUrl || (seoSettings.canonicalUrl as string) || baseUrl;

  return {
    title,
    description,
    robots: robotsDirectives.join(', '),
    canonical: pageSeo?.canonicalUrl || undefined,
    openGraph: {
      title,
      description,
      images: siteSettings?.socialImageUrl ? [siteSettings.socialImageUrl] : undefined,
    },
    twitter: {
      card: (seoSettings.twitterCardType as 'summary' | 'summary_large_image') || 'summary_large_image',
      title,
      description,
      images: siteSettings?.socialImageUrl ? [siteSettings.socialImageUrl] : undefined,
    },
  };
}
