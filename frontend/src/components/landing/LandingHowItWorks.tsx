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

const defaultContent: HowItWorksContent = {
  title: 'How It Works',
  subtitle: 'Get up and running in minutes, not hours. Our streamlined process makes tracking setup effortless.',
  steps: [
    {
      id: 'step-1',
      isActive: true,
      order: 0,
      icon: 'MousePointerClick',
      title: 'Connect Google Account',
      description: 'One-click OAuth connection. We securely access your GTM, Google Ads, and GA4 with your permission.',
      step: '01',
    },
    {
      id: 'step-2',
      isActive: true,
      order: 1,
      icon: 'Link2',
      title: 'Configure Tracking',
      description: 'Select what you want to track (button clicks, form submits, page views). Just enter the CSS selector.',
      step: '02',
    },
    {
      id: 'step-3',
      isActive: true,
      order: 2,
      icon: 'Rocket',
      title: 'Deploy Instantly',
      description: 'We automatically create tags, triggers, conversions, and events. Everything is synced in seconds.',
      step: '03',
    },
    {
      id: 'step-4',
      isActive: true,
      order: 3,
      icon: 'CheckCircle2',
      title: 'Monitor & Optimize',
      description: 'See all your trackings in one dashboard. Update or delete anytime. Track status in real-time.',
      step: '04',
    },
  ],
  stats: [
    { id: 'stat-1', isActive: true, order: 0, value: '2 min', label: 'Average Setup Time' },
    { id: 'stat-2', isActive: true, order: 1, value: '95%', label: 'Time Saved' },
    { id: 'stat-3', isActive: true, order: 2, value: '100%', label: 'Accuracy' },
    { id: 'stat-4', isActive: true, order: 3, value: '0', label: 'Code Required' },
  ],
};

export function LandingHowItWorks() {
  const [content, setContent] = useState<HowItWorksContent>(defaultContent);
  const [isActive, setIsActive] = useState(true); // default to true for default content
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    async function fetchContent() {
      try {
        const data = await publicService.getLandingSection('how-it-works');
        if (data && data.isActive && data.content) {
          setContent(data.content as HowItWorksContent);
          setIsActive(true);
        } else if (data && !data.isActive) {
          setIsActive(false);
        }
      } catch (error: any) {
        // If section is inactive, backend returns 404 - hide the section
        if (error?.response?.status === 404) {
          console.log('How It Works section is inactive or not found');
          setIsActive(false);
        } else {
          console.error('Failed to fetch How It Works content:', error);
          // Keep default content and stay active for other errors
        }
      }
    }
    fetchContent();
  }, []);

  // Don't render if section is inactive
  if (!isActive) {
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
