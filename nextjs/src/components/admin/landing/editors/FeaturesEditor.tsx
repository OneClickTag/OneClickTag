'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IconPicker, getIconByName } from '../IconPicker';
import { ColorPicker, getGradientStyle } from '../ColorPicker';
import { SortableItemCard } from '../SortableItemCard';
import { Plus, Loader2, Save, RotateCcw } from 'lucide-react';

interface FeatureItem {
  id?: string;
  icon?: string;
  color?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

interface BottomCTA {
  text?: string;
  linkText?: string;
  linkUrl?: string;
}

interface FeaturesContent {
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  features?: FeatureItem[];
  bottomCTA?: BottomCTA;
}

interface FeaturesEditorProps {
  content: FeaturesContent;
  onChange: (content: FeaturesContent) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  lastUpdated?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export function FeaturesEditor({
  content,
  onChange,
  onSave,
  onReset,
  isSaving = false,
  lastUpdated,
}: FeaturesEditorProps) {
  const [localContent, setLocalContent] = useState<FeaturesContent>(content);
  const [hasChanges, setHasChanges] = useState(false);
  const [showBottomCTA, setShowBottomCTA] = useState(!!content.bottomCTA?.text);
  const isInternalChange = useRef(false);

  useEffect(() => {
    // Only reset state if this is an external change (from server/reset)
    if (!isInternalChange.current) {
      setLocalContent(content);
      setShowBottomCTA(!!content.bottomCTA?.text);
      setHasChanges(false);
    }
    isInternalChange.current = false;
  }, [content]);

  const updateContent = (updates: Partial<FeaturesContent>) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    isInternalChange.current = true;
    onChange(newContent);
    setHasChanges(true);
  };

  const updateFeature = (index: number, updates: Partial<FeatureItem>) => {
    const features = [...(localContent.features || [])];
    features[index] = { ...features[index], ...updates };
    updateContent({ features });
  };

  const addFeature = () => {
    const features = [
      ...(localContent.features || []),
      {
        id: generateId(),
        icon: 'Zap',
        color: 'from-blue-500 to-blue-600',
        title: 'New Feature',
        description: 'Describe this feature...',
        isActive: true,
        order: (localContent.features?.length || 0) + 1,
      },
    ];
    updateContent({ features });
  };

  const removeFeature = (index: number) => {
    const features = (localContent.features || []).filter((_, i) => i !== index);
    updateContent({ features });
  };

  const duplicateFeature = (index: number) => {
    const features = [...(localContent.features || [])];
    const original = features[index];
    features.splice(index + 1, 0, {
      ...original,
      id: generateId(),
      title: `${original.title} (Copy)`,
    });
    updateContent({ features });
  };

  const moveFeature = (index: number, direction: 'up' | 'down') => {
    const features = [...(localContent.features || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= features.length) return;
    [features[index], features[newIndex]] = [features[newIndex], features[index]];
    updateContent({ features });
  };

  const updateBottomCTA = (updates: Partial<BottomCTA>) => {
    updateContent({ bottomCTA: { ...localContent.bottomCTA, ...updates } });
  };

  return (
    <div className="space-y-6">
      {/* Header with Save/Reset */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Features Section</h3>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={onSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Section Header */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Section Header</CardTitle>
          <CardDescription>Title and subtitle for the features section</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={localContent.title || ''}
                onChange={(e) => updateContent({ title: e.target.value })}
                placeholder="GTM, Google Ads & GA4"
              />
            </div>
            <div className="space-y-2">
              <Label>Highlighted Text (gradient)</Label>
              <Input
                value={localContent.titleHighlight || ''}
                onChange={(e) => updateContent({ titleHighlight: e.target.value })}
                placeholder="All Automated"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Textarea
              value={localContent.subtitle || ''}
              onChange={(e) => updateContent({ subtitle: e.target.value })}
              placeholder="Describe the features..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Features</CardTitle>
              <CardDescription>
                {(localContent.features || []).length} features •{' '}
                {(localContent.features || []).filter((f) => f.isActive !== false).length} active
              </CardDescription>
            </div>
            <Button onClick={addFeature} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Feature
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(localContent.features || []).map((feature, index) => {
            const Icon = getIconByName(feature.icon || 'Zap');
            return (
              <SortableItemCard
                key={feature.id || index}
                title={feature.title || 'Untitled Feature'}
                subtitle={feature.description?.substring(0, 50) + '...'}
                isActive={feature.isActive !== false}
                onActiveChange={(active) => updateFeature(index, { isActive: active })}
                onDelete={() => removeFeature(index)}
                onDuplicate={() => duplicateFeature(index)}
                onMoveUp={() => moveFeature(index, 'up')}
                onMoveDown={() => moveFeature(index, 'down')}
                canMoveUp={index > 0}
                canMoveDown={index < (localContent.features?.length || 0) - 1}
                headerContent={
                  Icon && (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={getGradientStyle(feature.color)}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  )
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <IconPicker
                        value={feature.icon || 'Zap'}
                        onChange={(icon) => updateFeature(index, { icon })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <ColorPicker
                        value={feature.color || 'from-blue-500 to-blue-600'}
                        onChange={(color) => updateFeature(index, { color })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={feature.title || ''}
                      onChange={(e) => updateFeature(index, { title: e.target.value })}
                      placeholder="Feature title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={feature.description || ''}
                      onChange={(e) => updateFeature(index, { description: e.target.value })}
                      placeholder="Describe this feature..."
                      rows={2}
                    />
                  </div>
                </div>
              </SortableItemCard>
            );
          })}
          {(localContent.features || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No features yet. Click "Add Feature" to create one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Bottom CTA</CardTitle>
              <CardDescription>Optional call-to-action below features</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showBottomCTA}
                onCheckedChange={(checked) => {
                  setShowBottomCTA(checked);
                  if (!checked) {
                    updateContent({ bottomCTA: undefined });
                  } else {
                    updateContent({
                      bottomCTA: {
                        text: 'Ready to get started?',
                        linkText: 'Start Free Trial',
                        linkUrl: '/register',
                      },
                    });
                  }
                }}
              />
              <span className="text-xs text-gray-500">
                {showBottomCTA ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        {showBottomCTA && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Text</Label>
              <Input
                value={localContent.bottomCTA?.text || ''}
                onChange={(e) => updateBottomCTA({ text: e.target.value })}
                placeholder="Ready to get started?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link Text</Label>
                <Input
                  value={localContent.bottomCTA?.linkText || ''}
                  onChange={(e) => updateBottomCTA({ linkText: e.target.value })}
                  placeholder="Start Free Trial"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={localContent.bottomCTA?.linkUrl || ''}
                  onChange={(e) => updateBottomCTA({ linkUrl: e.target.value })}
                  placeholder="/register"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
