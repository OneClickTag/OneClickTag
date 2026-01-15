import { ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface BaseItem {
  id: string;
  isActive: boolean;
  order: number;
}

interface SortableItemListProps<T extends BaseItem> {
  items: T[];
  activeId: string | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  renderItem: (item: T, index: number) => ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SortableItemList<T extends BaseItem>({
  items,
  activeId,
  onDragStart,
  onDragEnd,
  renderItem,
  disabled = false,
  className = 'space-y-4',
}: SortableItemListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get active item for drag overlay
  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      modifiers={disabled ? [] : undefined}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <div className={className}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </SortableContext>

      {/* Drag Overlay - shows dragged item */}
      <DragOverlay>
        {activeItem ? (
          <div className="border-2 border-blue-500 rounded-lg shadow-2xl bg-white opacity-90 scale-105">
            {renderItem(activeItem, items.indexOf(activeItem))}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
