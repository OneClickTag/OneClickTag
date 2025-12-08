import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { publicService } from '@/lib/api/services/publicService';

interface CTAContent {
  badge: {
    icon: string;
    text: string;
  };
  headline: string;
  headlineSecondLine: string;
  subtitle: string;
  features: string[];
  primaryCTA: {
    text: string;
    url: string;
  };
  secondaryCTA: {
    text: string;
    url: string;
  };
  trustBadge: string;
  testimonial: {
    quote: string;
    author: {
      name: string;
      role: string;
      initials: string;
    };
  };
}

export function LandingCTA() {
  const [content, setContent] = useState<CTAContent | null>(null);
  const [loading, setLoading] = useState(true);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    const loadContent = async () => {
      try {
        const section = await publicService.getLandingSection('cta');
        if (section.isActive && section.content) {
          setContent(section.content as CTAContent);
        }
      } catch (error) {
        console.error('Failed to load CTA content:', error);
        // Use default content on error
        setContent({
          badge: { icon: 'Sparkles', text: 'Limited Time Offer' },
          headline: 'Ready to Transform Your',
          headlineSecondLine: 'Tracking Workflow?',
          subtitle: 'Join 1,000+ marketers who are saving hours every week with automated tracking setup. Start your 14-day free trial today—no credit card required.',
          features: ['14-day free trial', 'No credit card required', 'Cancel anytime', 'Setup in 2 minutes'],
          primaryCTA: { text: 'Start Free Trial', url: '/register' },
          secondaryCTA: { text: 'View Pricing', url: '/plans' },
          trustBadge: 'Secure OAuth connection • GDPR compliant • SOC 2 certified',
          testimonial: {
            quote: 'OneClickTag is the tool I wish I had 5 years ago. It\'s saved our team countless hours and eliminated tracking errors completely.',
            author: {
              name: 'James Davis',
              initials: 'JD',
              role: 'Head of Marketing, TechCorp'
            }
          }
        });
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  if (loading || !content) {
    return (
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden" ref={ref}>
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
        >
          <Sparkles className="w-4 h-4" />
          <span>{content.badge.text}</span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
        >
          {content.headline}
          <br />
          {content.headlineSecondLine}
        </motion.h2>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
        >
          {content.subtitle}
        </motion.p>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mb-10"
        >
          {content.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">{feature}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
        >
          <Button
            asChild
            size="lg"
            className="text-lg px-10 py-7 bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <Link to={content.primaryCTA.url} className="flex items-center space-x-2">
              <span>{content.primaryCTA.text}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="text-lg px-10 py-7 border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300"
          >
            <Link to={content.secondaryCTA.url}>{content.secondaryCTA.text}</Link>
          </Button>
        </motion.div>

        {/* Trust Badge */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="text-sm text-white/80"
        >
          🔒 {content.trustBadge}
        </motion.p>

        {/* Testimonial Quote */}
        {content.testimonial && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto border border-white/20"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white text-lg mb-4 leading-relaxed">
                  "{content.testimonial.quote}"
                </p>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {content.testimonial.author.initials}
                  </div>
                  <div className="text-white">
                    <div className="font-semibold">{content.testimonial.author.name}</div>
                    <div className="text-sm text-white/80">{content.testimonial.author.role}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
