'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import {
  Zap,
  Target,
  BarChart3,
  ArrowRight,
  Star,
  Sparkles,
  Loader2,
  Tag,
  Shield,
  Globe,
  MousePointerClick,
  Link2,
  Rocket,
  CheckCircle2,
  Users,
  Clock,
  TrendingUp,
  LucideIcon,
} from 'lucide-react';

// Icon mapping for dynamic icons from database
const iconMap: Record<string, LucideIcon> = {
  Zap,
  Target,
  BarChart3,
  Sparkles,
  Tag,
  Shield,
  Globe,
  MousePointerClick,
  Link2,
  Rocket,
  CheckCircle2,
  Users,
  Clock,
  TrendingUp,
  Star,
};

// Type definitions matching actual database structure
interface BadgeContent {
  icon?: string;
  text?: string;
}

interface CTAButton {
  url?: string;
  text?: string;
}

interface HeroContent {
  badge?: BadgeContent;
  headline?: string;
  headlineHighlight?: string;
  subtitle?: string;
  benefits?: string[];
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
  trustIndicators?: string;
}

interface FeatureItem {
  id?: string;
  icon?: string;
  color?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

interface FeaturesContent {
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

interface StepItem {
  id?: string;
  step?: string;
  icon?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

interface HowItWorksContent {
  title?: string;
  subtitle?: string;
  steps?: StepItem[];
  stats?: Array<{
    value?: string;
    label?: string;
    isActive?: boolean;
  }>;
}

interface TestimonialItem {
  id?: string;
  author?: string;
  role?: string;
  company?: string;
  quote?: string;
  isActive?: boolean;
}

interface SocialProofContent {
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

interface CtaContent {
  badge?: BadgeContent;
  headline?: string;
  headlineSecondLine?: string;
  subtitle?: string;
  features?: string[];
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
  trustBadge?: string;
}

interface LandingPageContent {
  hero?: HeroContent;
  features?: FeaturesContent;
  'how-it-works'?: HowItWorksContent;
  'social-proof'?: SocialProofContent;
  cta?: CtaContent;
}

// Default/fallback content
const defaultHero: HeroContent = {
  badge: { icon: 'Zap', text: 'Automated Conversion Tracking' },
  headline: 'Setup Google Tracking',
  headlineHighlight: 'In One Click',
  subtitle: 'Stop wasting hours on manual tag setup. OneClickTag automatically creates GTM tags, Google Ads conversions, and GA4 events in seconds.',
  benefits: ['No coding required', 'GTM + Google Ads + GA4', 'Setup in 2 minutes'],
  primaryCTA: { url: '/register', text: 'Start Free Trial' },
  secondaryCTA: { url: '/plans', text: 'View Pricing' },
  trustIndicators: 'No credit card required • Cancel anytime • 14-day free trial',
};

const defaultFeatures: FeaturesContent = {
  title: 'Everything You Need',
  titleHighlight: 'In One Platform',
  subtitle: 'Stop juggling multiple tools. OneClickTag brings all your tracking needs together in one simple interface.',
  features: [
    { icon: 'Tag', title: 'Google Tag Manager', description: 'Automatically create tags, triggers, and variables in your GTM container.' },
    { icon: 'Target', title: 'Google Ads Integration', description: 'Sync conversion actions to Google Ads instantly.' },
    { icon: 'BarChart3', title: 'GA4 Events', description: 'Create custom GA4 events with proper parameters.' },
  ],
};

const defaultHowItWorks: HowItWorksContent = {
  title: 'How It Works',
  subtitle: 'Get up and running in minutes, not hours.',
  steps: [
    { step: '01', icon: 'MousePointerClick', title: 'Connect Google Account', description: 'One-click OAuth connection.' },
    { step: '02', icon: 'Link2', title: 'Configure Tracking', description: 'Select what you want to track.' },
    { step: '03', icon: 'Rocket', title: 'Deploy Instantly', description: 'Everything is synced in seconds.' },
  ],
};

const defaultSocialProof: SocialProofContent = {
  trustTitle: 'Trusted by Marketers',
  testimonials: [
    { author: 'Sarah Johnson', role: 'Marketing Director', company: 'Digital Growth Co.', quote: 'OneClickTag cut our tracking setup time from hours to minutes.' },
    { author: 'Michael Chen', role: 'Performance Marketer', company: 'AdScale Agency', quote: 'The automation is incredible.' },
  ],
};

const defaultCta: CtaContent = {
  headline: 'Ready to Transform Your',
  headlineSecondLine: 'Tracking Workflow?',
  subtitle: 'Join 1,000+ marketers who are saving hours every week with automated tracking setup.',
  primaryCTA: { url: '/register', text: 'Start Free Trial' },
  secondaryCTA: { url: '/plans', text: 'View Pricing' },
};

// Fetch function for landing page content
async function fetchLandingPageContent(): Promise<LandingPageContent> {
  const response = await fetch('/api/public/landing-page');
  if (!response.ok) {
    throw new Error('Failed to fetch landing page content');
  }
  return response.json();
}

export default function LandingPage() {
  const { data: content, isLoading } = useQuery({
    queryKey: ['landing-page-content'],
    queryFn: fetchLandingPageContent,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Get content with fallbacks
  const hero = content?.hero || defaultHero;
  const featuresData = content?.features || defaultFeatures;
  const howItWorksData = content?.['how-it-works'] || defaultHowItWorks;
  const socialProofData = content?.['social-proof'] || defaultSocialProof;
  const ctaData = content?.cta || defaultCta;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Get badge icon
  const BadgeIcon = iconMap[hero.badge?.icon || 'Zap'] || Zap;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <BadgeIcon className="w-4 h-4" />
              <span>{hero.badge?.text || defaultHero.badge?.text}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {hero.headline || defaultHero.headline}
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {hero.headlineHighlight || defaultHero.headlineHighlight}
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              {hero.subtitle || defaultHero.subtitle}
            </p>
            {/* Benefits */}
            {(hero.benefits || defaultHero.benefits) && (
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {(hero.benefits || defaultHero.benefits || []).map((benefit, idx) => (
                  <span key={idx} className="inline-flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
                    {benefit}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={hero.primaryCTA?.url || defaultHero.primaryCTA?.url || '/register'}>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {hero.primaryCTA?.text || defaultHero.primaryCTA?.text}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href={hero.secondaryCTA?.url || defaultHero.secondaryCTA?.url || '/plans'}>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  {hero.secondaryCTA?.text || defaultHero.secondaryCTA?.text}
                </Button>
              </Link>
            </div>
            {hero.trustIndicators && (
              <p className="text-sm text-gray-500 mt-4">{hero.trustIndicators}</p>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {featuresData.title || defaultFeatures.title}{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {featuresData.titleHighlight || defaultFeatures.titleHighlight}
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {featuresData.subtitle || defaultFeatures.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(featuresData.features || defaultFeatures.features || [])
              .filter((f) => f.isActive !== false)
              .map((feature, index) => {
                const Icon = iconMap[feature.icon || 'Zap'] || Zap;
                return (
                  <div
                    key={feature.id || index}
                    className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${feature.color || 'from-blue-500 to-purple-500'} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
          </div>
          {featuresData.bottomCTA && (
            <div className="text-center mt-12">
              <p className="text-gray-600 mb-4">{featuresData.bottomCTA.text}</p>
              <Link href={featuresData.bottomCTA.linkUrl || '/register'}>
                <Button variant="outline">
                  {featuresData.bottomCTA.linkText || 'Get started'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {howItWorksData.title || defaultHowItWorks.title}
            </h2>
            <p className="text-xl text-gray-600">
              {howItWorksData.subtitle || defaultHowItWorks.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {(howItWorksData.steps || defaultHowItWorks.steps || [])
              .filter((s) => s.isActive !== false)
              .map((item, index) => {
                const Icon = iconMap[item.icon || 'Zap'] || Zap;
                return (
                  <div key={item.id || index} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-sm font-semibold text-blue-600 mb-2">
                      Step {item.step || index + 1}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                );
              })}
          </div>
          {/* Stats */}
          {howItWorksData.stats && howItWorksData.stats.filter((s) => s.isActive !== false).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
              {howItWorksData.stats
                .filter((s) => s.isActive !== false)
                .map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-gray-600">{stat.label}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {socialProofData.trustTitle || defaultSocialProof.trustTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(socialProofData.testimonials || defaultSocialProof.testimonials || [])
              .filter((t) => t.isActive !== false)
              .map((testimonial, index) => (
                <div
                  key={testimonial.id || index}
                  className="bg-white rounded-xl p-8 shadow-sm border border-gray-200"
                >
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {ctaData.headline || defaultCta.headline}
          </h2>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {ctaData.headlineSecondLine || defaultCta.headlineSecondLine}
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-8 leading-relaxed">
            {ctaData.subtitle || defaultCta.subtitle}
          </p>
          {ctaData.features && ctaData.features.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {ctaData.features.map((feature, idx) => (
                <span key={idx} className="inline-flex items-center text-sm text-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-white mr-1" />
                  {feature}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={ctaData.primaryCTA?.url || defaultCta.primaryCTA?.url || '/register'}>
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100"
              >
                {ctaData.primaryCTA?.text || defaultCta.primaryCTA?.text}
              </Button>
            </Link>
            <Link href={ctaData.secondaryCTA?.url || defaultCta.secondaryCTA?.url || '/plans'}>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600"
              >
                {ctaData.secondaryCTA?.text || defaultCta.secondaryCTA?.text}
              </Button>
            </Link>
          </div>
          {ctaData.trustBadge && (
            <p className="text-sm text-blue-100 mt-6">{ctaData.trustBadge}</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
