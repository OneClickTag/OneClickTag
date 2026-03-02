'use client';

import { useInView } from '@/hooks/use-in-view';
import {
  Star,
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

interface LandingSocialProofProps {
  content: SocialProofContent;
}

export function LandingSocialProof({ content }: LandingSocialProofProps) {
  const [testimonialsRef, testimonialsInView] = useInView<HTMLElement>({ threshold: 0.25 });

  const testimonials = (content.testimonials || []).filter((t) => t.isActive !== false);
  // Duplicate testimonials for seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <section ref={testimonialsRef} className="py-16 sm:py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
            testimonialsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {content.trustTitle || 'Join 1,000+ Marketers Saving Hours Every Week'}
          </h2>
        </div>
      </div>

      {/* Marquee container */}
      <div
        className={`relative transform transition-all duration-700 group ${
          testimonialsInView ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
          {duplicatedTestimonials.map((testimonial, index) => (
            <div
              key={`${testimonial.id || index}-${index}`}
              className="flex-shrink-0 w-80 mx-3 bg-white rounded-xl p-6 shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 hover:border-blue-300 cursor-pointer"
            >
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed text-sm">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{testimonial.author}</p>
                <p className="text-xs text-gray-600">
                  {testimonial.role} at {testimonial.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {content.stats &&
        content.stats.filter((s) => s.isActive !== false).length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-gray-200">
              {content.stats
                .filter((s) => s.isActive !== false)
                .map((stat, index) => {
                  const Icon = iconMap[stat.icon || 'Users'] || Users;
                  return (
                    <div key={index} className="text-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-gray-600 font-medium">{stat.label}</div>
                      {stat.description && (
                        <div className="text-sm text-gray-500 mt-1">{stat.description}</div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
    </section>
  );
}
