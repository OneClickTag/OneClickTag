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
import { Plus, Loader2, Save, RotateCcw, X } from 'lucide-react';

interface StepItem {
  id?: string;
  step?: string;
  icon?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

interface StatItem {
  value?: string;
  label?: string;
  isActive?: boolean;
}

interface HowItWorksContent {
  title?: string;
  subtitle?: string;
  steps?: StepItem[];
  stats?: StatItem[];
}

interface HowItWorksEditorProps {
  content: HowItWorksContent;
  onChange: (content: HowItWorksContent) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  lastUpdated?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export function HowItWorksEditor({
  content,
  onChange,
  onSave,
  onReset,
  isSaving = false,
  lastUpdated,
}: HowItWorksEditorProps) {
  const [localContent, setLocalContent] = useState<HowItWorksContent>(content);
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

  const updateContent = (updates: Partial<HowItWorksContent>) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    isInternalChange.current = true;
    onChange(newContent);
    setHasChanges(true);
  };

  // Steps management
  const updateStep = (index: number, updates: Partial<StepItem>) => {
    const steps = [...(localContent.steps || [])];
    steps[index] = { ...steps[index], ...updates };
    updateContent({ steps });
  };

  const addStep = () => {
    const stepNumber = (localContent.steps?.length || 0) + 1;
    const steps = [
      ...(localContent.steps || []),
      {
        id: generateId(),
        step: String(stepNumber).padStart(2, '0'),
        icon: 'Rocket',
        title: 'New Step',
        description: 'Describe this step...',
        isActive: true,
        order: stepNumber,
      },
    ];
    updateContent({ steps });
  };

  const removeStep = (index: number) => {
    const steps = (localContent.steps || []).filter((_, i) => i !== index);
    // Renumber steps
    steps.forEach((step, i) => {
      step.step = String(i + 1).padStart(2, '0');
    });
    updateContent({ steps });
  };

  const duplicateStep = (index: number) => {
    const steps = [...(localContent.steps || [])];
    const original = steps[index];
    steps.splice(index + 1, 0, {
      ...original,
      id: generateId(),
      title: `${original.title} (Copy)`,
    });
    // Renumber steps
    steps.forEach((step, i) => {
      step.step = String(i + 1).padStart(2, '0');
    });
    updateContent({ steps });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const steps = [...(localContent.steps || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    // Renumber steps
    steps.forEach((step, i) => {
      step.step = String(i + 1).padStart(2, '0');
    });
    updateContent({ steps });
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
      { value: '100+', label: 'New Stat', isActive: true },
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
          <h3 className="text-lg font-semibold">How It Works Section</h3>
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
          <CardDescription>Title and subtitle for the how it works section</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={localContent.title || ''}
              onChange={(e) => updateContent({ title: e.target.value })}
              placeholder="Live Tracking in 3 Simple Steps"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Textarea
              value={localContent.subtitle || ''}
              onChange={(e) => updateContent({ subtitle: e.target.value })}
              placeholder="See how simple conversion tracking can be."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Steps</CardTitle>
              <CardDescription>
                {(localContent.steps || []).length} steps •{' '}
                {(localContent.steps || []).filter((s) => s.isActive !== false).length} active
              </CardDescription>
            </div>
            <Button onClick={addStep} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(localContent.steps || []).map((step, index) => {
            const Icon = getIconByName(step.icon || 'Rocket');
            return (
              <SortableItemCard
                key={step.id || index}
                title={`Step ${step.step}: ${step.title || 'Untitled'}`}
                subtitle={step.description?.substring(0, 50) + '...'}
                isActive={step.isActive !== false}
                onActiveChange={(active) => updateStep(index, { isActive: active })}
                onDelete={() => removeStep(index)}
                onDuplicate={() => duplicateStep(index)}
                onMoveUp={() => moveStep(index, 'up')}
                onMoveDown={() => moveStep(index, 'down')}
                canMoveUp={index > 0}
                canMoveDown={index < (localContent.steps?.length || 0) - 1}
                headerContent={
                  Icon && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  )
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Step Number</Label>
                      <Input
                        value={step.step || ''}
                        onChange={(e) => updateStep(index, { step: e.target.value })}
                        placeholder="01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <IconPicker
                        value={step.icon || 'Rocket'}
                        onChange={(icon) => updateStep(index, { icon })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={step.title || ''}
                      onChange={(e) => updateStep(index, { title: e.target.value })}
                      placeholder="Step title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={step.description || ''}
                      onChange={(e) => updateStep(index, { description: e.target.value })}
                      placeholder="Describe this step..."
                      rows={2}
                    />
                  </div>
                </div>
              </SortableItemCard>
            );
          })}
          {(localContent.steps || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No steps yet. Click "Add Step" to create one.
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
              <CardDescription>Statistics displayed below the steps</CardDescription>
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
                        { value: '2min', label: 'Setup Time', isActive: true },
                        { value: '100%', label: 'Automated', isActive: true },
                        { value: '30min', label: 'Saved per Tag', isActive: true },
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
            {(localContent.stats || []).map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Switch
                    checked={stat.isActive !== false}
                    onCheckedChange={(active) => updateStat(index, { isActive: active })}
                  />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Input
                    value={stat.value || ''}
                    onChange={(e) => updateStat(index, { value: e.target.value })}
                    placeholder="100+"
                    className="font-bold"
                  />
                  <Input
                    value={stat.label || ''}
                    onChange={(e) => updateStat(index, { label: e.target.value })}
                    placeholder="Label"
                  />
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
            ))}
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
