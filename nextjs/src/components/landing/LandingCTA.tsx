'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useInView } from '@/hooks/use-in-view';
import {
  CheckCircle2,
  Zap,
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

interface CTAButton {
  url?: string;
  text?: string;
}

interface CtaContent {
  badge?: {
    icon?: string;
    text?: string;
  };
  headline?: string;
  headlineSecondLine?: string;
  subtitle?: string;
  features?: string[];
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
  trustBadge?: string;
}

interface LandingCTAProps {
  content: CtaContent;
}

export function LandingCTA({ content }: LandingCTAProps) {
  const [ctaRef, ctaInView] = useInView<HTMLElement>({ threshold: 0.3 });

  const ctaData = content;

  return (
    <section ref={ctaRef} className="py-16 sm:py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {ctaData.badge?.text && (() => {
          const BadgeIcon = iconMap[ctaData.badge?.icon || 'Sparkles'] || Sparkles;
          return (
            <div
              className={`inline-flex items-center space-x-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 transform transition-all duration-700 ${
                ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <BadgeIcon className="w-4 h-4" />
              <span>{ctaData.badge.text}</span>
            </div>
          );
        })()}
        <h2
          className={`text-3xl sm:text-4xl font-bold text-white mb-2 transform transition-all duration-700 ${
            ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {ctaData.headline || 'Start Tracking in 2 Minutes.'}
        </h2>
        <h2
          className={`text-3xl sm:text-4xl font-bold text-white mb-6 transform transition-all duration-700 delay-100 ${
            ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {ctaData.headlineSecondLine || 'Free for 14 Days.'}
        </h2>
        <p
          className={`text-lg sm:text-xl text-blue-100 mb-8 leading-relaxed transform transition-all duration-700 delay-200 ${
            ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {ctaData.subtitle ||
            'No credit card required. Cancel anytime. Your first conversion tracking setup is just clicks away.'}
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
          className={`flex flex-col sm:flex-row gap-4 justify-center transform transition-all duration-700 delay-500 ${
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
  );
}
