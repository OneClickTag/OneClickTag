'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IconPicker } from '../IconPicker';
import { Plus, X, GripVertical, Loader2, Save, RotateCcw } from 'lucide-react';

interface CTAButton {
  url?: string;
  text?: string;
}

interface BadgeContent {
  icon?: string;
  text?: string;
}

interface HeroContent {
  badge?: BadgeContent;
  headline?: string;
  headlineHighlight?: string;
  subtitle?: string;
  benefits?: string[];
  primaryCTA?: CTAButton;
  secondaryCTA?: CTAButton;
  trustIndicators?: string;
}

interface HeroEditorProps {
  content: HeroContent;
  onChange: (content: HeroContent) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  lastUpdated?: string;
}

const defaultHero: HeroContent = {
  badge: { icon: 'Zap', text: 'Automated Conversion Tracking' },
  headline: 'Stop Wasting Hours on',
  headlineHighlight: 'Google Tag Setup',
  subtitle: 'OneClickTag automatically creates GTM tags, Google Ads conversions, and GA4 events in seconds.',
  benefits: ['No coding required', 'GTM + Google Ads + GA4', 'Live in 2 minutes'],
  primaryCTA: { url: '/register', text: 'Start Free Trial' },
  secondaryCTA: { url: '/plans', text: 'View Pricing' },
  trustIndicators: 'No credit card required • Cancel anytime • 14-day free trial',
};

export function HeroEditor({
  content,
  onChange,
  onSave,
  onReset,
  isSaving = false,
  lastUpdated,
}: HeroEditorProps) {
  const [localContent, setLocalContent] = useState<HeroContent>(content);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSecondaryCTA, setShowSecondaryCTA] = useState(!!content.secondaryCTA?.text);
  const isInternalChange = useRef(false);

  useEffect(() => {
    // Only reset state if this is an external change (from server/reset)
    if (!isInternalChange.current) {
      setLocalContent(content);
      setShowSecondaryCTA(!!content.secondaryCTA?.text);
      setHasChanges(false);
    }
    isInternalChange.current = false;
  }, [content]);

  const updateContent = (updates: Partial<HeroContent>) => {
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

  const addBenefit = () => {
    const benefits = [...(localContent.benefits || []), 'New benefit'];
    updateContent({ benefits });
  };

  const updateBenefit = (index: number, value: string) => {
    const benefits = [...(localContent.benefits || [])];
    benefits[index] = value;
    updateContent({ benefits });
  };

  const removeBenefit = (index: number) => {
    const benefits = (localContent.benefits || []).filter((_, i) => i !== index);
    updateContent({ benefits });
  };

  const moveBenefit = (index: number, direction: 'up' | 'down') => {
    const benefits = [...(localContent.benefits || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= benefits.length) return;
    [benefits[index], benefits[newIndex]] = [benefits[newIndex], benefits[index]];
    updateContent({ benefits });
  };

  return (
    <div className="space-y-6">
      {/* Header with Save/Reset */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Hero Section</h3>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Badge Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Badge</CardTitle>
          <CardDescription>The small badge shown above the headline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <IconPicker
                value={localContent.badge?.icon || 'Zap'}
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
      </Card>

      {/* Headlines Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Headlines</CardTitle>
          <CardDescription>Main headline and subtitle text</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Main Headline</Label>
              <Input
                value={localContent.headline || ''}
                onChange={(e) => updateContent({ headline: e.target.value })}
                placeholder="Stop Wasting Hours on..."
              />
            </div>
            <div className="space-y-2">
              <Label>Highlighted Text (gradient)</Label>
              <Input
                value={localContent.headlineHighlight || ''}
                onChange={(e) => updateContent({ headlineHighlight: e.target.value })}
                placeholder="Google Tag Setup"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Textarea
              value={localContent.subtitle || ''}
              onChange={(e) => updateContent({ subtitle: e.target.value })}
              placeholder="Describe what your product does..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Benefits</CardTitle>
          <CardDescription>Short benefit points shown with checkmarks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(localContent.benefits || []).map((benefit, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => moveBenefit(index, 'up')}
                  disabled={index === 0}
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </Button>
              </div>
              <Input
                value={benefit}
                onChange={(e) => updateBenefit(index, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50"
                onClick={() => removeBenefit(index)}
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBenefit}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Benefit
          </Button>
        </CardContent>
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

      {/* Trust Indicators */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Trust Indicators</CardTitle>
          <CardDescription>Small text below the buttons (use • to separate items)</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={localContent.trustIndicators || ''}
            onChange={(e) => updateContent({ trustIndicators: e.target.value })}
            placeholder="No credit card required • Cancel anytime • 14-day free trial"
          />
        </CardContent>
      </Card>
    </div>
  );
}
