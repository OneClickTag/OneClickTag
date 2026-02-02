import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { TrendingUp, Users, Target, Clock } from 'lucide-react';
import { publicService } from '@/lib/api/services/publicService';

// Icon mapping
const iconMap = {
  Users,
  Target,
  Clock,
  TrendingUp,
};

interface Stat {
  id: string;
  isActive: boolean;
  order: number;
  icon: string;
  value: string;
  label: string;
  description: string;
}

interface Logo {
  id: string;
  isActive: boolean;
  order: number;
  name: string;
  width: string;
}

interface Testimonial {
  id: string;
  isActive: boolean;
  order: number;
  quote: string;
  author: string;
  role: string;
  company: string;
}

interface SocialProofContent {
  stats: Stat[];
  trustTitle: string;
  logos: Logo[];
  testimonials: Testimonial[];
}

// Helper function to get only active items sorted by order
function getActiveItems<T extends { isActive: boolean; order: number }>(items: T[]): T[] {
  return items
    .filter((item) => item.isActive)
    .sort((a, b) => a.order - b.order);
}

export function LandingSocialProof() {
  const [content, setContent] = useState<SocialProofContent | null>(null);
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
        const data = await publicService.getLandingSection('social-proof');
        if (!cancelled) {
          if (data && data.isActive && data.content) {
            setContent(data.content as SocialProofContent);
            setIsActive(true);
          } else {
            setIsActive(false);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          // Hide section on any error - no fallback data
          if (error?.response?.status === 404) {
            console.log('Social Proof section is inactive or not found');
          } else {
            console.error('Failed to fetch Social Proof content:', error);
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            {/* Stats grid skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-2xl mx-auto mb-4"></div>
                  <div className="h-10 bg-gradient-to-r from-blue-200 to-purple-200 rounded w-20 mx-auto mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-24 mx-auto mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
                </div>
              ))}
            </div>

            {/* Trusted by section skeleton */}
            <div className="text-center">
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-8"></div>
              <div className="flex flex-wrap justify-center items-center gap-12">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-24 h-12 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>

            {/* Testimonials skeleton */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
                  <div className="flex space-x-1 mb-4">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="w-5 h-5 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                  <div className="space-y-2 mb-6">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
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
    <section className="py-20 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
        >
          {getActiveItems(content.stats).map((stat, index) => {
            const Icon = iconMap[stat.icon as keyof typeof iconMap] || Users;
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl mb-4">
                  <Icon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-900 font-semibold mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-gray-500">
                  {stat.description}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Trusted By Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-8">
            {content.trustTitle}
          </p>

          {/* Logo Cloud */}
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {getActiveItems(content.logos).map((logo, index) => (
              <motion.div
                key={logo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                className={`${logo.width} h-12 bg-gray-200 rounded-lg flex items-center justify-center`}
              >
                <span className="text-gray-400 font-semibold text-sm">
                  {logo.name}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {getActiveItems(content.testimonials).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
              className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300"
            >
              {/* Stars */}
              <div className="flex space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {testimonial.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-500">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
