'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Layout,
  RefreshCw,
  Loader2,
  ExternalLink,
  Sparkles,
  LayoutGrid,
  ListOrdered,
  MessageSquare,
  Megaphone,
  Plus,
} from 'lucide-react';

// Import editors
import { HeroEditor } from '@/components/admin/landing/editors/HeroEditor';
import { FeaturesEditor } from '@/components/admin/landing/editors/FeaturesEditor';
import { HowItWorksEditor } from '@/components/admin/landing/editors/HowItWorksEditor';
import { SocialProofEditor } from '@/components/admin/landing/editors/SocialProofEditor';
import { CTAEditor } from '@/components/admin/landing/editors/CTAEditor';
import { CustomSectionsEditor } from '@/components/admin/landing/editors/CustomSectionsEditor';

interface LandingSection {
  id: string;
  key: string;
  content: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Default content for each section
const defaultContent: Record<string, Record<string, unknown>> = {
  hero: {
    badge: { icon: 'Zap', text: 'Automated Conversion Tracking' },
    headline: 'Stop Wasting Hours on',
    headlineHighlight: 'Google Tag Setup',
    subtitle: 'OneClickTag automatically creates GTM tags, Google Ads conversions, and GA4 events in seconds.',
    benefits: ['No coding required', 'GTM + Google Ads + GA4', 'Live in 2 minutes'],
    primaryCTA: { url: '/register', text: 'Start Free Trial' },
    secondaryCTA: { url: '/plans', text: 'View Pricing' },
    trustIndicators: 'No credit card required • Cancel anytime • 14-day free trial',
  },
  features: {
    title: 'GTM, Google Ads & GA4',
    titleHighlight: 'All Automated',
    subtitle: 'Three tools. One click. Zero headaches.',
    features: [
      { id: '1', icon: 'Tag', color: 'from-blue-500 to-blue-600', title: 'Google Tag Manager', description: 'Automatically create tags, triggers, and variables.', isActive: true },
      { id: '2', icon: 'Target', color: 'from-green-500 to-green-600', title: 'Google Ads Integration', description: 'Sync conversion actions instantly.', isActive: true },
      { id: '3', icon: 'BarChart3', color: 'from-purple-500 to-purple-600', title: 'GA4 Events', description: 'Create custom GA4 events with proper parameters.', isActive: true },
    ],
  },
  'how-it-works': {
    title: 'Live Tracking in 3 Simple Steps',
    subtitle: 'See how simple conversion tracking can be.',
    steps: [
      { id: '1', step: '01', icon: 'MousePointerClick', title: 'Connect Google Account', description: 'One-click OAuth connection.', isActive: true },
      { id: '2', step: '02', icon: 'Link2', title: 'Configure Tracking', description: 'Select what you want to track.', isActive: true },
      { id: '3', step: '03', icon: 'Rocket', title: 'Deploy Instantly', description: 'Everything is synced in seconds.', isActive: true },
    ],
  },
  'social-proof': {
    trustTitle: 'Join 1,000+ Marketers Saving Hours Every Week',
    testimonials: [
      { id: '1', author: 'Sarah Johnson', role: 'Marketing Director', company: 'Digital Growth Co.', quote: 'OneClickTag cut our tracking setup time from hours to minutes.', isActive: true },
      { id: '2', author: 'Michael Chen', role: 'Performance Marketer', company: 'AdScale Agency', quote: 'The automation is incredible. No more manual GTM setup headaches.', isActive: true },
    ],
  },
  cta: {
    headline: 'Start Tracking in 2 Minutes.',
    headlineSecondLine: 'Free for 14 Days.',
    subtitle: 'No credit card required. Cancel anytime.',
    primaryCTA: { url: '/register', text: 'Start Free Trial' },
    secondaryCTA: { url: '/plans', text: 'View Pricing' },
  },
};

export default function AdminLandingPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('hero');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, unknown>>>({});

