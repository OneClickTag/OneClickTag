'use client';

import { useInView } from '@/hooks/use-in-view';
import {
  Lightbulb,
  Target,
  Rocket,
  Heart,
  Zap,
  Users,
  Shield,
  Globe,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Lightbulb,
  Target,
  Rocket,
  Heart,
  Zap,
  Users,
  Shield,
  Globe,
  lightbulb: Lightbulb,
  target: Target,
  rocket: Rocket,
  heart: Heart,
  zap: Zap,
  users: Users,
  shield: Shield,
  globe: Globe,
};

interface StoryBlock {
  id?: string;
  icon?: string;
  title?: string;
  description?: string;
}

interface AboutMissionContent {
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  storyBlocks?: StoryBlock[];
}

interface AboutMissionProps {
  content: AboutMissionContent;
}

export function AboutMission({ content }: AboutMissionProps) {
  const [sectionRef, sectionInView] = useInView<HTMLElement>({ threshold: 0.25 });

  const blocks = content.storyBlocks || [
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
  ];

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          className={`text-center mb-12 sm:mb-16 transform transition-all duration-700 ${
            sectionInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Our Story:'}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {content.titleHighlight || 'Why We Exist'}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {content.subtitle || 'The journey from frustration to innovation.'}
          </p>
        </div>

        {/* Story Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blocks.map((block, index) => {
            const Icon = iconMap[block.icon || 'Lightbulb'] || Lightbulb;
            return (
              <div
                key={block.id || index}
                className={`bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300 transform ${
                  sectionInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: sectionInView ? `${150 + index * 100}ms` : '0ms',
                }}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{block.title}</h3>
                <p className="text-gray-600 leading-relaxed">{block.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
