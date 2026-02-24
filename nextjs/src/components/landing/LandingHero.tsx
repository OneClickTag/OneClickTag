'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useInView } from '@/hooks/use-in-view';
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Tag,
  Shield,
  Globe,
  MousePointerClick,
  Link2,
  Rocket,
  Users,
  Clock,
  TrendingUp,
  Star,
  Target,
  BarChart3,
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
  // Lowercase variants
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

interface LandingHeroProps {
  content: HeroContent;
  earlyAccessMode: boolean;
}

export function LandingHero({ content, earlyAccessMode }: LandingHeroProps) {
  const [heroRef, heroInView] = useInView<HTMLElement>({ threshold: 0.3 });

  // Override CTAs when in early access mode
  const hero = earlyAccessMode
    ? {
        ...content,
        primaryCTA: { url: '/early-access', text: 'Join Waitlist' },
        secondaryCTA: undefined,
        trustIndicators: 'Be the first to know when we launch • Limited spots available',
      }
    : content;

  // Get badge icon
  const BadgeIcon = iconMap[hero.badge?.icon || 'Zap'] || Zap;

  return (
    <section
      ref={heroRef}
      className="relative py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge with animation */}
          <div
            className={`inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 transform transition-all duration-700 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <BadgeIcon className="w-4 h-4" />
            <span>{hero.badge?.text || 'Automated Conversion Tracking'}</span>
          </div>
          {/* Headline with staggered animation */}
          <h1
            className={`text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight transform transition-all duration-700 delay-100 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {hero.headline || 'Stop Wasting Hours on'}
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {hero.headlineHighlight || 'Google Tag Setup'}
            </span>
          </h1>
          {/* Subtitle with staggered animation */}
          <p
            className={`text-xl text-gray-600 max-w-3xl mx-auto mb-6 transform transition-all duration-700 delay-200 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {hero.subtitle ||
              'OneClickTag automatically creates GTM tags, Google Ads conversions, and GA4 events in seconds. What takes 30 minutes manually takes just 2 minutes here.'}
          </p>
          {/* Benefits with staggered animation */}
          {hero.benefits && hero.benefits.length > 0 && (
            <div
              className={`flex flex-wrap justify-center gap-4 mb-8 transform transition-all duration-700 delay-300 ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {hero.benefits.map((benefit, idx) => (
                <span key={idx} className="inline-flex items-center text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
                  {benefit}
                </span>
              ))}
            </div>
          )}
          {/* Buttons with staggered animation */}
          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center transform transition-all duration-700 delay-500 ${
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
  );
}
