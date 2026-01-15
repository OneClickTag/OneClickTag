import { useState, useEffect } from 'react';
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

interface SocialProofStat extends BaseItem {
  icon: string;
  value: string;
  label: string;
  description: string;
}

interface SocialProofLogo extends BaseItem {
  name: string;
  width: string;
}

interface SocialProofTestimonial extends BaseItem {
  quote: string;
  author: string;
  role: string;
  company: string;
}

interface SocialProofContent {
  stats: SocialProofStat[];
  trustTitle: string;
  logos: SocialProofLogo[];
  testimonials: SocialProofTestimonial[];
}

interface SocialProofEditorProps {
  data: SocialProofContent;
  sectionIsActive: boolean;
  onToggleSection: () => void;
  onSave: () => void;
  onChange: (data: SocialProofContent) => void;
  saving: boolean;
}

export function SocialProofEditor({
  data,
  sectionIsActive,
  onToggleSection,
  onSave,
  onChange,
  saving,
}: SocialProofEditorProps) {
  // Sortable hooks for each list
  const stats = useSortableItems<SocialProofStat>(data.stats);
  const logos = useSortableItems<SocialProofLogo>(data.logos);
  const testimonials = useSortableItems<SocialProofTestimonial>(data.testimonials);

  // Sync changes back to parent
  useEffect(() => {
    onChange({
      ...data,
      stats: stats.items,
      logos: logos.items,
      testimonials: testimonials.items,
    });
  }, [stats.items, logos.items, testimonials.items]);

  const generateId = () =>
    `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Section Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Social Proof</h3>
            <p className="text-sm text-gray-500 mt-1">
              Stats, logos, and testimonials section
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
      <div className="p-6 space-y-8">
        {/* Stats Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Stats</h4>
            <Button
              onClick={() =>
                stats.addItem({
                  id: generateId(),
                  isActive: true,
                  order: stats.items.length,
                  icon: 'Users',
                  value: '',
                  label: '',
                  description: '',
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
                        Icon
                      </label>
                      <select
                        value={stat.icon}
                        onChange={(e) =>
                          stats.updateItem(stat.id, { icon: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      >
                        <option value="Users">Users</option>
                        <option value="Target">Target</option>
                        <option value="Clock">Clock</option>
                        <option value="TrendingUp">Trending Up</option>
                      </select>
                    </div>
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
                        placeholder="1,000+"
                      />
                    </div>
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
                      placeholder="Active Users"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={stat.description}
                      onChange={(e) =>
                        stats.updateItem(stat.id, {
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      placeholder="Marketers trust OneClickTag"
                    />
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

        {/* Trust Title */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Trust Section Title
          </label>
          <input
            type="text"
            value={data.trustTitle}
            onChange={(e) =>
              onChange({
                ...data,
                trustTitle: e.target.value,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            placeholder="Powered By Industry Leaders"
          />
        </div>

        {/* Partner Logos Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Partner Logos</h4>
            <Button
              onClick={() =>
                logos.addItem({
                  id: generateId(),
                  isActive: true,
                  order: logos.items.length,
                  name: '',
                  width: 'w-24',
                })
              }
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Logo
            </Button>
          </div>

          <SortableItemList
            items={logos.items}
            activeId={logos.activeId}
            onDragStart={logos.handleDragStart}
            onDragEnd={logos.handleDragEnd}
            renderItem={(logo, index) => (
              <DraggableItemCard
                item={logo}
                index={index}
                onToggle={logos.handleToggleItem}
                label={`Logo ${index + 1}`}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={logo.name}
                        onChange={(e) =>
                          logos.updateItem(logo.id, { name: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="Google"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Width (Tailwind)
                      </label>
                      <select
                        value={logo.width}
                        onChange={(e) =>
                          logos.updateItem(logo.id, { width: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      >
                        <option value="w-20">Small (w-20)</option>
                        <option value="w-24">Medium (w-24)</option>
                        <option value="w-28">Large (w-28)</option>
                        <option value="w-32">Extra Large (w-32)</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={() => logos.removeItem(logo.id)}
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Remove Logo
                  </Button>
                </div>
              </DraggableItemCard>
            )}
          />
        </div>

        {/* Testimonials Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Testimonials</h4>
            <Button
              onClick={() =>
                testimonials.addItem({
                  id: generateId(),
                  isActive: true,
                  order: testimonials.items.length,
                  quote: '',
                  author: '',
                  role: '',
                  company: '',
                })
              }
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Testimonial
            </Button>
          </div>

          <SortableItemList
            items={testimonials.items}
            activeId={testimonials.activeId}
            onDragStart={testimonials.handleDragStart}
            onDragEnd={testimonials.handleDragEnd}
            renderItem={(testimonial, index) => (
              <DraggableItemCard
                item={testimonial}
                index={index}
                onToggle={testimonials.handleToggleItem}
                label={`Testimonial ${index + 1}`}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quote
                    </label>
                    <textarea
                      value={testimonial.quote}
                      onChange={(e) =>
                        testimonials.updateItem(testimonial.id, {
                          quote: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="This product changed my life..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={testimonial.author}
                        onChange={(e) =>
                          testimonials.updateItem(testimonial.id, {
                            author: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        value={testimonial.role}
                        onChange={(e) =>
                          testimonials.updateItem(testimonial.id, {
                            role: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        placeholder="Marketing Director"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={testimonial.company}
                      onChange={(e) =>
                        testimonials.updateItem(testimonial.id, {
                          company: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <Button
                    onClick={() => testimonials.removeItem(testimonial.id)}
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Remove Testimonial
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
