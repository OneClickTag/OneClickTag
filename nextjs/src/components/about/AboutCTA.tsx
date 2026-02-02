'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useInView } from '@/hooks/use-in-view';
import { ArrowRight } from 'lucide-react';

interface CTAButton {
  text?: string;
  url?: string;
}

interface AboutCTAContent {
  headline?: string;
  subtitle?: string;
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
}

interface AboutCTAProps {
  content: AboutCTAContent;
  earlyAccessMode: boolean;
}

export function AboutCTA({ content, earlyAccessMode }: AboutCTAProps) {
  const [ctaRef, ctaInView] = useInView<HTMLElement>({ threshold: 0.3 });

  const cta = earlyAccessMode
    ? {
        ...content,
        headline: content.headline || 'Be Among the First',
        subtitle: content.subtitle || 'Join our waitlist to get early access when we launch',
        primaryCTA: { text: 'Join Waitlist', url: '/early-access' },
        secondaryCTA: { text: 'Contact Us', url: '/contact' },
      }
    : {
        ...content,
        headline: content.headline || 'Ready to Get Started?',
        subtitle: content.subtitle || 'Join thousands of marketers already saving hours on tracking setup.',
        primaryCTA: content.primaryCTA || { text: 'Start Free Trial', url: '/register' },
        secondaryCTA: content.secondaryCTA || { text: 'Contact Us', url: '/contact' },
      };

  return (
    <section
      ref={ctaRef}
      className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-10" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-10" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          className={`text-4xl md:text-5xl font-bold text-white mb-6 transform transition-all duration-700 ${
            ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {cta.headline}
        </h2>
        <p
          className={`text-xl text-blue-100 mb-10 leading-relaxed max-w-2xl mx-auto transform transition-all duration-700 delay-100 ${
            ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {cta.subtitle}
        </p>
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center transform transition-all duration-700 delay-200 ${
            ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Link href={cta.primaryCTA?.url || '/register'}>
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100"
            >
              {cta.primaryCTA?.text || 'Start Free Trial'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          {cta.secondaryCTA && (
            <Link href={cta.secondaryCTA.url || '/contact'}>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600"
              >
                {cta.secondaryCTA.text || 'Contact Us'}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
