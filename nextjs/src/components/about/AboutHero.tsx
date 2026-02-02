'use client';

import { useInView } from '@/hooks/use-in-view';
import {
  Sparkles,
  Building2,
  Users,
  Zap,
  Target,
  Rocket,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Sparkles,
  Building2,
  Users,
  Zap,
  Target,
  Rocket,
  sparkles: Sparkles,
  building2: Building2,
  users: Users,
  zap: Zap,
  target: Target,
  rocket: Rocket,
};

interface Stat {
  value: string;
  label: string;
}

interface AboutHeroContent {
  badge?: {
    icon?: string;
    text?: string;
  };
  headline?: string;
  headlineHighlight?: string;
  subtitle?: string;
  stats?: Stat[];
}

interface AboutHeroProps {
  content: AboutHeroContent;
}

export function AboutHero({ content }: AboutHeroProps) {
  const [heroRef, heroInView] = useInView<HTMLElement>({ threshold: 0.3 });

  const BadgeIcon = iconMap[content.badge?.icon || 'Sparkles'] || Sparkles;

  return (
    <section
      ref={heroRef}
      className="relative py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div
            className={`inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 transform transition-all duration-700 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <BadgeIcon className="w-4 h-4" />
            <span>{content.badge?.text || 'About OneClickTag'}</span>
          </div>

          {/* Headline */}
          <h1
            className={`text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight transform transition-all duration-700 delay-100 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {content.headline || 'Built by Marketers,'}
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {content.headlineHighlight || 'For Marketers'}
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-xl text-gray-600 max-w-3xl mx-auto mb-10 transform transition-all duration-700 delay-200 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {content.subtitle ||
              'We understand the pain of manual tracking setup. That\'s why we built OneClickTag - to give marketers their time back.'}
          </p>

          {/* Stats */}
          {content.stats && content.stats.length > 0 && (
            <div
              className={`flex flex-wrap justify-center gap-8 md:gap-16 transform transition-all duration-700 delay-300 ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {content.stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
