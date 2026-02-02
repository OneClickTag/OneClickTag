'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Save,
  Loader2,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  FileText,
  Info,
  Shield,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StaticPage {
  slug: string;
  title: string;
  content: Record<string, unknown>;
  isActive: boolean;
  updatedAt: string | null;
  hasCustomContent?: boolean;
}

interface TermsSection {
  title: string;
  content: string;
  list?: string[];
  contact?: {
    name: string;
    email: string;
    address: string;
  };
}

interface AboutFeature {
  icon: string;
  title: string;
  description: string;
}

interface AboutValue {
  title: string;
  description: string;
}

export default function AdminStaticPages() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('about');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, unknown>>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const { data: pages = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'static-pages'],
    queryFn: () => api.get<StaticPage[]>('/api/admin/static-pages'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { slug: string; content: Record<string, unknown> }) =>
      api.put('/api/admin/static-pages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'static-pages'] });
      setPendingChanges({});
    },
  });

  const resetMutation = useMutation({
    mutationFn: (slug: string) =>
      api.post('/api/admin/static-pages', { slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'static-pages'] });
      setPendingChanges({});
    },
  });

  const getPageBySlug = (slug: string): StaticPage | undefined => {
    return pages.find((p) => p.slug === slug);
  };

  const getContentForPage = (slug: string): Record<string, unknown> => {
    if (pendingChanges[slug]) {
      return pendingChanges[slug];
    }
    const page = getPageBySlug(slug);
    return (page?.content as Record<string, unknown>) || {};
  };

  const handleContentChange = (slug: string, content: Record<string, unknown>) => {
    setPendingChanges((prev) => ({ ...prev, [slug]: content }));
  };

  const handleSave = async (slug: string) => {
    const content = pendingChanges[slug];
    if (!content) return;
    await saveMutation.mutateAsync({ slug, content });
  };

  const handleReset = async (slug: string) => {
    if (!confirm('Are you sure you want to reset this page to default content? This cannot be undone.')) {
      return;
    }
    await resetMutation.mutateAsync(slug);
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasPendingChanges = (slug: string) => !!pendingChanges[slug];

  const isSaving = saveMutation.isPending || resetMutation.isPending;

  // About Page Editor
  const renderAboutEditor = () => {
    const content = getContentForPage('about');
    const hero = (content.hero as Record<string, string>) || {};
    const mission = (content.mission as Record<string, string>) || {};
    const features = (content.features as AboutFeature[]) || [];
    const values = (content.values as AboutValue[]) || [];
    const story = (content.story as { title: string; paragraphs: string[] }) || { title: '', paragraphs: [] };
    const cta = (content.cta as Record<string, unknown>) || {};

    const updateContent = (updates: Partial<Record<string, unknown>>) => {
      handleContentChange('about', { ...content, ...updates });
    };

    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('about-hero')}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Hero Section</CardTitle>
                <CardDescription>Main banner content at the top of the page</CardDescription>
              </div>
              {expandedSections['about-hero'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections['about-hero'] && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Badge Text</Label>
                  <Input
                    value={hero.badge || ''}
                    onChange={(e) => updateContent({ hero: { ...hero, badge: e.target.value } })}
                    placeholder="About OneClickTag"
                  />
                </div>
                <div>
                  <Label>Headline</Label>
                  <Input
                    value={hero.headline || ''}
                    onChange={(e) => updateContent({ hero: { ...hero, headline: e.target.value } })}
                    placeholder="Simplifying"
                  />
                </div>
              </div>
              <div>
                <Label>Headline Highlight (colored text)</Label>
                <Input
                  value={hero.headlineHighlight || ''}
                  onChange={(e) => updateContent({ hero: { ...hero, headlineHighlight: e.target.value } })}
                  placeholder="Conversion Tracking"
                />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Textarea
                  value={hero.subtitle || ''}
                  onChange={(e) => updateContent({ hero: { ...hero, subtitle: e.target.value } })}
                  placeholder="We're on a mission..."
                  rows={3}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Mission Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('about-mission')}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Mission Statement</CardTitle>
                <CardDescription>Your company mission</CardDescription>
              </div>
              {expandedSections['about-mission'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections['about-mission'] && (
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={mission.title || ''}
                  onChange={(e) => updateContent({ mission: { ...mission, title: e.target.value } })}
                  placeholder="Our Mission"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={mission.description || ''}
                  onChange={(e) => updateContent({ mission: { ...mission, description: e.target.value } })}
                  rows={4}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Features Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('about-features')}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Features</CardTitle>
                <CardDescription>Key features and benefits</CardDescription>
              </div>
              {expandedSections['about-features'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections['about-features'] && (
            <CardContent className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Feature {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newFeatures = features.filter((_, i) => i !== index);
                        updateContent({ features: newFeatures });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Icon (Lucide name)</Label>
                      <Input
                        value={feature.icon}
                        onChange={(e) => {
                          const newFeatures = [...features];
                          newFeatures[index] = { ...feature, icon: e.target.value };
                          updateContent({ features: newFeatures });
                        }}
                        placeholder="Zap, Target, Users, etc."
                      />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={feature.title}
                        onChange={(e) => {
                          const newFeatures = [...features];
                          newFeatures[index] = { ...feature, title: e.target.value };
                          updateContent({ features: newFeatures });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={feature.description}
                      onChange={(e) => {
                        const newFeatures = [...features];
                        newFeatures[index] = { ...feature, description: e.target.value };
                        updateContent({ features: newFeatures });
                      }}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  updateContent({
                    features: [...features, { icon: 'Star', title: 'New Feature', description: '' }],
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Feature
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Values Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('about-values')}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Values</CardTitle>
                <CardDescription>Company values</CardDescription>
              </div>
              {expandedSections['about-values'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections['about-values'] && (
            <CardContent className="space-y-4">
              {values.map((value, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Value {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newValues = values.filter((_, i) => i !== index);
                        updateContent({ values: newValues });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={value.title}
                        onChange={(e) => {
                          const newValues = [...values];
                          newValues[index] = { ...value, title: e.target.value };
                          updateContent({ values: newValues });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={value.description}
                        onChange={(e) => {
                          const newValues = [...values];
                          newValues[index] = { ...value, description: e.target.value };
                          updateContent({ values: newValues });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  updateContent({
                    values: [...values, { title: 'New Value', description: '' }],
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Value
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Story Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('about-story')}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Our Story</CardTitle>
                <CardDescription>Company history and background</CardDescription>
              </div>
              {expandedSections['about-story'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections['about-story'] && (
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={story.title || ''}
                  onChange={(e) => updateContent({ story: { ...story, title: e.target.value } })}
                  placeholder="Our Story"
                />
              </div>
              <div>
                <Label>Story Paragraphs</Label>
                {story.paragraphs?.map((paragraph, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Textarea
                      value={paragraph}
                      onChange={(e) => {
                        const newParagraphs = [...story.paragraphs];
                        newParagraphs[index] = e.target.value;
                        updateContent({ story: { ...story, paragraphs: newParagraphs } });
                      }}
                      rows={3}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newParagraphs = story.paragraphs.filter((_, i) => i !== index);
                        updateContent({ story: { ...story, paragraphs: newParagraphs } });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    updateContent({
                      story: { ...story, paragraphs: [...(story.paragraphs || []), ''] },
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Paragraph
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* CTA Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('about-cta')}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Call to Action</CardTitle>
                <CardDescription>Bottom section with buttons</CardDescription>
              </div>
              {expandedSections['about-cta'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections['about-cta'] && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Headline</Label>
                  <Input
                    value={(cta.headline as string) || ''}
                    onChange={(e) => updateContent({ cta: { ...cta, headline: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Input
                    value={(cta.subtitle as string) || ''}
                    onChange={(e) => updateContent({ cta: { ...cta, subtitle: e.target.value } })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Button</Label>
                  <Input
                    value={(cta.primaryButton as { text: string; url: string })?.text || ''}
                    onChange={(e) =>
                      updateContent({
                        cta: {
                          ...cta,
                          primaryButton: { ...(cta.primaryButton as object), text: e.target.value },
                        },
                      })
                    }
                    placeholder="Button text"
                  />
                  <Input
                    value={(cta.primaryButton as { text: string; url: string })?.url || ''}
                    onChange={(e) =>
                      updateContent({
                        cta: {
                          ...cta,
                          primaryButton: { ...(cta.primaryButton as object), url: e.target.value },
                        },
                      })
                    }
                    placeholder="Button URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Button</Label>
                  <Input
                    value={(cta.secondaryButton as { text: string; url: string })?.text || ''}
                    onChange={(e) =>
                      updateContent({
                        cta: {
                          ...cta,
                          secondaryButton: { ...(cta.secondaryButton as object), text: e.target.value },
                        },
                      })
                    }
                    placeholder="Button text"
                  />
                  <Input
                    value={(cta.secondaryButton as { text: string; url: string })?.url || ''}
                    onChange={(e) =>
                      updateContent({
                        cta: {
                          ...cta,
                          secondaryButton: { ...(cta.secondaryButton as object), url: e.target.value },
                        },
                      })
                    }
                    placeholder="Button URL"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleReset('about')}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button
            onClick={() => handleSave('about')}
            disabled={!hasPendingChanges('about') || isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    );
  };

  // Terms Page Editor
  const renderTermsEditor = () => {
    const content = getContentForPage('terms');
    const lastUpdated = (content.lastUpdated as string) || '';
    const sections = (content.sections as TermsSection[]) || [];

    const updateContent = (updates: Partial<Record<string, unknown>>) => {
      handleContentChange('terms', { ...content, ...updates });
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms of Service</CardTitle>
            <CardDescription>Legal terms and conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Last Updated Date</Label>
              <Input
                value={lastUpdated}
                onChange={(e) => updateContent({ lastUpdated: e.target.value })}
                placeholder="January 1, 2025"
              />
            </div>

            <div className="space-y-4">
              <Label>Sections</Label>
              {sections.map((section, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{section.title || `Section ${index + 1}`}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newSections = sections.filter((_, i) => i !== index);
                        updateContent({ sections: newSections });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[index] = { ...section, title: e.target.value };
                        updateContent({ sections: newSections });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={section.content}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[index] = { ...section, content: e.target.value };
                        updateContent({ sections: newSections });
                      }}
                      rows={4}
                    />
                  </div>
                  {section.list && (
                    <div>
                      <Label>List Items</Label>
                      {section.list.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex gap-2 mt-2">
                          <Input
                            value={item}
                            onChange={(e) => {
                              const newSections = [...sections];
                              const newList = [...section.list!];
                              newList[itemIndex] = e.target.value;
                              newSections[index] = { ...section, list: newList };
                              updateContent({ sections: newSections });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSections = [...sections];
                              const newList = section.list!.filter((_, i) => i !== itemIndex);
                              newSections[index] = { ...section, list: newList };
                              updateContent({ sections: newSections });
                            }}
                            className="text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const newSections = [...sections];
                          newSections[index] = { ...section, list: [...(section.list || []), ''] };
                          updateContent({ sections: newSections });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add List Item
                      </Button>
                    </div>
                  )}
                  {!section.list && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newSections = [...sections];
                        newSections[index] = { ...section, list: [''] };
                        updateContent({ sections: newSections });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add List
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  updateContent({
                    sections: [...sections, { title: '', content: '' }],
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleReset('terms')} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={() => handleSave('terms')} disabled={!hasPendingChanges('terms') || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    );
  };

  // Privacy Page Editor
  const renderPrivacyEditor = () => {
    const content = getContentForPage('privacy');
    const lastUpdated = (content.lastUpdated as string) || '';
    const sections = (content.sections as TermsSection[]) || [];

    const updateContent = (updates: Partial<Record<string, unknown>>) => {
      handleContentChange('privacy', { ...content, ...updates });
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Privacy Policy</CardTitle>
            <CardDescription>Data privacy and protection policy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Last Updated Date</Label>
              <Input
                value={lastUpdated}
                onChange={(e) => updateContent({ lastUpdated: e.target.value })}
                placeholder="January 1, 2025"
              />
            </div>

            <div className="space-y-4">
              <Label>Sections</Label>
              {sections.map((section, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{section.title || `Section ${index + 1}`}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newSections = sections.filter((_, i) => i !== index);
                        updateContent({ sections: newSections });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[index] = { ...section, title: e.target.value };
                        updateContent({ sections: newSections });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={section.content}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[index] = { ...section, content: e.target.value };
                        updateContent({ sections: newSections });
                      }}
                      rows={4}
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  updateContent({
                    sections: [...sections, { title: '', content: '' }],
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleReset('privacy')} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={() => handleSave('privacy')} disabled={!hasPendingChanges('privacy') || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    );
  };

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
            <a href={`/${activeTab}`} target="_blank" rel="noopener noreferrer">
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-4">
              <TabsList className="h-14 bg-transparent gap-2">
                <TabsTrigger
                  value="about"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2"
                >
                  <Info className="w-4 h-4" />
                  About
                  {hasPendingChanges('about') && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
                </TabsTrigger>
                <TabsTrigger
                  value="terms"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Terms
                  {hasPendingChanges('terms') && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
                </TabsTrigger>
                <TabsTrigger
                  value="privacy"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Privacy
                  {hasPendingChanges('privacy') && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="about" className="mt-0">
                {renderAboutEditor()}
              </TabsContent>
              <TabsContent value="terms" className="mt-0">
                {renderTermsEditor()}
              </TabsContent>
              <TabsContent value="privacy" className="mt-0">
                {renderPrivacyEditor()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
