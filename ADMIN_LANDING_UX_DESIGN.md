# Admin Landing Page UX Design - Sub-Item Controls & Drag-and-Drop

## Design Overview

This document outlines the user interface and interaction patterns for managing individual items within landing page sections. The design focuses on intuitive controls, clear visual feedback, and a modern admin experience using Shadcn UI components.

---

## 1. Visual Interaction Patterns for Toggle Switches

### Design Rationale
Individual item toggles allow granular control over what appears on the public landing page without requiring deletion. This provides flexibility for A/B testing, seasonal content, and content experimentation.

### Toggle Design Specification

**Component**: Shadcn UI Switch component
**Placement**: Top-right corner of each item card
**Size**: Small (h-5 w-9)
**States**:
- Active (ON): Blue/purple gradient background, white circle
- Inactive (OFF): Gray background, white circle
- Disabled: Reduced opacity when section is inactive

```tsx
// Import
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Usage Pattern
<div className="flex items-center justify-between mb-4">
  <Label htmlFor={`item-${index}-active`} className="text-sm font-medium">
    Active on Landing Page
  </Label>
  <Switch
    id={`item-${index}-active`}
    checked={item.isActive}
    onCheckedChange={(checked) => handleToggleItem(index, checked)}
    disabled={!sectionIsActive}
  />
</div>
```

### Visual Feedback States

**Active Item Card**:
```tsx
className="border-2 border-gray-200 bg-white"
```

**Inactive Item Card**:
```tsx
className="border-2 border-dashed border-gray-300 bg-gray-50 opacity-60"
```

**Hover States**:
- Active: `hover:border-blue-300 hover:shadow-sm`
- Inactive: `hover:border-gray-400`

---

## 2. Drag Handle Design & Placement

### Design Rationale
Drag handles should be immediately recognizable as interactive elements while not cluttering the interface. They should appear only when needed (on hover or always visible based on context).

### Drag Handle Specification

**Visual Design**:
- Icon: GripVertical from lucide-react
- Size: w-5 h-5
- Color: text-gray-400 (default), text-gray-600 (hover), text-blue-600 (dragging)
- Placement: Left edge of each card
- Cursor: cursor-grab (idle), cursor-grabbing (dragging)

**Implementation Pattern**:
```tsx
import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function DraggableItem({ item, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
      </div>

      {/* Card Content */}
      <div className="ml-8 border-2 border-gray-200 rounded-lg p-4">
        {/* Item fields */}
      </div>
    </div>
  )
}
```

**Alternative: Always Visible Handle** (for mobile or when many items):
```tsx
<div className="flex items-start gap-2">
  <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-4">
    <GripVertical className="w-5 h-5 text-gray-400" />
  </div>
  <div className="flex-1 border-2 border-gray-200 rounded-lg p-4">
    {/* Item fields */}
  </div>
</div>
```

---

## 3. Drag Visual Feedback

### Design Specification

**During Drag**:
1. **Dragged Item**:
   - Opacity: 50%
   - Shadow: shadow-2xl
   - Scale: scale-105
   - Border: border-blue-500

2. **Drop Placeholder**:
   - Height: Same as dragged item
   - Background: bg-blue-50
   - Border: border-2 border-dashed border-blue-300
   - Animation: Pulse effect

3. **Other Items**:
   - Smooth translation animation (200ms)
   - Normal appearance

**Implementation with dnd-kit**:
```tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

function SortableList({ items, onReorder }) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      const newItems = arrayMove(items, oldIndex, newIndex)
      onReorder(newItems)
    }

    setActiveId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {items.map((item, index) => (
            <SortableItem key={item.id} item={item} index={index} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <div className="border-2 border-blue-500 rounded-lg shadow-2xl bg-white scale-105">
            {/* Render dragged item preview */}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
```

---

## 4. Inactive Item Display Strategy

### Design Decision: Grayed-Out (Recommended)

**Rationale**:
- Shows all content at a glance
- Makes it easy to toggle items back on
- Provides clear visual distinction between active/inactive
- Prevents accidental deletion

**Visual Treatment**:
```tsx
<div className={`
  relative rounded-lg p-4
  transition-all duration-200
  ${item.isActive
    ? 'border-2 border-gray-200 bg-white hover:border-blue-300'
    : 'border-2 border-dashed border-gray-300 bg-gray-50 opacity-60'
  }
`}>
  {/* Inactive Badge */}
  {!item.isActive && (
    <div className="absolute top-2 right-2">
      <Badge variant="secondary" className="text-xs">
        <EyeOff className="w-3 h-3 mr-1" />
        Hidden
      </Badge>
    </div>
  )}

  {/* Item content */}
</div>
```

