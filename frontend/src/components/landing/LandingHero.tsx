import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { publicService } from '@/lib/api/services/publicService';

interface HeroContent {
  badge: {
    icon: string;
    text: string;
  };
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  benefits: string[];
  primaryCTA: {
    text: string;
    url: string;
  };
  secondaryCTA: {
    text: string;
    url: string;
  };
  trustIndicators: string;
  demoVideo: {
    enabled: boolean;
    thumbnail: string | null;
    stats: Array<{
      label: string;
      value: string;
      icon: string;
    }>;
  };
}

export function LandingHero() {
  const [content, setContent] = useState<HeroContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const section = await publicService.getLandingSection('hero');
        if (section.isActive && section.content) {
          setContent(section.content as HeroContent);
        }
      } catch (error) {
        console.error('Failed to load hero content:', error);
        // Use default content on error
        setContent({
          badge: { icon: 'Zap', text: 'Automated Conversion Tracking' },
          headline: 'Setup Google Tracking',
          headlineHighlight: 'In One Click',
          subtitle: 'Stop wasting hours on manual tag setup. OneClickTag automatically creates GTM tags, Google Ads conversions, and GA4 events in seconds.',
          benefits: ['No coding required', 'GTM + Google Ads + GA4', 'Setup in 2 minutes'],
          primaryCTA: { text: 'Start Free Trial', url: '/register' },
          secondaryCTA: { text: 'View Pricing', url: '/plans' },
          trustIndicators: 'No credit card required • Cancel anytime • 14-day free trial',
          demoVideo: { enabled: true, thumbnail: null, stats: [{ label: 'Setup Time', value: '2 min', icon: 'Zap' }] }
        });
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  if (loading || !content) {
    return (
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -50, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8"
          >
            <Zap className="w-4 h-4" />
            <span>{content.badge.text}</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {content.headline}
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {content.headlineHighlight}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto"
          >
            {content.subtitle}
          </motion.p>

          {/* Benefits List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6 mb-10"
          >
            {content.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2 text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">{benefit}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button asChild size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Link to={content.primaryCTA.url} className="flex items-center space-x-2">
                <span>{content.primaryCTA.text}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link to={content.secondaryCTA.url}>{content.secondaryCTA.text}</Link>
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-sm text-gray-500 mt-8"
          >
            {content.trustIndicators}
          </motion.p>

          {/* Demo Video Placeholder */}
          {content.demoVideo.enabled && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="mt-16 max-w-5xl mx-auto"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-blue-600 border-b-8 border-b-transparent ml-1" />
                    </div>
                    <p className="text-gray-600 font-medium">Watch Demo Video</p>
                  </div>
                </div>
              {/* Floating stats */}
              {content.demoVideo.stats && content.demoVideo.stats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.6 }}
                  className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 flex items-center space-x-2"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{content.demoVideo.stats[0].label}</p>
                    <p className="font-bold text-gray-900">{content.demoVideo.stats[0].value}</p>
                  </div>
                </motion.div>
              )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
