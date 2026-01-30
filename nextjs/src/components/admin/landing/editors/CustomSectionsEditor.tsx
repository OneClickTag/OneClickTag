'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { SortableItemCard } from '../SortableItemCard';
import {
  Plus,
  Loader2,
  FileText,
  LayoutGrid,
  BarChart3,
  MessageSquare,
  HelpCircle,
  Code,
  Trash2,
  Edit,
  Eye,
  EyeOff,
} from 'lucide-react';

// Section templates
const sectionTemplates = [
  {
    id: 'text-block',
    name: 'Text Block',
    icon: FileText,
    description: 'Simple text section with headline, subtitle, and body text',
    defaultContent: {
      title: 'Section Title',
      subtitle: 'Section subtitle text',
      body: 'Add your content here...',
      cta: { text: 'Learn More', url: '/learn-more' },
    },
  },
  {
    id: 'feature-grid',
    name: 'Feature Grid',
    icon: LayoutGrid,
    description: 'Grid of feature cards with icons',
    defaultContent: {
      title: 'Features',
      subtitle: 'What makes us different',
      features: [
        { icon: 'Zap', title: 'Fast', description: 'Lightning quick setup' },
        { icon: 'Shield', title: 'Secure', description: 'Enterprise-grade security' },
        { icon: 'Star', title: 'Simple', description: 'Easy to use interface' },
      ],
    },
  },
  {
    id: 'stats-row',
    name: 'Stats Row',
    icon: BarChart3,
    description: 'Row of statistics with numbers',
    defaultContent: {
      stats: [
        { value: '100+', label: 'Customers' },
        { value: '50K+', label: 'Tags Created' },
        { value: '99.9%', label: 'Uptime' },
        { value: '24/7', label: 'Support' },
      ],
    },
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    icon: MessageSquare,
    description: 'Customer testimonials section',
    defaultContent: {
      title: 'What Our Customers Say',
      testimonials: [
        {
          quote: 'Amazing product!',
          author: 'John Doe',
          role: 'CEO',
          company: 'Acme Inc',
        },
      ],
    },
  },
  {
    id: 'faq',
    name: 'FAQ Accordion',
    icon: HelpCircle,
    description: 'Frequently asked questions',
    defaultContent: {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'How does it work?', answer: 'Explain how it works...' },
        { question: 'What is the pricing?', answer: 'Describe your pricing...' },
        { question: 'Can I cancel anytime?', answer: 'Yes, you can cancel...' },
      ],
    },
  },
  {
    id: 'freeform',
    name: 'Free-form JSON',
    icon: Code,
    description: 'Advanced: Custom JSON structure',
    defaultContent: {},
  },
];

interface CustomSection {
  id: string;
  key: string;
  content: Record<string, unknown>;
  isActive: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomSectionsEditorProps {
  sections: CustomSection[];
  onCreateSection: (key: string, content: unknown, templateId?: string) => Promise<void>;
  onUpdateSection: (id: string, content: unknown, isActive?: boolean) => Promise<void>;
  onDeleteSection: (id: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
}

export function CustomSectionsEditor({
  sections,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onToggleActive,
  isLoading = false,
  isSaving = false,
}: CustomSectionsEditorProps) {
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);
  const [newSectionKey, setNewSectionKey] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('{}');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleCreateSection = async () => {
    if (!newSectionKey.trim()) return;

    const template = sectionTemplates.find((t) => t.id === selectedTemplate);
    const content = template?.defaultContent || JSON.parse(newSectionContent || '{}');

    await onCreateSection(
      newSectionKey.toLowerCase().replace(/\s+/g, '-'),
      content,
      selectedTemplate || undefined
    );

    setShowTemplateDialog(false);
    setNewSectionKey('');
    setNewSectionContent('{}');
    setSelectedTemplate(null);
  };

  const handleEditSection = (section: CustomSection) => {
    setEditingSection(section);
    setNewSectionContent(JSON.stringify(section.content, null, 2));
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSection) return;

    try {
      const content = JSON.parse(newSectionContent);
      await onUpdateSection(editingSection.id, content);
      setShowEditDialog(false);
      setEditingSection(null);
    } catch (error) {
      console.error('Invalid JSON:', error);
      alert('Invalid JSON format. Please check your content.');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      return;
    }
    await onDeleteSection(id);
  };

  // Filter out standard sections (hero, features, how-it-works, social-proof, cta)
  const standardKeys = ['hero', 'features', 'how-it-works', 'social-proof', 'cta'];
  const customSections = sections.filter((s) => !standardKeys.includes(s.key));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom Sections</h3>
          <p className="text-sm text-gray-500">
            Create and manage additional landing page sections
          </p>
        </div>
        <Button onClick={() => setShowTemplateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Section
        </Button>
      </div>

      {/* Custom Sections List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Your Custom Sections</CardTitle>
          <CardDescription>
            {customSections.length} custom section{customSections.length !== 1 ? 's' : ''} •{' '}
            {customSections.filter((s) => s.isActive).length} active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-500 mt-2">Loading sections...</p>
            </div>
          ) : customSections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No custom sections yet.</p>
              <p className="text-sm">{'Click "Add Custom Section" to create one.'}</p>
            </div>
          ) : (
            customSections.map((section) => {
              const template = sectionTemplates.find((t) => t.id === section.templateId);
              const TemplateIcon = template?.icon || Code;
              return (
                <div
                  key={section.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    section.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <TemplateIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">
                        {section.key}
                      </code>
                      {template && (
                        <span className="text-xs text-gray-500">{template.name}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated: {new Date(section.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleActive(section.id, !section.isActive)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                        section.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {section.isActive ? (
                        <>
                          <Eye className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </>
                      )}
                    </button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSection(section)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSection(section.id)}
                      className="hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Custom Section</DialogTitle>
            <DialogDescription>
              Choose a template to start with or create from scratch
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Section Key (URL-friendly)</Label>
              <Input
                value={newSectionKey}
                onChange={(e) => setNewSectionKey(e.target.value)}
                placeholder="my-custom-section"
              />
              <p className="text-xs text-gray-500">
                Use lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="space-y-2">
              <Label>Choose a Template</Label>
              <div className="grid grid-cols-2 gap-3">
                {sectionTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {template.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTemplate === 'freeform' && (
              <div className="space-y-2">
                <Label>Custom JSON Content</Label>
                <Textarea
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder='{"title": "My Section", "content": "..."}'
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSection}
              disabled={!newSectionKey.trim() || !selectedTemplate || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Section: {editingSection?.key}</DialogTitle>
            <DialogDescription>
              Modify the section content (JSON format)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Section Content (JSON)</Label>
              <Textarea
                value={newSectionContent}
                onChange={(e) => setNewSectionContent(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
