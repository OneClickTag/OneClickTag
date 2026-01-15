import { useState } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

interface BaseItem {
  id: string;
  isActive: boolean;
  order: number;
}

export function useSortableItems<T extends BaseItem>(initialItems: T[]) {
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id);
        const newIndex = currentItems.findIndex((item) => item.id === over.id);

        // Reorder items and update order field
        const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);
        return reorderedItems.map((item, index) => ({
          ...item,
          order: index,
        }));
      });
    }

    setActiveId(null);
  };

  const handleToggleItem = (id: string, isActive: boolean) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, isActive } : item
      )
    );
  };

  const updateItem = (id: string, updates: Partial<T>) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const addItem = (item: T) => {
    setItems((currentItems) => [...currentItems, item]);
  };

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  return {
    items,
    setItems,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleToggleItem,
    updateItem,
    addItem,
    removeItem,
  };
}
