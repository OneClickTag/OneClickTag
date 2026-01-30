'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IconPicker } from '../IconPicker';
import { Plus, X, Loader2, Save, RotateCcw } from 'lucide-react';

interface CTAButton {
  url?: string;
  text?: string;
}

interface BadgeContent {
  icon?: string;
  text?: string;
}

interface CTAContent {
  badge?: BadgeContent;
  headline?: string;
  headlineSecondLine?: string;
  subtitle?: string;
  features?: string[];
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
  trustBadge?: string;
}

interface CTAEditorProps {
  content: CTAContent;
  onChange: (content: CTAContent) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  lastUpdated?: string;
}

export function CTAEditor({
  content,
  onChange,
  onSave,
  onReset,
  isSaving = false,
  lastUpdated,
}: CTAEditorProps) {
  const [localContent, setLocalContent] = useState<CTAContent>(content);
  const [hasChanges, setHasChanges] = useState(false);
  const [showBadge, setShowBadge] = useState(!!content.badge?.text);
  const [showSecondaryCTA, setShowSecondaryCTA] = useState(!!content.secondaryCTA?.text);
  const [showFeatures, setShowFeatures] = useState((content.features?.length || 0) > 0);
  const [showTrustBadge, setShowTrustBadge] = useState(!!content.trustBadge);
  const isInternalChange = useRef(false);

  useEffect(() => {
    // Only reset state if this is an external change (from server/reset)
    if (!isInternalChange.current) {
      setLocalContent(content);
      setShowBadge(!!content.badge?.text);
      setShowSecondaryCTA(!!content.secondaryCTA?.text);
      setShowFeatures((content.features?.length || 0) > 0);
      setShowTrustBadge(!!content.trustBadge);
      setHasChanges(false);
    }
    isInternalChange.current = false;
  }, [content]);

  const updateContent = (updates: Partial<CTAContent>) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    isInternalChange.current = true;
    onChange(newContent);
    setHasChanges(true);
  };

  const updateBadge = (updates: Partial<BadgeContent>) => {
    updateContent({ badge: { ...localContent.badge, ...updates } });
  };

  const updatePrimaryCTA = (updates: Partial<CTAButton>) => {
    updateContent({ primaryCTA: { ...localContent.primaryCTA, ...updates } });
  };

  const updateSecondaryCTA = (updates: Partial<CTAButton>) => {
    updateContent({ secondaryCTA: { ...localContent.secondaryCTA, ...updates } });
  };

  // Features management
  const addFeature = () => {
    const features = [...(localContent.features || []), 'New feature'];
    updateContent({ features });
  };

  const updateFeature = (index: number, value: string) => {
    const features = [...(localContent.features || [])];
    features[index] = value;
    updateContent({ features });
  };

  const removeFeature = (index: number) => {
    const features = (localContent.features || []).filter((_, i) => i !== index);
    updateContent({ features });
  };

  return (
    <div className="space-y-6">
      {/* Header with Save/Reset */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">CTA Section</h3>
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

      {/* Badge Section (Optional) */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Badge (Optional)</CardTitle>
              <CardDescription>Small badge shown above the headline</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showBadge}
                onCheckedChange={(checked) => {
                  setShowBadge(checked);
                  if (!checked) {
                    updateContent({ badge: undefined });
                  } else {
                    updateContent({ badge: { icon: 'Sparkles', text: 'Limited Time' } });
                  }
                }}
              />
              <span className="text-xs text-gray-500">
                {showBadge ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        {showBadge && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker
                  value={localContent.badge?.icon || 'Sparkles'}
                  onChange={(icon) => updateBadge({ icon })}
                />
              </div>
              <div className="space-y-2">
                <Label>Text</Label>
                <Input
                  value={localContent.badge?.text || ''}
                  onChange={(e) => updateBadge({ text: e.target.value })}
                  placeholder="Badge text..."
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Headlines Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Headlines</CardTitle>
          <CardDescription>Main headlines for the CTA section</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Line</Label>
              <Input
                value={localContent.headline || ''}
                onChange={(e) => updateContent({ headline: e.target.value })}
                placeholder="Start Tracking in 2 Minutes."
              />
            </div>
            <div className="space-y-2">
              <Label>Second Line</Label>
              <Input
                value={localContent.headlineSecondLine || ''}
                onChange={(e) => updateContent({ headlineSecondLine: e.target.value })}
                placeholder="Free for 14 Days."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Textarea
              value={localContent.subtitle || ''}
              onChange={(e) => updateContent({ subtitle: e.target.value })}
              placeholder="Additional context for your call to action..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Features List (Optional) */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Features List (Optional)</CardTitle>
              <CardDescription>Short bullet points shown with checkmarks</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showFeatures}
                onCheckedChange={(checked) => {
                  setShowFeatures(checked);
                  if (!checked) {
                    updateContent({ features: [] });
                  } else if ((localContent.features?.length || 0) === 0) {
                    updateContent({ features: ['No credit card required', 'Cancel anytime', '14-day free trial'] });
                  }
                }}
              />
              <span className="text-xs text-gray-500">
                {showFeatures ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        {showFeatures && (
          <CardContent className="space-y-3">
            {(localContent.features || []).map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-red-50"
                  onClick={() => removeFeature(index)}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFeature}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </CardContent>
        )}
      </Card>

      {/* CTA Buttons Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Call-to-Action Buttons</CardTitle>
          <CardDescription>Primary and secondary action buttons</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary CTA */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Primary Button</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Button Text</Label>
                <Input
                  value={localContent.primaryCTA?.text || ''}
                  onChange={(e) => updatePrimaryCTA({ text: e.target.value })}
                  placeholder="Start Free Trial"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Link URL</Label>
                <Input
                  value={localContent.primaryCTA?.url || ''}
                  onChange={(e) => updatePrimaryCTA({ url: e.target.value })}
                  placeholder="/register"
                />
              </div>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Secondary Button</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showSecondaryCTA}
                  onCheckedChange={(checked) => {
                    setShowSecondaryCTA(checked);
                    if (!checked) {
                      updateContent({ secondaryCTA: undefined });
                    } else {
                      updateContent({ secondaryCTA: { text: 'View Pricing', url: '/plans' } });
                    }
                  }}
                />
                <span className="text-xs text-gray-500">
                  {showSecondaryCTA ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            {showSecondaryCTA && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Button Text</Label>
                  <Input
                    value={localContent.secondaryCTA?.text || ''}
                    onChange={(e) => updateSecondaryCTA({ text: e.target.value })}
                    placeholder="View Pricing"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Link URL</Label>
                  <Input
                    value={localContent.secondaryCTA?.url || ''}
                    onChange={(e) => updateSecondaryCTA({ url: e.target.value })}
                    placeholder="/plans"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trust Badge (Optional) */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Trust Badge (Optional)</CardTitle>
              <CardDescription>Small text below the buttons</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showTrustBadge}
                onCheckedChange={(checked) => {
                  setShowTrustBadge(checked);
                  if (!checked) {
                    updateContent({ trustBadge: undefined });
                  } else {
                    updateContent({ trustBadge: 'Trusted by 1,000+ marketers worldwide' });
                  }
                }}
              />
              <span className="text-xs text-gray-500">
                {showTrustBadge ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        {showTrustBadge && (
          <CardContent>
            <Input
              value={localContent.trustBadge || ''}
              onChange={(e) => updateContent({ trustBadge: e.target.value })}
              placeholder="Trusted by 1,000+ marketers worldwide"
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
