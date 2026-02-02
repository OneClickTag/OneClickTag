import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { MousePointerClick, Link2, Rocket, CheckCircle2 } from 'lucide-react';
import { publicService } from '@/lib/api/services/publicService';

// Icon mapping
const iconMap = {
  MousePointerClick,
  Link2,
  Rocket,
  CheckCircle2,
};

interface Step {
  id: string;
  isActive: boolean;
  order: number;
  icon: string;
  title: string;
  description: string;
  step: string;
}

interface Stat {
  id: string;
  isActive: boolean;
  order: number;
  value: string;
  label: string;
}

interface HowItWorksContent {
  title: string;
  subtitle: string;
  steps: Step[];
  stats: Stat[];
}

// Helper function to get only active items sorted by order
function getActiveItems<T extends { isActive: boolean; order: number }>(items: T[]): T[] {
  return items
    .filter((item) => item.isActive)
    .sort((a, b) => a.order - b.order);
}

export function LandingHowItWorks() {
  const [content, setContent] = useState<HowItWorksContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchContent() {
      try {
        const data = await publicService.getLandingSection('how-it-works');
        if (!cancelled) {
          if (data && data.isActive && data.content) {
            setContent(data.content as HowItWorksContent);
            setIsActive(true);
          } else {
            setIsActive(false);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          // Hide section on any error - no fallback data
          if (error?.response?.status === 404) {
            console.log('How It Works section is inactive or not found');
          } else {
            console.error('Failed to fetch How It Works content:', error);
          }
          setIsActive(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchContent();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="text-center mb-20">
              <div className="h-12 bg-gray-200 rounded-lg w-1/3 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3 mx-auto"></div>
            </div>

            {/* Steps skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative">
                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="w-16 h-16 bg-gray-200 rounded-xl mb-6"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats skeleton */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-10 bg-gradient-to-r from-blue-200 to-purple-200 rounded w-20 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Don't render if section is inactive or no content
  if (!isActive || !content) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {content.title}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {content.subtitle}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 transform -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {getActiveItems(content.steps).map((step, index) => {
              const Icon = iconMap[step.icon as keyof typeof iconMap] || MousePointerClick;
              const activeSteps = getActiveItems(content.steps);
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative"
                >
                  <div className="relative z-10 bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    {/* Step Number */}
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                      {step.step}
                    </div>

                    {/* Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center mb-6">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow (hidden on mobile) */}
                  {index < activeSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                      <div className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {getActiveItems(content.stats).map((stat, _index) => (
            <div key={stat.id} className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600 text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