  // Fetch all sections
  const { data: sections = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'landing-page'],
    queryFn: () => api.get<LandingSection[]>('/api/admin/landing-page'),
  });

  // Create section mutation
  const createMutation = useMutation({
    mutationFn: (data: { key: string; content: unknown; isActive?: boolean }) =>
      api.post('/api/admin/landing-page', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-page'] });
    },
  });

  // Update section mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; content?: unknown; isActive?: boolean }) =>
      api.patch(`/api/admin/landing-page/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-page'] });
      setPendingChanges({});
    },
  });

  // Delete section mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/landing-page/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-page'] });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/admin/landing-page/${id}/toggle-active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-page'] });
    },
  });

  // Get section by key
  const getSectionByKey = (key: string): LandingSection | undefined => {
    return sections.find((s) => s.key === key);
  };

  // Get content for a section (from DB or pending changes or default)
  const getContentForSection = (key: string): Record<string, unknown> => {
    if (pendingChanges[key]) {
      return pendingChanges[key];
    }
    const section = getSectionByKey(key);
    if (section) {
      return section.content;
    }
    return defaultContent[key] || {};
  };

  // Handle content change - accepts any content type and stores as Record
  const handleContentChange = (key: string, content: unknown) => {
    setPendingChanges((prev) => ({ ...prev, [key]: content as Record<string, unknown> }));
  };

  // Handle save for a section
  const handleSave = async (key: string) => {
    const content = pendingChanges[key];
    if (!content) return;

    const existingSection = getSectionByKey(key);
    if (existingSection) {
      await updateMutation.mutateAsync({ id: existingSection.id, content });
    } else {
      await createMutation.mutateAsync({ key, content, isActive: true });
    }
    setPendingChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[key];
      return newChanges;
    });
  };

  // Handle reset for a section
  const handleReset = (key: string) => {
    if (!confirm('Are you sure you want to reset to default content? This will discard any unsaved changes.')) {
      return;
    }
    setPendingChanges((prev) => ({ ...prev, [key]: defaultContent[key] || {} }));
  };

  // Handle create custom section
  const handleCreateCustomSection = async (key: string, content: unknown, templateId?: string) => {
    await createMutation.mutateAsync({ key, content, isActive: true });
  };

  // Handle update custom section
  const handleUpdateCustomSection = async (id: string, content: unknown, isActive?: boolean) => {
    await updateMutation.mutateAsync({ id, content, isActive });
  };

  // Handle delete custom section
  const handleDeleteCustomSection = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  // Handle toggle active for custom section
  const handleToggleActive = async (id: string, isActive: boolean) => {
    await toggleActiveMutation.mutateAsync({ id, isActive });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Landing Page</h2>
          <p className="text-gray-600 mt-1">Manage landing page content and sections</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview Site
            </a>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Loading landing page content...</p>
          </div>
        </div>
      ) : (
        /* Tabs */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-4">
              <TabsList className="h-14 bg-transparent gap-2">
                <TabsTrigger value="hero" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2">
                  <Sparkles className="w-4 h-4" />
                  Hero
                </TabsTrigger>
                <TabsTrigger value="features" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Features
                </TabsTrigger>
                <TabsTrigger value="how-it-works" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2">
                  <ListOrdered className="w-4 h-4" />
                  How It Works
                </TabsTrigger>
                <TabsTrigger value="social-proof" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Social Proof
                </TabsTrigger>
                <TabsTrigger value="cta" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2">
                  <Megaphone className="w-4 h-4" />
                  CTA
                </TabsTrigger>
                <TabsTrigger value="custom" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Custom Sections
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="hero" className="mt-0">
                <HeroEditor
                  content={getContentForSection('hero')}
                  onChange={(content) => handleContentChange('hero', content)}
                  onSave={() => handleSave('hero')}
                  onReset={() => handleReset('hero')}
                  isSaving={isSaving}
                  lastUpdated={getSectionByKey('hero')?.updatedAt}
                />
              </TabsContent>

              <TabsContent value="features" className="mt-0">
                <FeaturesEditor
                  content={getContentForSection('features')}
                  onChange={(content) => handleContentChange('features', content)}
                  onSave={() => handleSave('features')}
                  onReset={() => handleReset('features')}
                  isSaving={isSaving}
                  lastUpdated={getSectionByKey('features')?.updatedAt}
                />
              </TabsContent>

              <TabsContent value="how-it-works" className="mt-0">
                <HowItWorksEditor
                  content={getContentForSection('how-it-works')}
                  onChange={(content) => handleContentChange('how-it-works', content)}
                  onSave={() => handleSave('how-it-works')}
                  onReset={() => handleReset('how-it-works')}
                  isSaving={isSaving}
                  lastUpdated={getSectionByKey('how-it-works')?.updatedAt}
                />
              </TabsContent>

              <TabsContent value="social-proof" className="mt-0">
                <SocialProofEditor
                  content={getContentForSection('social-proof')}
                  onChange={(content) => handleContentChange('social-proof', content)}
                  onSave={() => handleSave('social-proof')}
                  onReset={() => handleReset('social-proof')}
                  isSaving={isSaving}
                  lastUpdated={getSectionByKey('social-proof')?.updatedAt}
                />
              </TabsContent>

              <TabsContent value="cta" className="mt-0">
                <CTAEditor
                  content={getContentForSection('cta')}
                  onChange={(content) => handleContentChange('cta', content)}
                  onSave={() => handleSave('cta')}
                  onReset={() => handleReset('cta')}
                  isSaving={isSaving}
                  lastUpdated={getSectionByKey('cta')?.updatedAt}
                />
              </TabsContent>

              <TabsContent value="custom" className="mt-0">
                <CustomSectionsEditor
                  sections={sections}
                  onCreateSection={handleCreateCustomSection}
                  onUpdateSection={handleUpdateCustomSection}
                  onDeleteSection={handleDeleteCustomSection}
                  onToggleActive={handleToggleActive}
                  isLoading={isLoading}
                  isSaving={isSaving}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
