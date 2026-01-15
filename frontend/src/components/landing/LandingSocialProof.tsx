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

const defaultContent: SocialProofContent = {
  stats: [
    {
      id: 'stat-1',
      isActive: true,
      order: 0,
      icon: 'Users',
      value: '1,000+',
      label: 'Active Users',
      description: 'Marketers trust OneClickTag',
    },
    {
      id: 'stat-2',
      isActive: true,
      order: 1,
      icon: 'Target',
      value: '50,000+',
      label: 'Trackings Created',
      description: 'Automated conversions deployed',
    },
    {
      id: 'stat-3',
      isActive: true,
      order: 2,
      icon: 'Clock',
      value: '10,000+',
      label: 'Hours Saved',
      description: 'Time freed for strategy',
    },
    {
      id: 'stat-4',
      isActive: true,
      order: 3,
      icon: 'TrendingUp',
      value: '99.9%',
      label: 'Uptime',
      description: 'Reliable performance',
    },
  ],
  trustTitle: 'Powered By Industry Leaders',
  logos: [
    { id: 'logo-1', isActive: true, order: 0, name: 'Google', width: 'w-24' },
    { id: 'logo-2', isActive: true, order: 1, name: 'Analytics', width: 'w-28' },
    { id: 'logo-3', isActive: true, order: 2, name: 'Ads', width: 'w-20' },
    { id: 'logo-4', isActive: true, order: 3, name: 'Tag Manager', width: 'w-32' },
    { id: 'logo-5', isActive: true, order: 4, name: 'Firebase', width: 'w-24' },
  ],
  testimonials: [
    {
      id: 'testimonial-1',
      isActive: true,
      order: 0,
      quote: "OneClickTag cut our tracking setup time from hours to minutes. It's a game-changer for our agency.",
      author: "Sarah Johnson",
      role: "Marketing Director",
      company: "Digital Growth Co.",
    },
    {
      id: 'testimonial-2',
      isActive: true,
      order: 1,
      quote: "The automation is incredible. We can now focus on strategy instead of tedious tag management.",
      author: "Michael Chen",
      role: "Performance Marketer",
      company: "AdScale Agency",
    },
    {
      id: 'testimonial-3',
      isActive: true,
      order: 2,
      quote: "Finally, a tool that makes Google tracking accessible. Our entire team can use it without training.",
      author: "Emily Rodriguez",
      role: "Growth Lead",
      company: "StartupBoost",
    },
  ],
};

export function LandingSocialProof() {
  const [content, setContent] = useState<SocialProofContent>(defaultContent);
  const [isActive, setIsActive] = useState(true); // default to true for default content
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    async function fetchContent() {
      try {
        const data = await publicService.getLandingSection('social-proof');
        if (data && data.isActive && data.content) {
          setContent(data.content as SocialProofContent);
          setIsActive(true);
        } else if (data && !data.isActive) {
          setIsActive(false);
        }
      } catch (error: any) {
        // If section is inactive, backend returns 404 - hide the section
        if (error?.response?.status === 404) {
          console.log('Social Proof section is inactive or not found');
          setIsActive(false);
        } else {
          console.error('Failed to fetch Social Proof content:', error);
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
