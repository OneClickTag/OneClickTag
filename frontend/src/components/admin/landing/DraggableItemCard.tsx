import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface BaseItem {
  id: string;
  isActive: boolean;
  order: number;
}

interface DraggableItemCardProps<T extends BaseItem> {
  item: T;
  index: number;
  onToggle: (id: string, isActive: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
  label?: string;
}

export function DraggableItemCard<T extends BaseItem>({
  item,
  index,
  onToggle,
  disabled = false,
  children,
  label,
}: DraggableItemCardProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      {/* Drag Handle */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
        >
          <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        </div>
      )}

      {/* Card Content */}
      <div
        className={`ml-8 transition-all duration-200 rounded-lg ${
          item.isActive
            ? 'border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
            : 'border-2 border-dashed border-gray-300 bg-gray-50 opacity-60'
        } ${isDragging ? 'border-blue-500 shadow-2xl' : ''}`}
      >
        {/* Header with Toggle and Badge */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            {label && (
              <Label className="text-sm font-medium text-gray-700">
                {label}
              </Label>
            )}
            {!item.isActive && (
              <Badge variant="secondary" className="text-xs">
                <EyeOff className="w-3 h-3 mr-1" />
                Hidden
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`item-${item.id}-active`}
              className="text-xs text-gray-500"
            >
              {item.isActive ? 'Active' : 'Inactive'}
            </Label>
            <Switch
              id={`item-${item.id}-active`}
              checked={item.isActive}
              onCheckedChange={(checked) => onToggle(item.id, checked)}
              disabled={disabled}
              className="h-5 w-9"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pt-2">{children}</div>
      </div>
    </div>
  );
}