**Alternative Approaches**:

1. **Collapsed/Expandable** (for very long lists):
```tsx
{!item.isActive && (
  <Collapsible>
    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-500">
      <ChevronRight className="w-4 h-4" />
      Hidden: {item.title}
    </CollapsibleTrigger>
    <CollapsibleContent>
      {/* Full item fields */}
    </CollapsibleContent>
  </Collapsible>
)}
```

2. **Separate Tab** (not recommended - adds complexity):
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger>Active Items ({activeCount})</TabsTrigger>
    <TabsTrigger>Inactive Items ({inactiveCount})</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## 5. Recommended Component Library: @dnd-kit

### Why dnd-kit?

**Advantages**:
1. Lightweight and performant
2. Built for React with hooks
3. Excellent TypeScript support
4. Accessibility built-in (keyboard navigation)
5. Supports touch devices
6. Highly customizable
7. Works well with Tailwind CSS
8. Active maintenance

**Installation**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Core Packages**:
- `@dnd-kit/core`: Core drag and drop functionality
- `@dnd-kit/sortable`: Presets for sortable lists
- `@dnd-kit/utilities`: Helper utilities (CSS transform, etc.)

**Alternative Considered**: react-beautiful-dnd
- Pros: Popular, well-documented
- Cons: Larger bundle size, maintenance concerns, less flexible

---

## 6. Code Structure Recommendations

### File Organization

```
frontend/src/
├── components/
│   ├── admin/
│   │   ├── landing/
│   │   │   ├── SortableItemList.tsx        # Reusable sortable container
│   │   │   ├── DraggableItemCard.tsx       # Individual draggable card
│   │   │   ├── ItemToggle.tsx              # Toggle switch component
│   │   │   ├── sections/
│   │   │   │   ├── HeroEditor.tsx          # Hero section editor
│   │   │   │   ├── FeaturesEditor.tsx      # Features section editor
│   │   │   │   ├── SocialProofEditor.tsx   # Social Proof editor
│   │   │   │   ├── HowItWorksEditor.tsx    # How It Works editor
│   │   │   │   └── CTAEditor.tsx           # CTA section editor
│   │   │   └── hooks/
│   │   │       └── useSortableItems.ts     # Reusable sorting logic
│   └── ui/                                  # Shadcn components
├── pages/
│   └── admin/
│       └── AdminLandingPage.tsx            # Main page with tabs
└── lib/
    └── api/
        └── services/
            └── admin.ts                     # API service
```

### Data Structure

```typescript
// Base item interface
interface BaseItem {
  id: string                    // Unique ID for drag-and-drop
  isActive: boolean             // Toggle state
  order: number                 // Display order
}

// Specific item types extend base
interface Stat extends BaseItem {
  icon: string
  value: string
  label: string
  description: string
}

interface Testimonial extends BaseItem {
  quote: string
  author: string
  role: string
  company: string
}

interface Feature extends BaseItem {
  icon: string
  title: string
  description: string
  color: string
}

interface Step extends BaseItem {
  icon: string
  title: string
  description: string
  step: string
}

// Section content with items
interface SocialProofContent {
  stats: Stat[]
  trustTitle: string
  logos: (Logo & BaseItem)[]
  testimonials: Testimonial[]
}

interface HowItWorksContent {
  title: string
  subtitle: string
  steps: Step[]
  stats: (SimpleStat & BaseItem)[]
}

interface FeaturesContent {
  title: string
  titleHighlight: string
  subtitle: string
  features: Feature[]
  bottomCTA: {
    text: string
    linkText: string
    linkUrl: string
  }
}
```

### Reusable Hook Pattern

```typescript
// hooks/useSortableItems.ts
import { useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

export function useSortableItems<T extends { id: string }>(
  initialItems: T[]
) {
  const [items, setItems] = useState(initialItems)
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }

    setActiveId(null)
  }

  const handleToggleItem = (id: string, isActive: boolean) => {
    setItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, isActive } : item
      )
    )
  }

  return {
    items,
    setItems,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleToggleItem,
  }
}
```

### Reusable Component Pattern

