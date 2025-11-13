# Global Search Feature

A comprehensive global search implementation for OneClickTag with fuzzy search, keyboard shortcuts, and real-time results.

## Features

- 🔍 **Fuzzy Search**: Smart search with typo tolerance using Fuse.js
- ⌨️ **Keyboard Shortcuts**: Global shortcuts (⌘K/Ctrl+K) and navigation
- 📂 **Categorized Results**: Results organized by customers, campaigns, and tags
- 🕒 **Search History**: Recent searches saved locally with management
- 🎛️ **Advanced Filters**: Filter by content type, status, and more
- ⚡ **Real-time Results**: Instant search with debouncing and caching
- 🔄 **Auto-sync**: Automatic search index updates
- 💾 **Local Storage**: Search history persisted locally

## Components

### GlobalSearch
Main search dialog with full functionality:
```tsx
import { GlobalSearch } from '@/components/search/GlobalSearch';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <GlobalSearch 
      isOpen={isOpen} 
      onOpenChange={setIsOpen}
    />
  );
}
```

### SearchTrigger
Trigger buttons in different styles:
```tsx
import { SearchTrigger } from '@/components/search/SearchTrigger';

// Input style (default)
<SearchTrigger onClick={() => setIsOpen(true)} />

// Button style
<SearchTrigger 
  onClick={() => setIsOpen(true)} 
  variant="button" 
/>

// Minimal style
<SearchTrigger 
  onClick={() => setIsOpen(true)} 
  variant="minimal" 
/>
```

### SearchResults
Display search results with categories:
```tsx
import { SearchResults } from '@/components/search/SearchResults';

<SearchResults
  results={results}
  query={query}
  totalCount={totalCount}
  selectedIndex={selectedIndex}
  onResultClick={handleResultClick}
  onResultHover={setSelectedIndex}
/>
```

### SearchHistory
Display and manage search history:
```tsx
import { SearchHistory } from '@/components/search/SearchHistory';

<SearchHistory
  history={history}
  onHistoryClick={handleHistoryClick}
  onHistoryRemove={handleHistoryRemove}
  onHistoryClear={handleHistoryClear}
/>
```

## Hooks

### useSearch
Perform search with React Query caching:
```tsx
import { useSearch } from '@/hooks/useSearch';

const { data, isLoading, error } = useSearch({
  query: 'customer name',
  filters: { types: ['customer'] }
});
```

### useDebouncedSearch
Search with debouncing:
```tsx
import { useDebouncedSearch } from '@/hooks/useSearch';

const { data, isDebouncing } = useDebouncedSearch(query, filters, 300);
```

### useSearchHistory
Manage search history:
```tsx
import { useSearchHistory, useClearSearchHistory } from '@/hooks/useSearch';

const { data: history } = useSearchHistory();
const clearHistory = useClearSearchHistory();
```

### useInitializeSearch
Initialize search index:
```tsx
import { useInitializeSearch } from '@/hooks/useSearch';

const initializeSearch = useInitializeSearch();

useEffect(() => {
  initializeSearch.mutate();
}, []);
```

## Keyboard Shortcuts

- **⌘K / Ctrl+K**: Open search dialog
- **↑ / ↓**: Navigate results
- **Enter**: Select result
- **Esc**: Close dialog
- **/**: Quick search (when not in input field)

## API Integration

The search service integrates with your API to fetch searchable data:

```typescript
// API endpoints expected:
GET /customers?includeSearchData=true
GET /campaigns?includeSearchData=true  
GET /tags?includeSearchData=true
POST /search (fallback for server-side search)
```

## Configuration

### Fuse.js Options
Customize fuzzy search behavior in `searchService.ts`:
```typescript
const fuseOptions = {
  threshold: 0.4,        // 0.0 = perfect match, 1.0 = match anything
  location: 0,           // Expected location of match
  distance: 100,         // Max distance from expected location
  maxPatternLength: 32,  // Max pattern length
  minMatchCharLength: 2, // Min character length to trigger search
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'subtitle', weight: 0.5 },
    // ... more fields
  ]
};
```

### Search History
Customize history storage:
```typescript
// Max items in history (default: 20)
this.searchHistory = this.searchHistory.slice(0, 20);

// Storage key
localStorage.setItem('search-history', JSON.stringify(history));
```

## Usage Examples

### Basic Implementation
```tsx
import { MainLayout } from '@/components/layout/MainLayout';

function App() {
  return (
    <MainLayout>
      {/* Your app content */}
      {/* Search is automatically available via MainLayout */}
    </MainLayout>
  );
}
```

### Custom Search Integration
```tsx
import { SearchableHeader } from '@/components/layout/GlobalSearchProvider';

function CustomPage() {
  return (
    <div>
      <SearchableHeader title="My Page">
        <Button>Action</Button>
      </SearchableHeader>
      {/* Page content */}
    </div>
  );
}
```

### Programmatic Search
```tsx
import { searchService } from '@/services/search';

// Initialize search index
await searchService.initializeSearchIndex();

// Perform search
const results = await searchService.search({
  query: 'john doe',
  filters: { types: ['customer'] },
  limit: 10
});

// Get search statistics
const stats = searchService.getSearchStats();
```

## Development

### Adding New Search Types
1. Update `SearchResult` types in `search.types.ts`
2. Add data fetching in `searchService.ts`
3. Update UI components to handle new types
4. Add icons and styling in `SearchResultItem.tsx`

### Customizing Search Behavior
- Modify `fuseOptions` for different matching behavior
- Update `searchableText` generation for better search relevance
- Customize debounce delays in hooks
- Add new filter types in search interface

## Performance

- Search index is cached in memory
- React Query provides automatic caching and deduplication
- Debounced input prevents excessive API calls
- Local storage for search history reduces server requests
- Lazy loading of search data on demand

## Dependencies

- `fuse.js` - Fuzzy search library
- `@tanstack/react-query` - Data fetching and caching
- `@radix-ui/react-command` - Command palette primitives
- `@radix-ui/react-dialog` - Dialog component
- Custom UI components from `/components/ui`