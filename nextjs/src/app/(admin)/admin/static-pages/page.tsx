'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Loader2,
  ExternalLink,
  Info,
  FileText,
  Shield,
} from 'lucide-react';
import { AboutPageEditor } from '@/components/admin/static-pages/editors/AboutPageEditor';
import { LegalPageEditor } from '@/components/admin/static-pages/editors/LegalPageEditor';

interface StaticPage {
  slug: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
  updatedAt: string | null;
}

const PAGE_CONFIG = {
  about: {
    icon: Info,
    label: 'About',
    description: 'Company information and mission',
    route: '/about',
  },
  terms: {
    icon: FileText,
    label: 'Terms',
    description: 'Terms of Service agreement',
    route: '/terms',
  },
  privacy: {
    icon: Shield,
    label: 'Privacy',
    description: 'Privacy Policy document',
    route: '/privacy',
  },
};

export default function AdminStaticPages() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'about' | 'terms' | 'privacy'>('about');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<StaticPage>>>({});

  const { data: pages = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'static-pages'],
    queryFn: () => api.get<StaticPage[]>('/api/admin/static-pages'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<StaticPage> & { slug: string }) =>
      api.put('/api/admin/static-pages', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'static-pages'] });
      // Clear pending changes for this slug
      setPendingChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[variables.slug];
        return newChanges;
      });
    },
  });

  const getPageBySlug = (slug: string): StaticPage | undefined => {
    return pages.find((p) => p.slug === slug);
  };

  const getCurrentValue = <K extends keyof StaticPage>(slug: string, field: K): StaticPage[K] => {
    const pending = pendingChanges[slug];
    if (pending && field in pending) {
      return pending[field] as StaticPage[K];
    }
    const page = getPageBySlug(slug);
    return page?.[field] ?? ('' as StaticPage[K]);
  };

  const handleFieldChange = (slug: string, field: keyof StaticPage, value: string | boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  };

  const handleSave = async (slug: string) => {
    const changes = pendingChanges[slug];
    if (!changes) return;
    await saveMutation.mutateAsync({ slug, ...changes });
  };

  const hasPendingChanges = (slug: string) => {
    return !!pendingChanges[slug] && Object.keys(pendingChanges[slug]).length > 0;
  };

  const isSaving = saveMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Static Pages</h2>
          <p className="text-gray-600 mt-1">Edit About, Terms, and Privacy pages</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href={PAGE_CONFIG[activeTab].route} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview Page
            </a>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Loading pages...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'about' | 'terms' | 'privacy')} className="w-full">
            <div className="border-b px-4">
              <TabsList className="h-14 bg-transparent gap-2">
                {(Object.keys(PAGE_CONFIG) as Array<keyof typeof PAGE_CONFIG>).map((slug) => {
                  const config = PAGE_CONFIG[slug];
                  const Icon = config.icon;
                  const page = getPageBySlug(slug);
                  return (
                    <TabsTrigger
                      key={slug}
                      value={slug}
                      className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                      {hasPendingChanges(slug) && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
                      {!page?.isPublished && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Draft</span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="about" className="mt-0">
                <AboutPageEditor
                  content={getCurrentValue('about', 'content') as string}
                  title={getCurrentValue('about', 'title') as string}
                  metaTitle={getCurrentValue('about', 'metaTitle') as string}
                  metaDescription={getCurrentValue('about', 'metaDescription') as string}
                  isPublished={getCurrentValue('about', 'isPublished') as boolean}
                  onContentChange={(value) => handleFieldChange('about', 'content', value)}
                  onTitleChange={(value) => handleFieldChange('about', 'title', value)}
                  onMetaTitleChange={(value) => handleFieldChange('about', 'metaTitle', value)}
                  onMetaDescriptionChange={(value) => handleFieldChange('about', 'metaDescription', value)}
                  onPublishedChange={(value) => handleFieldChange('about', 'isPublished', value)}
                  onSave={() => handleSave('about')}
                  isSaving={isSaving}
                  hasChanges={hasPendingChanges('about')}
                  lastUpdated={getPageBySlug('about')?.updatedAt}
                />
              </TabsContent>

              <TabsContent value="terms" className="mt-0">
                <LegalPageEditor
                  pageType="terms"
                  content={getCurrentValue('terms', 'content') as string}
                  title={getCurrentValue('terms', 'title') as string}
                  metaTitle={getCurrentValue('terms', 'metaTitle') as string}
                  metaDescription={getCurrentValue('terms', 'metaDescription') as string}
                  isPublished={getCurrentValue('terms', 'isPublished') as boolean}
                  onContentChange={(value) => handleFieldChange('terms', 'content', value)}
                  onTitleChange={(value) => handleFieldChange('terms', 'title', value)}
                  onMetaTitleChange={(value) => handleFieldChange('terms', 'metaTitle', value)}
                  onMetaDescriptionChange={(value) => handleFieldChange('terms', 'metaDescription', value)}
                  onPublishedChange={(value) => handleFieldChange('terms', 'isPublished', value)}
                  onSave={() => handleSave('terms')}
                  isSaving={isSaving}
                  hasChanges={hasPendingChanges('terms')}
                  lastUpdated={getPageBySlug('terms')?.updatedAt}
                />
              </TabsContent>

              <TabsContent value="privacy" className="mt-0">
                <LegalPageEditor
                  pageType="privacy"
                  content={getCurrentValue('privacy', 'content') as string}
                  title={getCurrentValue('privacy', 'title') as string}
                  metaTitle={getCurrentValue('privacy', 'metaTitle') as string}
                  metaDescription={getCurrentValue('privacy', 'metaDescription') as string}
                  isPublished={getCurrentValue('privacy', 'isPublished') as boolean}
                  onContentChange={(value) => handleFieldChange('privacy', 'content', value)}
                  onTitleChange={(value) => handleFieldChange('privacy', 'title', value)}
                  onMetaTitleChange={(value) => handleFieldChange('privacy', 'metaTitle', value)}
                  onMetaDescriptionChange={(value) => handleFieldChange('privacy', 'metaDescription', value)}
                  onPublishedChange={(value) => handleFieldChange('privacy', 'isPublished', value)}
                  onSave={() => handleSave('privacy')}
                  isSaving={isSaving}
                  hasChanges={hasPendingChanges('privacy')}
                  lastUpdated={getPageBySlug('privacy')?.updatedAt}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