```typescript
// components/admin/landing/SortableItemList.tsx
interface SortableItemListProps<T extends BaseItem> {
  items: T[]
  onReorder: (items: T[]) => void
  onToggle: (id: string, isActive: boolean) => void
  renderItem: (item: T, index: number) => React.ReactNode
  disabled?: boolean
}

export function SortableItemList<T extends BaseItem>({
  items,
  onReorder,
  onToggle,
  renderItem,
  disabled = false,
}: SortableItemListProps<T>) {
  const { activeId, handleDragStart, handleDragEnd } = useSortableItems(items)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={disabled ? [] : undefined}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {items.map((item, index) => (
            <DraggableItemCard
              key={item.id}
              item={item}
              index={index}
              onToggle={onToggle}
              disabled={disabled}
            >
              {renderItem(item, index)}
            </DraggableItemCard>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && (
          <div className="border-2 border-blue-500 rounded-lg shadow-2xl bg-white">
            {/* Preview */}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
```

---

## 7. Accessibility Considerations

### Keyboard Navigation
- **Tab**: Move between items
- **Space/Enter**: Toggle active/inactive when focused on switch
- **Arrow Keys + Space**: Reorder items using keyboard
- **Escape**: Cancel drag operation

### Screen Reader Support
```tsx
<div
  role="listitem"
  aria-label={`${item.title}${item.isActive ? ' (active)' : ' (inactive)'}`}
>
  {/* Item content */}
</div>

<Switch
  aria-label={`Toggle ${item.title} visibility`}
  aria-describedby={`${item.id}-description`}
/>
```

### Focus Management
```tsx
<div className="focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 rounded-lg">
  {/* Item content */}
</div>
```

---

## 8. Mobile Responsive Patterns

### Touch Optimization
```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement before drag starts (prevents accidental drags)
    },
  }),
  useSensor(KeyboardSensor)
)
```

### Mobile Layout Adjustments
```tsx
// Always show drag handle on mobile (no hover)
<div className="flex items-start gap-2 md:group">
  <div
    {...attributes}
    {...listeners}
    className="cursor-grab active:cursor-grabbing pt-4 opacity-100 md:opacity-0 md:group-hover:opacity-100"
  >
    <GripVertical className="w-5 h-5 text-gray-400" />
  </div>
  {/* Content */}
</div>
```

### Compact Toggle on Mobile
```tsx
<div className="flex items-center gap-2">
  <Label className="text-xs md:text-sm">Active</Label>
  <Switch className="scale-90 md:scale-100" />
</div>
```

---

## 9. Visual Design Examples

### Card States Visual Hierarchy

```
┌─────────────────────────────────────┐
│ Active Item                    [ON] │  ← Switch top-right
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                      │
│ Title                                │
│ Description text here...             │
│                                      │
│ [Input Fields]                       │
│                                      │
└─────────────────────────────────────┘
  Solid border, white background,
  blue hover border

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ Inactive Item             [OFF] 🚫│  ← Badge indicator
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                     │
│ Title (grayed out)                  │
│ Description text here...            │
│                                     │
│ [Input Fields - dimmed]             │
│                                     │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
  Dashed border, gray background,
  60% opacity
```

### Drag State Transitions

```
1. Idle State:
   [≡] Item 1    ← Drag handle on hover
   [≡] Item 2
   [≡] Item 3

2. Drag Start:
   [≡] Item 1 (dragging, 50% opacity)
   ┌─────────────┐
   │ PLACEHOLDER │  ← Blue dashed box
   └─────────────┘
   [≡] Item 2
   [≡] Item 3

3. Drag Over:
   [≡] Item 2
   ┌─────────────┐
   │ PLACEHOLDER │  ← Moves with mouse
   └─────────────┘
   [≡] Item 3

4. Drop:
   [≡] Item 2
   [≡] Item 1    ← Smooth animation to new position
   [≡] Item 3
```

---

## 10. Performance Considerations

### Virtualization for Large Lists
If a section has more than 20 items, consider virtualization:

```tsx
import { FixedSizeList } from 'react-window'

// For very large lists (50+ items)
<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <SortableItem item={items[index]} index={index} />
    </div>
  )}
</FixedSizeList>
```

### Debounced Save
```tsx
import { useDebouncedCallback } from 'use-debounce'

const debouncedSave = useDebouncedCallback(
  (items) => {
    saveToBackend(items)
  },
  500 // 500ms delay
)

// Call on every change
useEffect(() => {
  debouncedSave(items)
}, [items])
```

### Optimistic UI Updates
```tsx
const handleToggleItem = async (id: string, isActive: boolean) => {
  // Update UI immediately
  setItems((items) =>
    items.map((item) => (item.id === id ? { ...item, isActive } : item))
  )

  try {
    // Save to backend
    await adminLandingService.updateItem(id, { isActive })
  } catch (error) {
    // Revert on error
    setItems((items) =>
      items.map((item) => (item.id === id ? { ...item, isActive: !isActive } : item))
    )
    toast.error('Failed to update item')
  }
}
```

