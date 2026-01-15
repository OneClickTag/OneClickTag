import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Save, Eye, EyeOff } from 'lucide-react';
import { useSortableItems } from '@/pages/admin/hooks/useSortableItems';
import { SortableItemList } from '../SortableItemList';
import { DraggableItemCard } from '../DraggableItemCard';

interface BaseItem {
  id: string;
  isActive: boolean;
  order: number;
}

interface HowItWorksStep extends BaseItem {
  icon: string;
  title: string;
  description: string;
  step: string;
}

interface HowItWorksStat extends BaseItem {
  value: string;
  label: string;
}

interface HowItWorksContent {
  title: string;
  subtitle: string;
  steps: HowItWorksStep[];
  stats: HowItWorksStat[];
}

interface HowItWorksEditorProps {
  data: HowItWorksContent;
  sectionIsActive: boolean;
  onToggleSection: () => void;
  onSave: () => void;
  onChange: (data: HowItWorksContent) => void;
  saving: boolean;
}

export function HowItWorksEditor({
  data,
  sectionIsActive,
  onToggleSection,
  onSave,
  onChange,
  saving,
}: HowItWorksEditorProps) {
  // Sortable hooks
  const steps = useSortableItems<HowItWorksStep>(data.steps);
  const stats = useSortableItems<HowItWorksStat>(data.stats);

  // Sync changes back to parent
  useEffect(() => {
    onChange({
      ...data,
      steps: steps.items,
      stats: stats.items,
    });
  }, [steps.items, stats.items]);

  const generateId = () =>
    `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Section Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">How It Works</h3>
            <p className="text-sm text-gray-500 mt-1">
              4-step process section with stats
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleSection}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sectionIsActive
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {sectionIsActive ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Inactive</span>
                </>
              )}
            </button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              <span>Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Title
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            placeholder="How It Works"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Subtitle
          </label>
          <textarea
            value={data.subtitle}
            onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            rows={2}
            placeholder="Get up and running in minutes, not hours..."
          />
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Steps</h4>
            <Button
              onClick={() =>
                steps.addItem({
                  id: generateId(),
                  isActive: true,
                  order: steps.items.length,
                  icon: 'MousePointerClick',
                  step: `0${steps.items.length + 1}`,
                  title: '',
                  description: '',
                })
              }
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </div>

          <SortableItemList
            items={steps.items}
            activeId={steps.activeId}
            onDragStart={steps.handleDragStart}
            onDragEnd={steps.handleDragEnd}
            renderItem={(step, index) => (
              <DraggableItemCard
                item={step}
                index={index}
                onToggle={steps.handleToggleItem}
                label={`Step ${index + 1}`}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Step Number
                      </label>
                      <input
                        type="text"
                        value={step.step}
                        onChange={(e) =>
                          steps.updateItem(step.id, { step: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={step.icon}
                        onChange={(e) =>
                          steps.updateItem(step.id, { icon: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="MousePointerClick"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) =>
                        steps.updateItem(step.id, { title: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      placeholder="Connect Google Account"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={step.description}
                      onChange={(e) =>
                        steps.updateItem(step.id, {
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      rows={2}
                      placeholder="One-click OAuth connection..."
                    />
                  </div>
                  <Button
                    onClick={() => steps.removeItem(step.id)}
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Remove Step
                  </Button>
                </div>
              </DraggableItemCard>
            )}
          />
        </div>

        {/* Bottom Stats */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Bottom Stats</h4>
            <Button
              onClick={() =>
                stats.addItem({
                  id: generateId(),
                  isActive: true,
                  order: stats.items.length,
                  value: '',
                  label: '',
                })
              }
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stat
            </Button>
          </div>

          <SortableItemList
            items={stats.items}
            activeId={stats.activeId}
            onDragStart={stats.handleDragStart}
            onDragEnd={stats.handleDragEnd}
            renderItem={(stat, index) => (
              <DraggableItemCard
                item={stat}
                index={index}
                onToggle={stats.handleToggleItem}
                label={`Stat ${index + 1}`}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={stat.value}
                        onChange={(e) =>
                          stats.updateItem(stat.id, { value: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="2 min"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Label
                      </label>
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(e) =>
                          stats.updateItem(stat.id, { label: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="Average Setup Time"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => stats.removeItem(stat.id)}
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Remove Stat
                  </Button>
                </div>
              </DraggableItemCard>
            )}
          />
        </div>
      </div>
    </div>
  );
}
