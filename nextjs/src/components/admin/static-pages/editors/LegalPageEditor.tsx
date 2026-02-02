'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Loader2, Save, Eye, EyeOff, FileText, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LegalSection {
  id: string;
  title: string;
  content: string;
}

interface LegalContent {
  effectiveDate?: string;
  lastUpdated?: string;
  introduction?: string;
  sections?: LegalSection[];
  contactInfo?: string;
}

interface LegalPageEditorProps {
  pageType: 'terms' | 'privacy';
  content: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onMetaTitleChange: (metaTitle: string) => void;
  onMetaDescriptionChange: (metaDescription: string) => void;
  onPublishedChange: (isPublished: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  lastUpdated?: string | null;
}

const defaultSections: Record<string, LegalSection[]> = {
  terms: [
    { id: '1', title: 'Acceptance of Terms', content: 'By accessing or using our service, you agree to be bound by these Terms of Service.' },
    { id: '2', title: 'Use of Service', content: 'You may use our service only for lawful purposes and in accordance with these Terms.' },
    { id: '3', title: 'User Accounts', content: 'You are responsible for safeguarding your account and for any activities under your account.' },
    { id: '4', title: 'Intellectual Property', content: 'The service and its original content are and will remain the exclusive property of the company.' },
    { id: '5', title: 'Termination', content: 'We may terminate or suspend your account immediately for any breach of these Terms.' },
    { id: '6', title: 'Limitation of Liability', content: 'In no event shall the company be liable for any indirect, incidental, special, or consequential damages.' },
  ],
  privacy: [
    { id: '1', title: 'Information We Collect', content: 'We collect information you provide directly to us, such as when you create an account.' },
    { id: '2', title: 'How We Use Information', content: 'We use the information we collect to provide, maintain, and improve our services.' },
    { id: '3', title: 'Information Sharing', content: 'We do not share your personal information with third parties except as described in this policy.' },
    { id: '4', title: 'Data Security', content: 'We take reasonable measures to help protect your personal information from loss, theft, and misuse.' },
    { id: '5', title: 'Your Rights', content: 'You have the right to access, update, or delete your personal information at any time.' },
    { id: '6', title: 'Contact Us', content: 'If you have any questions about this Privacy Policy, please contact us.' },
  ],
};

function parseLegalContent(content: string, pageType: 'terms' | 'privacy'): LegalContent {
  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    // If not JSON, treat as legacy markdown content
    if (content && content.trim()) {
      return {
        sections: [{ id: '1', title: 'Content', content }],
      };
    }
    return {
      sections: defaultSections[pageType],
    };
  }
}

function serializeLegalContent(content: LegalContent): string {
  return JSON.stringify(content, null, 2);
}

function generateMarkdownPreview(content: LegalContent): string {
  let markdown = '';

  if (content.effectiveDate) {
    markdown += `**Effective Date:** ${content.effectiveDate}\n\n`;
  }

  if (content.introduction) {
    markdown += `${content.introduction}\n\n`;
  }

  (content.sections || []).forEach((section, index) => {
    markdown += `## ${index + 1}. ${section.title}\n\n${section.content}\n\n`;
  });

  if (content.contactInfo) {
    markdown += `---\n\n${content.contactInfo}`;
  }

  return markdown;
}

