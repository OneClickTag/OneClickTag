'use client';

import { useInView } from '@/hooks/use-in-view';
import {
  Zap,
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

interface LandingHowItWorksProps {
  content: HowItWorksContent;
}

export function LandingHowItWorks({ content }: LandingHowItWorksProps) {
  const [howItWorksRef, howItWorksInView] = useInView<HTMLElement>({ threshold: 0.25 });

  const steps = (content.steps || []).filter((s) => s.isActive !== false);
  const count = steps.length;

  // Dynamic grid: 1 col on mobile, 2 on md, then adapt to count on lg
  const gridClass =
    count === 1
      ? 'grid grid-cols-1 max-w-md mx-auto gap-8'
      : count === 2
      ? 'grid grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto gap-8'
      : count === 3
      ? 'grid grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto gap-8'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8';

  return (
    <section ref={howItWorksRef} className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
            howItWorksInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Live Tracking in 3 Simple Steps'}
          </h2>
          <p className="text-xl text-gray-600">
            {content.subtitle || 'See how simple conversion tracking can be.'}
          </p>
        </div>

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
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        {content.stats &&
          content.stats.filter((s) => s.isActive !== false).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
              {content.stats
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
  );
}
