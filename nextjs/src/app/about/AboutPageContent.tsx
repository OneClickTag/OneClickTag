'use client';

import { AlertCircle } from 'lucide-react';
import { AboutHero, AboutMission, AboutValues, AboutTeam, AboutCTA } from '@/components/about';

interface AboutPageContentProps {
  title: string;
  content: string | null;
  earlyAccessMode: boolean;
}

// Default content for the About page sections
const defaultAboutContent = {
  hero: {
    badge: { icon: 'Sparkles', text: 'About OneClickTag' },
    headline: 'Built by Marketers,',
    headlineHighlight: 'For Marketers',
    subtitle: 'We understand the pain of manual tracking setup. That\'s why we built OneClickTag - to give marketers their time back.',
    stats: [
      { value: '2024', label: 'Founded' },
      { value: '1,000+', label: 'Happy Users' },
      { value: '50K+', label: 'Tags Created' },
    ],
  },
  mission: {
    title: 'Our Story:',
    titleHighlight: 'Why We Exist',
    subtitle: 'The journey from frustration to innovation.',
    storyBlocks: [
      {
        id: '1',
        icon: 'Lightbulb',
        title: 'The Problem',
        description: 'Marketers waste 30+ hours per month configuring GTM, Google Ads, and GA4 manually. It\'s tedious, error-prone, and takes time away from actual marketing.',
      },
      {
        id: '2',
        icon: 'Target',
        title: 'The Vision',
        description: 'We envisioned a world where setting up conversion tracking is as simple as a few clicks. No technical expertise required, no manual configuration.',
      },
      {
        id: '3',
        icon: 'Rocket',
        title: 'The Solution',
        description: 'OneClickTag was born - an intelligent platform that automates your entire tracking setup. What used to take hours now takes minutes.',
      },
    ],
  },
  values: {
    title: 'Our Values:',
    titleHighlight: 'What Drives Us',
    subtitle: 'The principles that guide everything we do.',
    values: [
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
    ],
  },
  team: {
    title: 'Meet the',
    titleHighlight: 'Team',
    subtitle: 'The people behind OneClickTag.',
    showSection: false,
    teamMembers: [],
  },
  cta: {
    headline: 'Ready to Get Started?',
    subtitle: 'Join thousands of marketers already saving hours on tracking setup.',
    primaryCTA: { text: 'Start Free Trial', url: '/register' },
    secondaryCTA: { text: 'Contact Us', url: '/contact' },
  },
};

function parseAboutContent(content: string | null) {
  if (!content) {
    return defaultAboutContent;
  }

  try {
    const parsed = JSON.parse(content);
    // Merge with defaults to ensure all sections exist
    return {
      hero: { ...defaultAboutContent.hero, ...parsed.hero },
      mission: { ...defaultAboutContent.mission, ...parsed.mission },
      values: { ...defaultAboutContent.values, ...parsed.values },
      team: { ...defaultAboutContent.team, ...parsed.team },
      cta: { ...defaultAboutContent.cta, ...parsed.cta },
    };
  } catch {
    // If content is not JSON (legacy markdown), show a message to migrate
    return null;
  }
}

export function AboutPageContent({ title, content, earlyAccessMode }: AboutPageContentProps) {
  const aboutContent = parseAboutContent(content);

  // If content couldn't be parsed (legacy content), show migration message
  if (!aboutContent) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Content Format Update Required
            </h2>
            <p className="text-gray-600 mb-4">
              The About page now uses a structured visual format. Please update the content in
              Admin &rarr; Static Pages &rarr; About to use the new visual editor.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <AboutHero content={aboutContent.hero} />
      <AboutMission content={aboutContent.mission} />
      <AboutValues content={aboutContent.values} />
      <AboutTeam content={aboutContent.team} />
      <AboutCTA content={aboutContent.cta} earlyAccessMode={earlyAccessMode} />
    </>
  );
}
