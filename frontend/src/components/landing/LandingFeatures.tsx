import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Tag, Target, BarChart3, Zap, Shield, Globe, LucideIcon } from 'lucide-react';
import { publicService } from '@/lib/api/services/publicService';

// Icon mapping for dynamic loading
const iconMap: Record<string, LucideIcon> = {
  Tag,
  Target,
  BarChart3,
  Zap,
  Shield,
  Globe,
};

interface Feature {
  id: string;
  isActive: boolean;
  order: number;
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface FeaturesContent {
  title: string;
  titleHighlight: string;
  subtitle: string;
  features: Feature[];
  bottomCTA: {
    text: string;
    linkText: string;
    linkUrl: string;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

// Helper function to get only active items sorted by order
function getActiveItems<T extends { isActive: boolean; order: number }>(items: T[]): T[] {
  return items
    .filter((item) => item.isActive)
    .sort((a, b) => a.order - b.order);
}

export function LandingFeatures() {
  const [content, setContent] = useState<FeaturesContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadContent = async () => {
      try {
        const section = await publicService.getLandingSection('features');
        if (!cancelled) {
          if (section.isActive && section.content) {
            setContent(section.content as FeaturesContent);
            setIsActive(true);
          } else {
            setIsActive(false);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          // If section is inactive, backend returns 404 - hide the section
          if (error?.response?.status === 404) {
            console.log('Features section is inactive or not found');
            setIsActive(false);
          } else {
            console.error('Failed to load features content:', error);
            // Use default content on error for other errors
            setContent({
              title: 'Everything You Need',
              titleHighlight: 'In One Platform',
              subtitle: 'Stop juggling multiple tools. OneClickTag brings all your tracking needs together in one simple interface.',
              features: [
                {
                  id: 'feature-1',
                  isActive: true,
                  order: 0,
                  icon: 'Tag',
                  title: 'Google Tag Manager',
                  description: 'Automatically create tags, triggers, and variables in your GTM container. No manual setup needed.',
                  color: 'from-blue-500 to-blue-600',
                },
                {
                  id: 'feature-2',
                  isActive: true,
                  order: 1,
                  icon: 'Target',
                  title: 'Google Ads Integration',
                  description: 'Sync conversion actions to Google Ads instantly. Track ROI and optimize campaigns effortlessly.',
                  color: 'from-green-500 to-green-600',
                },
                {
                  id: 'feature-3',
                  isActive: true,
                  order: 2,
                  icon: 'BarChart3',
                  title: 'GA4 Events',
                  description: 'Create custom GA4 events with proper parameters. Get accurate analytics data from day one.',
                  color: 'from-purple-500 to-purple-600',
                },
                {
                  id: 'feature-4',
                  isActive: true,
                  order: 3,
                  icon: 'Zap',
                title: 'Lightning Fast',
                description: 'What takes 30 minutes manually takes 2 minutes with OneClickTag. Save time, reduce errors.',
                color: 'from-yellow-500 to-orange-600',
              },
              {
                id: 'feature-5',
                isActive: true,
                order: 4,
                icon: 'Shield',
                title: 'Secure & Reliable',
                description: 'OAuth 2.0 authentication, encrypted data storage, and automatic token refresh. Your data is safe.',
                color: 'from-red-500 to-pink-600',
              },
              {
                id: 'feature-6',
                isActive: true,
                order: 5,
                icon: 'Globe',
                title: 'Multi-Customer',
                description: 'Manage tracking for multiple clients from one dashboard. Perfect for agencies and consultants.',
                color: 'from-indigo-500 to-indigo-600',
              },
            ],
            bottomCTA: {
              text: 'Ready to simplify your tracking workflow?',
              linkText: 'Get started for free',
              linkUrl: '/register',
            },
          });
            setIsActive(true);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </section>
    );
  }

  // Don't render if section is inactive
  if (!isActive || !content) {
    return null;
  }

  return (
    <section className="py-20 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {content.title}
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {content.titleHighlight}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {content.subtitle}
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {getActiveItems(content.features).map((feature, index) => {
            const Icon = iconMap[feature.icon] || Zap;
            return (
              <motion.div
                key={feature.id}
                variants={itemVariants}
                className="group relative"
              >
                <div className="relative bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 h-full hover:border-transparent hover:-translate-y-1">
                  {/* Gradient Border on Hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"
                       style={{
                         background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                       }} />

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Hover Arrow */}
                  <div className="mt-4 text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center space-x-2">
                    <span>Learn more</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <p className="text-gray-600 mb-4">
            {content.bottomCTA.text}
          </p>
          <a
            href={content.bottomCTA.linkUrl}
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-semibold text-lg group"
          >
            <span>{content.bottomCTA.linkText}</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