---

## 11. Implementation Checklist

### Phase 1: Setup (1-2 hours)
- [ ] Install @dnd-kit packages
- [ ] Create base types with `id`, `isActive`, `order` fields
- [ ] Add unique IDs to existing content (migration if needed)
- [ ] Create `useSortableItems` hook

### Phase 2: Reusable Components (2-3 hours)
- [ ] Create `DraggableItemCard` component
- [ ] Create `ItemToggle` component
- [ ] Create `SortableItemList` wrapper component
- [ ] Add visual states (active/inactive/dragging)
- [ ] Test keyboard navigation

### Phase 3: Section Editors (4-6 hours)
- [ ] Refactor Social Proof section (4 stats, logos, 3 testimonials)
- [ ] Refactor How It Works section (4 steps, 4 stats)
- [ ] Refactor Features section (6 features)
- [ ] Refactor Hero section (benefits array, demo stats)
- [ ] Refactor CTA section (features array)

### Phase 4: Backend Integration (2-3 hours)
- [ ] Update API endpoints to accept item-level toggles and order
- [ ] Update database schema if needed (add `order` column)
- [ ] Update save/fetch logic
- [ ] Test with real data

### Phase 5: Polish & Testing (2-3 hours)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success feedback (toast notifications)
- [ ] Test on mobile devices
- [ ] Test accessibility (keyboard, screen reader)
- [ ] Add animations and transitions

**Total Estimated Time**: 12-17 hours

---

## 12. User Workflows

### Workflow 1: Reordering Items
1. User hovers over item → Drag handle appears
2. User clicks and holds drag handle
3. Item becomes semi-transparent, placeholder appears
4. User drags to new position
5. Other items smoothly move aside
6. User releases → Item drops into place
7. Auto-save triggers (debounced)
8. Toast notification: "Order updated"

### Workflow 2: Toggling Item Visibility
1. User clicks toggle switch on item card
2. Item immediately transitions to inactive state (grayed out, dashed border)
3. Badge appears: "Hidden"
4. API call sent in background
5. If successful: Toast "Item hidden from landing page"
6. If failed: Item reverts, toast "Failed to update"
7. User can toggle back on at any time

### Workflow 3: Managing Many Items
1. User sees list of all items (active and inactive)
2. Active items: Full color, solid border
3. Inactive items: Grayed out, dashed border, "Hidden" badge
4. User can quickly scan and identify inactive items
5. User can reorder both active and inactive items
6. Save button saves all changes at once

---

## 13. Future Enhancements

### Multi-Select & Bulk Actions
```tsx
<div className="mb-4 flex items-center gap-2">
  <Checkbox
    checked={selectedIds.length === items.length}
    onCheckedChange={handleSelectAll}
  />
  {selectedIds.length > 0 && (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleBulkActivate}>
        Activate Selected ({selectedIds.length})
      </Button>
      <Button size="sm" variant="destructive" onClick={handleBulkDeactivate}>
        Deactivate Selected
      </Button>
    </div>
  )}
</div>
```

### Undo/Redo Stack
```tsx
const [history, setHistory] = useState<T[][]>([items])
const [historyIndex, setHistoryIndex] = useState(0)

const undo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1)
    setItems(history[historyIndex - 1])
  }
}

const redo = () => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(historyIndex + 1)
    setItems(history[historyIndex + 1])
  }
}
```

### Preview Mode
```tsx
<Button onClick={() => setPreviewMode(!previewMode)}>
  <Eye className="w-4 h-4 mr-2" />
  {previewMode ? 'Exit Preview' : 'Preview Landing Page'}
</Button>

{previewMode && (
  <div className="fixed inset-0 bg-white z-50 overflow-auto">
    <LandingPage previewContent={currentContent} />
  </div>
)}
```

---

## Conclusion

This design provides a modern, intuitive admin experience for managing landing page content with:

- Clear visual hierarchy (active vs inactive items)
- Familiar interaction patterns (drag handles, toggle switches)
- Accessibility built-in (keyboard navigation, ARIA labels)
- Mobile-optimized (touch-friendly, responsive)
- Performance-conscious (debounced saves, optimistic UI)
- Extensible architecture (reusable components and hooks)

By using @dnd-kit and Shadcn UI components, we maintain consistency with the existing design system while adding powerful content management capabilities.

---

**Next Steps**:
1. Review this design with stakeholders
2. Get approval on visual patterns
3. Begin implementation in phases (see checklist)
4. Test with real users and iterate
