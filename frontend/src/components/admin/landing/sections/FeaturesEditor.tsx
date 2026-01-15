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

interface Feature extends BaseItem {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface FeaturesContent {
  title: string;
  titleHighlight: string;
  subtitle: string;
  features: Feature[];
  bottomCTA: {
    text: string;
    linkText: string;
    linkUrl: string;
  };
}

interface FeaturesEditorProps {
  data: FeaturesContent;
  sectionIsActive: boolean;
  onToggleSection: () => void;
  onSave: () => void;
  onChange: (data: FeaturesContent) => void;
  saving: boolean;
}

export function FeaturesEditor({
  data,
  sectionIsActive,
  onToggleSection,
  onSave,
  onChange,
  saving,
}: FeaturesEditorProps) {
  const features = useSortableItems<Feature>(data.features);

  useEffect(() => {
    onChange({ ...data, features: features.items });
  }, [features.items]);

  const generateId = () =>
    `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Features Section</h3>
            <p className="text-sm text-gray-500 mt-1">
              Showcase product features with icons and descriptions
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

      <div className="p-6 space-y-6">
        {/* Section Title */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title (First Part)
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              placeholder="Everything You Need"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title Highlight (Second Part)
            </label>
            <input
              type="text"
              value={data.titleHighlight}
              onChange={(e) =>
                onChange({ ...data, titleHighlight: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              placeholder="In One Platform"
            />
          </div>
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
            placeholder="Stop juggling multiple tools..."
          />
        </div>

        {/* Features */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Features</h4>
            <Button
              onClick={() =>
                features.addItem({
                  id: generateId(),
                  isActive: true,
                  order: features.items.length,
                  icon: 'Zap',
                  title: '',
                  description: '',
                  color: 'from-blue-500 to-blue-600',
                })
              }
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Feature
            </Button>
          </div>

          <SortableItemList
            items={features.items}
            activeId={features.activeId}
            onDragStart={features.handleDragStart}
            onDragEnd={features.handleDragEnd}
            renderItem={(feature, index) => (
              <DraggableItemCard
                item={feature}
                index={index}
                onToggle={features.handleToggleItem}
                label={`Feature ${index + 1}`}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={feature.icon}
                        onChange={(e) =>
                          features.updateItem(feature.id, {
                            icon: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="Tag"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Color (Tailwind Gradient)
                      </label>
                      <input
                        type="text"
                        value={feature.color}
                        onChange={(e) =>
                          features.updateItem(feature.id, {
                            color: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="from-blue-500 to-blue-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) =>
                        features.updateItem(feature.id, {
                          title: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      placeholder="Google Tag Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={feature.description}
                      onChange={(e) =>
                        features.updateItem(feature.id, {
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      rows={2}
                      placeholder="Automatically create tags, triggers..."
                    />
                  </div>
                  <Button
                    onClick={() => features.removeItem(feature.id)}
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Remove Feature
                  </Button>
                </div>
              </DraggableItemCard>
            )}
          />
        </div>

        {/* Bottom CTA */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Bottom CTA</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                CTA Text
              </label>
              <input
                type="text"
                value={data.bottomCTA.text}
                onChange={(e) =>
                  onChange({
                    ...data,
                    bottomCTA: { ...data.bottomCTA, text: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                placeholder="Ready to simplify your tracking workflow?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={data.bottomCTA.linkText}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      bottomCTA: {
                        ...data.bottomCTA,
                        linkText: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                  placeholder="Get started for free"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Link URL
                </label>
                <input
                  type="text"
                  value={data.bottomCTA.linkUrl}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      bottomCTA: {
                        ...data.bottomCTA,
                        linkUrl: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                  placeholder="/register"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
