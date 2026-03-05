import React from 'react';
import { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer, FooterConfig } from '@/components/layout/Footer';
import {
  LandingHero,
  LandingFeatures,
  LandingHowItWorks,
  LandingSocialProof,
  LandingCTA,
} from '@/components/landing';
import { getLandingPageContent, getFooterContent, buildPageMetadata, SectionKey } from '@/lib/server/api';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

// Default content for fallback
const defaultHero = {
  badge: { icon: 'Zap', text: 'Automated Conversion Tracking' },
  headline: 'Stop Wasting Hours on',
  headlineHighlight: 'Google Tag Setup',
  subtitle:
    'OneClickTag automatically creates GTM tags, Google Ads conversions, and GA4 events in seconds. What takes 30 minutes manually takes just 2 minutes here.',
  benefits: ['No coding required', 'GTM + Google Ads + GA4', 'Live in 2 minutes'],
  primaryCTA: { url: '/early-access', text: 'Join Waitlist' },
  trustIndicators: 'Be the first to know when we launch • Limited spots available',
};

const defaultFeatures = {
  title: 'GTM, Google Ads & GA4',
  titleHighlight: 'All Automated',
  subtitle:
    'Three tools. One click. Zero headaches. OneClickTag connects everything so you never have to manually configure tracking again.',
  features: [
    {
      icon: 'Tag',
      title: 'Google Tag Manager',
      description: 'Automatically create tags, triggers, and variables in your GTM container.',
      isActive: true,
    },
    {
      icon: 'Target',
      title: 'Google Ads Integration',
      description: 'Sync conversion actions to Google Ads instantly.',
      isActive: true,
    },
    {
      icon: 'BarChart3',
      title: 'GA4 Events',
      description: 'Create custom GA4 events with proper parameters.',
      isActive: true,
    },
  ],
};

const defaultHowItWorks = {
  title: 'Live Tracking in 3 Simple Steps',
  subtitle: 'See how simple conversion tracking can be.',
  steps: [
    {
      step: '01',
      icon: 'MousePointerClick',
      title: 'Connect Google Account',
      description: 'One-click OAuth connection.',
      isActive: true,
    },
    {
      step: '02',
      icon: 'Link2',
      title: 'Configure Tracking',
      description: 'Select what you want to track.',
      isActive: true,
    },
    {
      step: '03',
      icon: 'Rocket',
      title: 'Deploy Instantly',
      description: 'Everything is synced in seconds.',
      isActive: true,
    },
  ],
};

const defaultSocialProof = {
  trustTitle: 'Join 1,000+ Marketers Saving Hours Every Week',
  testimonials: [
    {
      author: 'Sarah Johnson',
      role: 'Marketing Director',
      company: 'Digital Growth Co.',
      quote: 'OneClickTag cut our tracking setup time from hours to minutes. Game changer!',
      isActive: true,
    },
    {
      author: 'Michael Chen',
      role: 'Performance Marketer',
      company: 'AdScale Agency',
      quote: 'The automation is incredible. No more manual GTM setup headaches.',
      isActive: true,
    },
    {
      author: 'Emily Rodriguez',
      role: 'Head of Growth',
      company: 'TechStart Inc.',
      quote: 'Finally, a tool that understands what marketers actually need.',
      isActive: true,
    },
    {
      author: 'David Kim',
      role: 'Digital Marketing Lead',
      company: 'E-Commerce Pro',
      quote: 'Saved us 10+ hours per week on conversion tracking setup.',
      isActive: true,
    },
    {
      author: 'Jessica Taylor',
      role: 'Agency Owner',
      company: 'Growth Labs',
      quote: 'Our clients love how fast we can now deploy tracking. Essential tool.',
      isActive: true,
    },
    {
      author: 'Alex Thompson',
      role: 'PPC Specialist',
      company: 'AdVantage Media',
      quote: 'Best investment for our agency this year. ROI tracking made simple.',
      isActive: true,
    },
  ],
};

const defaultCta = {
  headline: 'Start Tracking in 2 Minutes.',
  headlineSecondLine: 'Free for 14 Days.',
  subtitle:
    'No credit card required. Cancel anytime. Your first conversion tracking setup is just clicks away.',
  primaryCTA: { url: '/early-access', text: 'Join Waitlist' },
};

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildPageMetadata(
    '/',
    'OneClickTag - Automated Conversion Tracking',
    'Simplify your Google Tag Manager, Google Ads, and GA4 setup. Create conversion tracking in minutes, not hours.'
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

export default async function LandingPage() {
  // Fetch all landing page content and footer content server-side
  const [content, footerData] = await Promise.all([
    getLandingPageContent(),
    getFooterContent(),
  ]);

  // Default section order if none specified
  const defaultSectionOrder: SectionKey[] = ['hero', 'features', 'how-it-works', 'social-proof', 'cta'];
  const sectionOrder = content?._sectionOrder?.length ? content._sectionOrder : defaultSectionOrder;

  // Default content map
  const defaults: Record<SectionKey, Record<string, unknown>> = {
    hero: defaultHero,
    features: defaultFeatures,
    'how-it-works': defaultHowItWorks,
    'social-proof': defaultSocialProof,
    cta: defaultCta,
  };

  // Section component map
  const sectionComponents: Record<SectionKey, (c: Record<string, unknown>) => React.ReactNode> = {
    hero: (c) => <LandingHero content={c} />,
    features: (c) => <LandingFeatures content={c} />,
    'how-it-works': (c) => <LandingHowItWorks content={c} />,
    'social-proof': (c) => <LandingSocialProof content={c} />,
    cta: (c) => <LandingCTA content={c} />,
  };

  // Build footer config from server data
  const footerConfig: FooterConfig | undefined = footerData ? {
    brandName: footerData.brandName || 'OneClickTag',
    brandDescription: footerData.brandDescription || 'Simplify your conversion tracking with automated GTM and Google Ads integration.',
    socialLinks: footerData.socialLinks?.map(link => ({
      platform: link.platform,
      url: link.url,
      icon: link.icon || link.platform.toLowerCase(),
    })) || [],
    sections: footerData.sections || [],
    copyrightText: footerData.copyrightText || 'OneClickTag. All rights reserved.',
  } : undefined;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navbar />

      {/* Render sections in dynamic order - only sections present in content (active) are shown */}
      {sectionOrder.map((key) => {
        // If content has _sectionOrder, only render sections that exist in content (i.e., active in DB)
        // If no _sectionOrder (no DB data), render all defaults
        const sectionContent = content?.[key] || (content?._sectionOrder ? null : defaults[key]);
        if (!sectionContent) return null;
        const render = sectionComponents[key];
        if (!render) return null;
        return <div key={key}>{render(sectionContent as Record<string, unknown>)}</div>;
      })}

      {/* Footer */}
      <Footer config={footerConfig} />
    </div>
  );
}
