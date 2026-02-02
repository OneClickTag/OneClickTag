'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useInView } from '@/hooks/use-in-view';
import { CheckCircle2 } from 'lucide-react';

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
  earlyAccessMode: boolean;
}

export function LandingCTA({ content, earlyAccessMode }: LandingCTAProps) {
  const [ctaRef, ctaInView] = useInView<HTMLElement>({ threshold: 0.3 });

  // Override CTAs when in early access mode
  const ctaData = earlyAccessMode
    ? {
        ...content,
        subtitle:
          'Join the waitlist to be among the first to experience OneClickTag when we launch.',
        primaryCTA: { url: '/early-access', text: 'Join Waitlist' },
        secondaryCTA: undefined,
        features: ['Early access pricing', 'Be first to know', 'Limited spots'],
      }
    : content;

  return (
    <section ref={ctaRef} className="py-16 sm:py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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
  );
}
