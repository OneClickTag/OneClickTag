'use client';

import { useInView } from '@/hooks/use-in-view';
import {
  Heart,
  Users,
  Zap,
  Shield,
  Target,
  Sparkles,
  Rocket,
  Globe,
  Clock,
  TrendingUp,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Heart,
  Users,
  Zap,
  Shield,
  Target,
  Sparkles,
  Rocket,
  Globe,
  Clock,
  TrendingUp,
  heart: Heart,
  users: Users,
  zap: Zap,
  shield: Shield,
  target: Target,
  sparkles: Sparkles,
  rocket: Rocket,
  globe: Globe,
  clock: Clock,
  trendingup: TrendingUp,
};

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

interface ValueItem {
  id?: string;
  icon?: string;
  color?: string;
  title?: string;
  description?: string;
}

interface AboutValuesContent {
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  values?: ValueItem[];
}

interface AboutValuesProps {
  content: AboutValuesContent;
}

export function AboutValues({ content }: AboutValuesProps) {
  const [sectionRef, sectionInView] = useInView<HTMLElement>({ threshold: 0.25 });

  const values = content.values || [
    {
      id: '1',
      icon: 'Users',
      color: 'from-blue-500 to-blue-600',
      title: 'Customer First',
      description: 'Every decision starts with our users. We build what marketers actually need.',
    },
    {
      id: '2',
      icon: 'Zap',
      color: 'from-purple-500 to-purple-600',
      title: 'Simplicity',
      description: 'Complex problems deserve simple solutions. We hide complexity so you don\'t have to deal with it.',
    },
    {
      id: '3',
      icon: 'Shield',
      color: 'from-green-500 to-green-600',
      title: 'Reliability',
      description: 'Your tracking data matters. We ensure accuracy and uptime you can depend on.',
    },
    {
      id: '4',
      icon: 'Rocket',
      color: 'from-orange-500 to-orange-600',
      title: 'Innovation',
      description: 'We continuously evolve with the marketing landscape to keep you ahead.',
    },
  ];

  const count = values.length;
  const gridClass =
    count === 1
      ? 'grid grid-cols-1 max-w-md mx-auto gap-8'
      : count === 2
      ? 'grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-8'
      : count === 4
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
            sectionInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Our Values:'}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {content.titleHighlight || 'What Drives Us'}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {content.subtitle || 'The principles that guide everything we do.'}
          </p>
        </div>

        {/* Values Grid */}
        <div className={gridClass}>
          {values.map((value, index) => {
            const Icon = iconMap[value.icon || 'Heart'] || Heart;
            return (
              <div
                key={value.id || index}
                className={`bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300 transform ${
                  sectionInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: sectionInView ? `${150 + index * 100}ms` : '0ms',
                }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={getGradientStyle(value.color)}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
