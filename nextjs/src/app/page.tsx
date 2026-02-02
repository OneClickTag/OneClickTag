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
import { getLandingPageContent, getSiteSettings, getFooterContent } from '@/lib/server/api';

// Revalidate every 5 minutes
export const revalidate = 300;

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
  const settings = await getSiteSettings();

  return {
    title: settings?.metaTitle || 'OneClickTag - Automated Conversion Tracking',
    description:
      settings?.metaDescription ||
      'Simplify your Google Tag Manager, Google Ads, and GA4 setup. Create conversion tracking in minutes, not hours.',
    openGraph: {
      title: settings?.metaTitle || 'OneClickTag - Automated Conversion Tracking',
      description:
        settings?.metaDescription ||
        'Simplify your Google Tag Manager, Google Ads, and GA4 setup.',
      images: settings?.socialImageUrl ? [settings.socialImageUrl] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: settings?.metaTitle || 'OneClickTag - Automated Conversion Tracking',
      description:
        settings?.metaDescription ||
        'Simplify your Google Tag Manager, Google Ads, and GA4 setup.',
      images: settings?.socialImageUrl ? [settings.socialImageUrl] : undefined,
    },
  };
}

export default async function LandingPage() {
  // Fetch all landing page content and footer content server-side
  const [content, footerData] = await Promise.all([
    getLandingPageContent(),
    getFooterContent(),
  ]);

  const EARLY_ACCESS_MODE = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === 'true';

  // Get content with fallbacks
  const heroContent = content?.hero || defaultHero;
  const featuresContent = content?.features || defaultFeatures;
  const howItWorksContent = content?.['how-it-works'] || defaultHowItWorks;
  const socialProofContent = content?.['social-proof'] || defaultSocialProof;
  const ctaContent = content?.cta || defaultCta;

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

      {/* Hero Section */}
      <LandingHero content={heroContent} earlyAccessMode={EARLY_ACCESS_MODE} />

      {/* Features Section */}
      <LandingFeatures content={featuresContent} earlyAccessMode={EARLY_ACCESS_MODE} />

      {/* How It Works Section */}
      <LandingHowItWorks content={howItWorksContent} />

      {/* Testimonials Section */}
      <LandingSocialProof content={socialProofContent} />

      {/* CTA Section */}
      <LandingCTA content={ctaContent} earlyAccessMode={EARLY_ACCESS_MODE} />

      {/* Footer */}
      <Footer config={footerConfig} />
    </div>
  );
}
