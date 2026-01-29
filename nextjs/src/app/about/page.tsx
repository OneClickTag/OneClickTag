'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import {
  Zap,
  Target,
  Users,
  TrendingUp,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

const EARLY_ACCESS_MODE = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === 'true';

export default function AboutPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast Setup',
      description:
        'Get your tracking up and running in minutes, not hours. No technical expertise required.',
    },
    {
      icon: Target,
      title: 'Precision Tracking',
      description:
        'Accurate conversion tracking that helps you measure what matters most to your business.',
    },
    {
      icon: Users,
      title: 'Built for Teams',
      description:
        'Collaborate seamlessly with your team members and stakeholders in real-time.',
    },
    {
      icon: TrendingUp,
      title: 'Data-Driven Growth',
      description:
        'Make informed decisions with comprehensive analytics and actionable insights.',
    },
  ];

  const values = [
    {
      title: 'Simplicity First',
      description: 'We believe powerful tools should be easy to use.',
    },
    {
      title: 'Customer Success',
      description: "Your growth is our success. We're here to help you win.",
    },
    {
      title: 'Innovation',
      description: 'Constantly improving and adapting to the latest marketing trends.',
    },
    {
      title: 'Transparency',
      description: 'Clear pricing, honest communication, and no hidden surprises.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-50" />
        <div
          className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>About OneClickTag</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Simplifying
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}
              Conversion Tracking
            </span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            We&apos;re on a mission to make Google Tag Manager and conversion
            tracking accessible to everyone. No coding required, no
            headaches&mdash;just results.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white text-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg leading-relaxed opacity-90">
              To empower businesses of all sizes with enterprise-level tracking
              capabilities. We believe that every business deserves access to
              accurate data and powerful insights, regardless of technical
              expertise or budget.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose OneClickTag?
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features designed to make your life easier
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 ${
                    isVisible
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className={`text-center p-6 transition-all duration-300 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100 + 200}ms` }}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Story */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Story</h2>
          </div>
          <div className="prose prose-lg prose-blue max-w-none">
            <p className="text-gray-700 leading-relaxed mb-6">
              OneClickTag was born from a simple frustration: setting up
              conversion tracking shouldn&apos;t require a computer science
              degree. Our founders, experienced marketers themselves, spent
              countless hours wrestling with Google Tag Manager configurations,
              only to realize that most of the process could be automated.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              We built OneClickTag to eliminate the complexity and technical
              barriers that prevent businesses from accessing crucial conversion
              data. What used to take hours of development time now takes just
              minutes with our intuitive platform.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Today, we&apos;re proud to help thousands of businesses track
              their conversions accurately and make data-driven decisions with
              confidence. And we&apos;re just getting started.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            {EARLY_ACCESS_MODE ? 'Be Among the First' : 'Ready to Get Started?'}
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            {EARLY_ACCESS_MODE
              ? 'Join our waitlist to get early access when we launch'
              : 'Join thousands of businesses already tracking their conversions with OneClickTag'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={EARLY_ACCESS_MODE ? '/early-access' : '/register'}>
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100"
              >
                {EARLY_ACCESS_MODE ? 'Join Waitlist' : 'Start Free Trial'}
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