export function LegalPageEditor({
  pageType,
  content,
  title,
  metaTitle,
  metaDescription,
  isPublished,
  onContentChange,
  onTitleChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onPublishedChange,
  onSave,
  isSaving,
  hasChanges,
  lastUpdated,
}: LegalPageEditorProps) {
  const [localContent, setLocalContent] = useState<LegalContent>(() => parseLegalContent(content, pageType));
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const isInternalChange = useRef(false);

  const pageConfig = {
    terms: {
      title: 'Terms of Service',
      icon: FileText,
      description: 'Legal terms governing use of your service',
      route: '/terms',
    },
    privacy: {
      title: 'Privacy Policy',
      icon: FileText,
      description: 'How you collect, use, and protect user data',
      route: '/privacy',
    },
  };

  const config = pageConfig[pageType];

  useEffect(() => {
    if (!isInternalChange.current) {
      setLocalContent(parseLegalContent(content, pageType));
    }
    isInternalChange.current = false;
  }, [content, pageType]);

  const updateContent = (updates: Partial<LegalContent>) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    isInternalChange.current = true;
    onContentChange(serializeLegalContent(newContent));
  };

  const addSection = () => {
    const sections = [...(localContent.sections || []), {
      id: Date.now().toString(),
      title: 'New Section',
      content: 'Add your content here...'
    }];
    updateContent({ sections });
    setExpandedSection(sections[sections.length - 1].id);
  };

  const updateSection = (index: number, updates: Partial<LegalSection>) => {
    const sections = [...(localContent.sections || [])];
    sections[index] = { ...sections[index], ...updates };
    updateContent({ sections });
  };

  const removeSection = (index: number) => {
    if (!confirm('Are you sure you want to remove this section?')) return;
    const sections = (localContent.sections || []).filter((_, i) => i !== index);
    updateContent({ sections });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(localContent.sections || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    updateContent({ sections });
  };

  const loadDefaultSections = () => {
    if (!confirm('This will replace all current sections with default templates. Continue?')) return;
    updateContent({ sections: defaultSections[pageType] });
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${isPublished ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPublished ? (
              <>
                <Eye className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Published</span>
                <span className="text-green-600">- Visible at {config.route}</span>
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">Draft</span>
                <span className="text-amber-600">- Not visible to visitors</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={isPublished}
                onCheckedChange={onPublishedChange}
              />
              <Label className="text-sm">{isPublished ? 'Published' : 'Draft'}</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Page Title */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <config.icon className="w-4 h-4" />
            Page Title
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={config.title}
          />
        </CardContent>
      </Card>

      {/* Document Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Document Information</CardTitle>
          <CardDescription>Dates and introductory text</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={localContent.effectiveDate || ''}
                onChange={(e) => updateContent({ effectiveDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Updated</Label>
              <Input
                type="date"
                value={localContent.lastUpdated || ''}
                onChange={(e) => updateContent({ lastUpdated: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Introduction</Label>
            <Textarea
              value={localContent.introduction || ''}
              onChange={(e) => updateContent({ introduction: e.target.value })}
              placeholder="Brief introduction to this document..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sections Editor/Preview */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'preview')}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="editor">Edit Sections</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          {activeTab === 'editor' && (
            <Button variant="outline" size="sm" onClick={loadDefaultSections}>
              Load Default Template
            </Button>
          )}
        </div>

        <TabsContent value="editor" className="mt-0">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Document Sections</CardTitle>
              <CardDescription>Add, edit, and reorder sections of your {pageType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(localContent.sections || []).map((section, index) => (
                <div key={section.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center gap-2 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  >
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                        disabled={index === (localContent.sections?.length || 0) - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm flex-1">
                      {index + 1}. {section.title || 'Untitled Section'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); removeSection(index); }}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  {expandedSection === section.id && (
                    <div className="p-4 space-y-3 border-t">
                      <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(index, { title: e.target.value })}
                          placeholder="Section title..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content (Markdown supported)</Label>
                        <Textarea
                          value={section.content}
                          onChange={(e) => updateSection(index, { content: e.target.value })}
                          placeholder="Section content..."
                          rows={6}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addSection} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Document Preview</CardTitle>
              <CardDescription>How your {pageType === 'terms' ? 'Terms of Service' : 'Privacy Policy'} will appear</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none p-6 bg-gray-50 rounded-lg min-h-[400px]">
                <h1>{title || config.title}</h1>
                <ReactMarkdown>{generateMarkdownPreview(localContent)}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Contact Information</CardTitle>
          <CardDescription>How users can reach you with questions about this document</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={localContent.contactInfo || ''}
            onChange={(e) => updateContent({ contactInfo: e.target.value })}
            placeholder="For questions about this policy, please contact us at support@example.com"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">SEO Settings</CardTitle>
          <CardDescription>Search engine optimization metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input
              value={metaTitle}
              onChange={(e) => onMetaTitleChange(e.target.value)}
              placeholder={`${config.title} | OneClickTag`}
            />
            <p className="text-xs text-gray-500">{metaTitle.length}/60 characters recommended</p>
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea
              value={metaDescription}
              onChange={(e) => onMetaDescriptionChange(e.target.value)}
              placeholder={`Read our ${config.title.toLowerCase()} to understand...`}
              rows={2}
            />
            <p className="text-xs text-gray-500">{metaDescription.length}/160 characters recommended</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-0 bg-white py-4 border-t -mx-6 px-6 -mb-6">
        <Button
          onClick={onSave}
          disabled={!hasChanges || isSaving}
          size="lg"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
