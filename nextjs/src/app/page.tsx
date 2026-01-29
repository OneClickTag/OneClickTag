'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { useInView } from '@/hooks/use-in-view';

const EARLY_ACCESS_MODE = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === 'true';

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

// Gradient color mapping - converts Tailwind class names to CSS gradients
// This is needed because dynamic Tailwind classes get purged at build time
const gradientMap: Record<string, string> = {
  'from-blue-500 to-blue-600': 'linear-gradient(to right, #3b82f6, #2563eb)',
  'from-blue-500 to-purple-500': 'linear-gradient(to right, #3b82f6, #a855f7)',
  'from-green-500 to-green-600': 'linear-gradient(to right, #22c55e, #16a34a)',
  'from-purple-500 to-purple-600': 'linear-gradient(to right, #a855f7, #9333ea)',
  'from-yellow-500 to-orange-600': 'linear-gradient(to right, #eab308, #ea580c)',
  'from-red-500 to-pink-600': 'linear-gradient(to right, #ef4444, #db2777)',
  'from-indigo-500 to-indigo-600': 'linear-gradient(to right, #6366f1, #4f46e5)',
  'from-cyan-500 to-cyan-600': 'linear-gradient(to right, #06b6d4, #0891b2)',
  'from-teal-500 to-teal-600': 'linear-gradient(to right, #14b8a6, #0d9488)',
  'from-orange-500 to-orange-600': 'linear-gradient(to right, #f97316, #ea580c)',
};

