'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IconPicker, getIconByName } from '../IconPicker';
import { SortableItemCard } from '../SortableItemCard';
import { Plus, Loader2, Save, RotateCcw, X, Star } from 'lucide-react';

interface TestimonialItem {
  id?: string;
  author?: string;
  role?: string;
  company?: string;
  quote?: string;
  isActive?: boolean;
}

interface StatItem {
  value?: string;
  label?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

interface SocialProofContent {
  trustTitle?: string;
  testimonials?: TestimonialItem[];
  stats?: StatItem[];
}

interface SocialProofEditorProps {
  content: SocialProofContent;
  onChange: (content: SocialProofContent) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  lastUpdated?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export function SocialProofEditor({
  content,
  onChange,
  onSave,
  onReset,
  isSaving = false,
  lastUpdated,
}: SocialProofEditorProps) {
  const [localContent, setLocalContent] = useState<SocialProofContent>(content);
  const [hasChanges, setHasChanges] = useState(false);
  const [showStats, setShowStats] = useState((content.stats?.length || 0) > 0);
  const isInternalChange = useRef(false);

  useEffect(() => {
    // Only reset state if this is an external change (from server/reset)
    if (!isInternalChange.current) {
      setLocalContent(content);
      setShowStats((content.stats?.length || 0) > 0);
      setHasChanges(false);
    }
    isInternalChange.current = false;
  }, [content]);

  const updateContent = (updates: Partial<SocialProofContent>) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    isInternalChange.current = true;
    onChange(newContent);
    setHasChanges(true);
  };

  // Testimonial management
  const updateTestimonial = (index: number, updates: Partial<TestimonialItem>) => {
    const testimonials = [...(localContent.testimonials || [])];
    testimonials[index] = { ...testimonials[index], ...updates };
    updateContent({ testimonials });
  };

  const addTestimonial = () => {
    const testimonials = [
      ...(localContent.testimonials || []),
      {
        id: generateId(),
        author: 'New Customer',
        role: 'Position',
        company: 'Company Name',
        quote: 'Add your testimonial quote here...',
        isActive: true,
      },
    ];
    updateContent({ testimonials });
  };

  const removeTestimonial = (index: number) => {
    const testimonials = (localContent.testimonials || []).filter((_, i) => i !== index);
    updateContent({ testimonials });
  };

  const duplicateTestimonial = (index: number) => {
    const testimonials = [...(localContent.testimonials || [])];
    const original = testimonials[index];
    testimonials.splice(index + 1, 0, {
      ...original,
      id: generateId(),
      author: `${original.author} (Copy)`,
    });
    updateContent({ testimonials });
  };

  const moveTestimonial = (index: number, direction: 'up' | 'down') => {
    const testimonials = [...(localContent.testimonials || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= testimonials.length) return;
    [testimonials[index], testimonials[newIndex]] = [testimonials[newIndex], testimonials[index]];
    updateContent({ testimonials });
  };

  // Stats management
  const updateStat = (index: number, updates: Partial<StatItem>) => {
    const stats = [...(localContent.stats || [])];
    stats[index] = { ...stats[index], ...updates };
    updateContent({ stats });
  };

  const addStat = () => {
    const stats = [
      ...(localContent.stats || []),
      {
        value: '100+',
        label: 'New Stat',
        description: 'Description',
        icon: 'Users',
        isActive: true,
      },
    ];
    updateContent({ stats });
  };

  const removeStat = (index: number) => {
    const stats = (localContent.stats || []).filter((_, i) => i !== index);
    updateContent({ stats });
  };

  return (
    <div className="space-y-6">
      {/* Header with Save/Reset */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Social Proof Section</h3>
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
          <CardTitle className="text-base">Section Title</CardTitle>
          <CardDescription>Main title for the testimonials section</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Trust Title</Label>
            <Input
              value={localContent.trustTitle || ''}
              onChange={(e) => updateContent({ trustTitle: e.target.value })}
              placeholder="Join 1,000+ Marketers Saving Hours Every Week"
            />
          </div>
        </CardContent>
      </Card>

      {/* Testimonials List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Testimonials</CardTitle>
              <CardDescription>
                {(localContent.testimonials || []).length} testimonials •{' '}
                {(localContent.testimonials || []).filter((t) => t.isActive !== false).length} active
              </CardDescription>
            </div>
            <Button onClick={addTestimonial} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Testimonial
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(localContent.testimonials || []).map((testimonial, index) => (
            <SortableItemCard
              key={testimonial.id || index}
              title={testimonial.author || 'Unnamed'}
              subtitle={`${testimonial.role} at ${testimonial.company}`}
              isActive={testimonial.isActive !== false}
              onActiveChange={(active) => updateTestimonial(index, { isActive: active })}
              onDelete={() => removeTestimonial(index)}
              onDuplicate={() => duplicateTestimonial(index)}
              onMoveUp={() => moveTestimonial(index, 'up')}
              onMoveDown={() => moveTestimonial(index, 'down')}
              canMoveUp={index > 0}
              canMoveDown={index < (localContent.testimonials?.length || 0) - 1}
              headerContent={
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                  ))}
                </div>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Author Name</Label>
                    <Input
                      value={testimonial.author || ''}
                      onChange={(e) => updateTestimonial(index, { author: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role/Position</Label>
                    <Input
                      value={testimonial.role || ''}
                      onChange={(e) => updateTestimonial(index, { role: e.target.value })}
                      placeholder="Marketing Director"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={testimonial.company || ''}
                      onChange={(e) => updateTestimonial(index, { company: e.target.value })}
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quote</Label>
                  <Textarea
                    value={testimonial.quote || ''}
                    onChange={(e) => updateTestimonial(index, { quote: e.target.value })}
                    placeholder="What the customer said about your product..."
                    rows={3}
                  />
                </div>
              </div>
            </SortableItemCard>
          ))}
          {(localContent.testimonials || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {'No testimonials yet. Click "Add Testimonial" to create one.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Stats (Optional)</CardTitle>
              <CardDescription>Key metrics to display alongside testimonials</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showStats}
                onCheckedChange={(checked) => {
                  setShowStats(checked);
                  if (!checked) {
                    updateContent({ stats: [] });
                  } else if ((localContent.stats?.length || 0) === 0) {
                    updateContent({
                      stats: [
                        { value: '1000+', label: 'Happy Customers', icon: 'Users', isActive: true },
                        { value: '50K+', label: 'Tags Created', icon: 'Tag', isActive: true },
                        { value: '99.9%', label: 'Uptime', icon: 'TrendingUp', isActive: true },
                      ],
                    });
                  }
                }}
              />
              <span className="text-xs text-gray-500">
                {showStats ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        {showStats && (
          <CardContent className="space-y-4">
            {(localContent.stats || []).map((stat, index) => {
              const Icon = getIconByName(stat.icon || 'Users');
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={stat.isActive !== false}
                      onCheckedChange={(active) => updateStat(index, { isActive: active })}
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={stat.value || ''}
                          onChange={(e) => updateStat(index, { value: e.target.value })}
                          placeholder="100+"
                          className="font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={stat.label || ''}
                          onChange={(e) => updateStat(index, { label: e.target.value })}
                          placeholder="Customers"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Icon</Label>
                        <IconPicker
                          value={stat.icon || 'Users'}
                          onChange={(icon) => updateStat(index, { icon })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input
                        value={stat.description || ''}
                        onChange={(e) => updateStat(index, { description: e.target.value })}
                        placeholder="Additional context..."
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-50"
                    onClick={() => removeStat(index)}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStat}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stat
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
