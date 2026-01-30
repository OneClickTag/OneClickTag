'use client';

import { useState, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableItemCardProps {
  title: string;
  subtitle?: string;
  isActive?: boolean;
  onActiveChange?: (active: boolean) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  headerContent?: ReactNode;
}

export function SortableItemCard({
  title,
  subtitle,
  isActive = true,
  onActiveChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  children,
  defaultExpanded = false,
  className,
  headerContent,
}: SortableItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card
      className={cn(
        'border transition-all',
        isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-60',
        className
      )}
    >
      {/* Header - Always Visible */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Drag Handle */}
        <div className="flex flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-move"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </Button>
        </div>

        {/* Move Up/Down */}
        <div className="flex flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            disabled={!canMoveUp}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            disabled={!canMoveDown}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Title & Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{title}</div>
          {subtitle && (
            <div className="text-sm text-gray-500 truncate">{subtitle}</div>
          )}
        </div>

        {/* Header Content (optional, like preview icon) */}
        {headerContent && (
          <div onClick={(e) => e.stopPropagation()}>{headerContent}</div>
        )}

        {/* Active Toggle */}
        {onActiveChange && (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={isActive}
              onCheckedChange={onActiveChange}
              id={`active-${title}`}
            />
            <Label
              htmlFor={`active-${title}`}
              className="text-xs text-gray-500 cursor-pointer"
            >
              {isActive ? 'Active' : 'Hidden'}
            </Label>
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {onDuplicate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onDuplicate}
              title="Duplicate"
            >
              <Copy className="h-4 w-4 text-gray-400" />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-red-50"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>

        {/* Expand/Collapse Icon */}
        <ChevronDown
          className={cn(
            'h-5 w-5 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </Card>
  );
}

// Simple list wrapper for sortable items
interface SortableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, helpers: {
    moveUp: () => void;
    moveDown: () => void;
    remove: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  }) => ReactNode;
  className?: string;
}

export function SortableList<T>({
  items,
  onReorder,
  renderItem,
  className,
}: SortableListProps<T>) {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onReorder(newItems);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onReorder(newItems);
  };

  const remove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onReorder(newItems);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item, index) =>
        renderItem(item, index, {
          moveUp: () => moveUp(index),
          moveDown: () => moveDown(index),
          remove: () => remove(index),
          canMoveUp: index > 0,
          canMoveDown: index < items.length - 1,
        })
      )}
    </div>
  );
}
