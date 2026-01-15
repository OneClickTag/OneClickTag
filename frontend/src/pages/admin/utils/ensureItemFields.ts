interface BaseItem {
  id: string;
  isActive: boolean;
  order: number;
}

/**
 * Generates a short unique ID
 */
function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Ensures that an array of items has id, isActive, and order fields.
 * If items already have these fields, they are preserved.
 * Otherwise, default values are added.
 */
export function ensureItemFields<T>(
  items: any[],
  defaultActive: boolean = true
): (T & BaseItem)[] {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => ({
    ...item,
    id: item.id || generateId(),
    isActive: item.isActive !== undefined ? item.isActive : defaultActive,
    order: item.order !== undefined ? item.order : index,
  }));
}

/**
 * Filters items to only show active ones, sorted by order
 */
export function getActiveItems<T extends BaseItem>(items: T[]): T[] {
  return items
    .filter((item) => item.isActive)
    .sort((a, b) => a.order - b.order);
}