// Helper to get gradient style from Tailwind class or return default
const getGradientStyle = (colorClass?: string): React.CSSProperties => {
  if (!colorClass) {
    return { background: 'linear-gradient(to right, #3b82f6, #a855f7)' };
  }
  const gradient = gradientMap[colorClass];
  if (gradient) {
    return { background: gradient };
  }
  // Fallback for unknown gradients
  return { background: 'linear-gradient(to right, #3b82f6, #a855f7)' };
};

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
  // Additional common icons
  zap: Zap,
  target: Target,
  'bar-chart-3': BarChart3,
  barchart3: BarChart3,
  sparkles: Sparkles,
  tag: Tag,
  shield: Shield,
  globe: Globe,
  'mouse-pointer-click': MousePointerClick,
  mousepointerclick: MousePointerClick,
  link2: Link2,
  rocket: Rocket,
  'check-circle-2': CheckCircle2,
  checkcircle2: CheckCircle2,
  users: Users,
  clock: Clock,
  'trending-up': TrendingUp,
  trendingup: TrendingUp,
  star: Star,
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
  primaryCTA: {
    url: EARLY_ACCESS_MODE ? '/early-access' : '/register',
    text: EARLY_ACCESS_MODE ? 'Join Waitlist' : 'Start Free Trial'
  },
  secondaryCTA: EARLY_ACCESS_MODE ? undefined : { url: '/plans', text: 'View Pricing' },
  trustIndicators: EARLY_ACCESS_MODE
    ? 'Be the first to know when we launch • Limited spots available'
    : 'No credit card required • Cancel anytime • 14-day free trial',
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
  subtitle: EARLY_ACCESS_MODE
    ? 'Join the waitlist to be among the first to experience OneClickTag when we launch.'
    : 'Join 1,000+ marketers who are saving hours every week with automated tracking setup.',
  primaryCTA: {
    url: EARLY_ACCESS_MODE ? '/early-access' : '/register',
    text: EARLY_ACCESS_MODE ? 'Join Waitlist' : 'Start Free Trial'
  },
  secondaryCTA: EARLY_ACCESS_MODE ? undefined : { url: '/plans', text: 'View Pricing' },
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

  // All sections use viewport-triggered animations
  // Higher threshold = animation triggers when more of element is visible
  const [heroRef, heroInView] = useInView<HTMLElement>({ threshold: 0.3 });
  const [featuresRef, featuresInView] = useInView<HTMLElement>({ threshold: 0.25 });
  const [howItWorksRef, howItWorksInView] = useInView<HTMLElement>({ threshold: 0.25 });
  const [testimonialsRef, testimonialsInView] = useInView<HTMLElement>({ threshold: 0.25 });
  const [ctaRef, ctaInView] = useInView<HTMLElement>({ threshold: 0.3 });

  // Get content with fallbacks
  const heroBase = content?.hero || defaultHero;
  const featuresData = content?.features || defaultFeatures;
  const howItWorksData = content?.['how-it-works'] || defaultHowItWorks;
  const socialProofData = content?.['social-proof'] || defaultSocialProof;
  const ctaBase = content?.cta || defaultCta;

  // Override CTAs when in early access mode
  const hero = EARLY_ACCESS_MODE ? {
    ...heroBase,
    primaryCTA: { url: '/early-access', text: 'Join Waitlist' },
    secondaryCTA: undefined,
    trustIndicators: 'Be the first to know when we launch • Limited spots available',
  } : heroBase;

  const ctaData = EARLY_ACCESS_MODE ? {
    ...ctaBase,
    subtitle: 'Join the waitlist to be among the first to experience OneClickTag when we launch.',
    primaryCTA: { url: '/early-access', text: 'Join Waitlist' },
    secondaryCTA: undefined,
    features: ['Early access pricing', 'Be first to know', 'Limited spots'],
  } : ctaBase;

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
      <section ref={heroRef} className="relative py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge with animation */}
            <div
              className={`inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 transform transition-all duration-700 ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <BadgeIcon className="w-4 h-4" />
              <span>{hero.badge?.text || defaultHero.badge?.text}</span>
            </div>
            {/* Headline with staggered animation */}
            <h1
              className={`text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight transform transition-all duration-700 delay-100 ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {hero.headline || defaultHero.headline}
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {hero.headlineHighlight || defaultHero.headlineHighlight}
              </span>
            </h1>
            {/* Subtitle with staggered animation */}
            <p
              className={`text-xl text-gray-600 max-w-3xl mx-auto mb-6 transform transition-all duration-700 delay-200 ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {hero.subtitle || defaultHero.subtitle}
            </p>
            {/* Benefits with staggered animation */}
            {(hero.benefits || defaultHero.benefits) && (
              <div
                className={`flex flex-wrap justify-center gap-4 mb-8 transform transition-all duration-700 delay-300 ${
                  heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                {(hero.benefits || defaultHero.benefits || []).map((benefit, idx) => (
                  <span key={idx} className="inline-flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
                    {benefit}
                  </span>
                ))}
              </div>
            )}
            {/* Buttons with staggered animation */}
            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center transform transition-all duration-700 delay-[400ms] ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Link href={hero.primaryCTA?.url || '/early-access'}>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {hero.primaryCTA?.text || 'Join Waitlist'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {hero.secondaryCTA && (
                <Link href={hero.secondaryCTA.url || '/plans'}>
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                    {hero.secondaryCTA.text || 'View Pricing'}
                  </Button>
                </Link>
              )}
            </div>
            {/* Trust indicators with animation */}
            {hero.trustIndicators && (
              <p
                className={`text-sm text-gray-500 mt-4 transform transition-all duration-700 delay-500 ${
                  heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                {hero.trustIndicators}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
              featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
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
          {(() => {
            const features = (featuresData.features || defaultFeatures.features || []).filter((f) => f.isActive !== false);
            const count = features.length;
            // Dynamic grid based on feature count
            const gridClass = count === 1
              ? 'grid grid-cols-1 max-w-md mx-auto gap-8'
              : count === 2
              ? 'grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-8'
              : count === 4
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'
              : count === 5
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
              : count === 6
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';
            return (
              <div className={gridClass}>
                {features.map((feature, index) => {
                  const Icon = iconMap[feature.icon || 'Zap'] || Zap;
                  return (
                    <div
                      key={feature.id || index}
                      className={`bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300 transform ${
                        featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                      }`}
                      style={{
                        transitionDelay: featuresInView ? `${150 + index * 100}ms` : '0ms',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                        style={getGradientStyle(feature.color)}
                      >
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
            );
          })()}
          {featuresData.bottomCTA && (
            <div className="text-center mt-12">
              <p className="text-gray-600 mb-4">{featuresData.bottomCTA.text}</p>
              <Link href={EARLY_ACCESS_MODE ? '/early-access' : (featuresData.bottomCTA.linkUrl || '/register')}>
                <Button variant="outline">
                  {EARLY_ACCESS_MODE ? 'Join Waitlist' : (featuresData.bottomCTA.linkText || 'Get started')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
              howItWorksInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {howItWorksData.title || defaultHowItWorks.title}
            </h2>
            <p className="text-xl text-gray-600">
              {howItWorksData.subtitle || defaultHowItWorks.subtitle}
            </p>
          </div>
          {(() => {
            const steps = (howItWorksData.steps || defaultHowItWorks.steps || []).filter((s) => s.isActive !== false);
            const count = steps.length;
            // Dynamic grid: 1 col on mobile, 2 on md, then adapt to count on lg
            const gridClass = count === 1
              ? 'grid grid-cols-1 max-w-md mx-auto gap-8'
              : count === 2
              ? 'grid grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto gap-8'
              : count === 3
              ? 'grid grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto gap-8'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8';
            return (
              <div className={gridClass}>
                {steps.map((item, index) => {
                  const Icon = iconMap[item.icon || 'Zap'] || Zap;
                  return (
                    <div
                      key={item.id || index}
                      className={`text-center transform transition-all duration-500 ${
                        howItWorksInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                      }`}
                      style={{
                        transitionDelay: howItWorksInView ? `${150 + index * 150}ms` : '0ms',
                      }}
                    >
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-sm font-semibold text-blue-600 mb-2">
                        Step {item.step || String(index + 1).padStart(2, '0')}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
      <section ref={testimonialsRef} className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
              testimonialsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {socialProofData.trustTitle || defaultSocialProof.trustTitle}
            </h2>
          </div>
          {(() => {
            const testimonials = (socialProofData.testimonials || defaultSocialProof.testimonials || []).filter((t) => t.isActive !== false);
            const count = testimonials.length;
            // Dynamic grid based on testimonial count
            const gridClass = count === 1
              ? 'grid grid-cols-1 max-w-lg mx-auto gap-8'
              : count === 2
              ? 'grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8'
              : count === 4
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';
            return (
              <div className={gridClass}>
                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.id || index}
                    className={`bg-white rounded-xl p-8 shadow-sm border border-gray-200 transform transition-all duration-500 ${
                      testimonialsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{
                      transitionDelay: testimonialsInView ? `${100 + index * 100}ms` : '0ms',
                    }}
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
            );
          })()}
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-16 sm:py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className={`text-3xl sm:text-4xl font-bold text-white mb-2 transform transition-all duration-700 ${
              ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {ctaData.headline || defaultCta.headline}
          </h2>
          <h2
            className={`text-3xl sm:text-4xl font-bold text-white mb-6 transform transition-all duration-700 delay-100 ${
              ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {ctaData.headlineSecondLine || defaultCta.headlineSecondLine}
          </h2>
          <p
            className={`text-lg sm:text-xl text-blue-100 mb-8 leading-relaxed transform transition-all duration-700 delay-200 ${
              ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {ctaData.subtitle || defaultCta.subtitle}
          </p>
          {ctaData.features && ctaData.features.length > 0 && (
            <div
              className={`flex flex-wrap justify-center gap-4 mb-8 transform transition-all duration-700 delay-300 ${
                ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {ctaData.features.map((feature, idx) => (
                <span key={idx} className="inline-flex items-center text-sm text-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-white mr-1" />
                  {feature}
                </span>
              ))}
            </div>
          )}
          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center transform transition-all duration-700 delay-[400ms] ${
              ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Link href={ctaData.primaryCTA?.url || '/early-access'}>
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100"
              >
                {ctaData.primaryCTA?.text || 'Join Waitlist'}
              </Button>
            </Link>
            {ctaData.secondaryCTA && (
              <Link href={ctaData.secondaryCTA.url || '/plans'}>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600"
                >
                  {ctaData.secondaryCTA.text || 'View Pricing'}
                </Button>
              </Link>
            )}
          </div>
          {ctaData.trustBadge && (
            <p
              className={`text-sm text-blue-100 mt-6 transform transition-all duration-700 delay-500 ${
                ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {ctaData.trustBadge}
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
