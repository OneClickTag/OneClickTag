'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useInView } from '@/hooks/use-in-view';
import {
  Zap,
  ArrowRight,
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

// Gradient color mapping
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

const getGradientStyle = (colorClass?: string): React.CSSProperties => {
  if (!colorClass) {
    return { background: 'linear-gradient(to right, #3b82f6, #a855f7)' };
  }
  const gradient = gradientMap[colorClass];
  if (gradient) {
    return { background: gradient };
  }
  return { background: 'linear-gradient(to right, #3b82f6, #a855f7)' };
};

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

interface LandingFeaturesProps {
  content: FeaturesContent;
}

export function LandingFeatures({ content }: LandingFeaturesProps) {
  const [featuresRef, featuresInView] = useInView<HTMLElement>({ threshold: 0.25 });

  const features = (content.features || []).filter((f) => f.isActive !== false);
  const count = features.length;

  // Dynamic grid based on feature count
  const gridClass =
    count === 1
      ? 'grid grid-cols-1 max-w-md mx-auto gap-8'
      : count === 2
      ? 'grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-8'
      : count === 4
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';

  return (
    <section ref={featuresRef} className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
            featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'GTM, Google Ads & GA4'}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {content.titleHighlight || 'All Automated'}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {content.subtitle ||
              'Three tools. One click. Zero headaches. OneClickTag connects everything so you never have to manually configure tracking again.'}
          </p>
        </div>

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
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {content.bottomCTA && (
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">{content.bottomCTA.text}</p>
            <Link
              href={content.bottomCTA.linkUrl || '/register'}
            >
              <Button variant="outline">
                {content.bottomCTA.linkText || 'Get started'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
