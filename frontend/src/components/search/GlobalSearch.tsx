import React from 'react';
import {
  Search,
  X,
  Filter,
  Loader2,
  Command,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SearchResults } from './SearchResults';
import { SearchHistory } from './SearchHistory';
import { useSearchWithSuggestions, useClearSearchHistory, useRemoveFromHistory, useSearchHistory } from '@/hooks/useSearch';
import { useSearchKeyboardShortcuts, useShortcutDisplay } from '@/hooks/useKeyboardShortcuts';
import { SearchResult, SearchHistory as SearchHistoryType } from '@/types/search.types';

interface GlobalSearchProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

interface SearchFilters {
  types: ('customer' | 'campaign' | 'tag')[];
  includeInactive: boolean;
  limit: number;
}

export function GlobalSearch({ isOpen, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [filters, setFilters] = React.useState<SearchFilters>({
    types: ['customer', 'campaign', 'tag'],
    includeInactive: false,
    limit: 20,
  });

  const inputRef = React.useRef<HTMLInputElement>(null);
  const { getSearchShortcut } = useShortcutDisplay();

  // Search hooks
  const searchData = useSearchWithSuggestions(query, {
    types: filters.types,
    includeInactive: filters.includeInactive,
  });

  const clearHistory = useClearSearchHistory();
  const removeFromHistory = useRemoveFromHistory();
  const { data: searchHistory } = useSearchHistory();

  // Handle search navigation
  const navigateUp = React.useCallback(() => {
    if (!isOpen) return;
    setSelectedIndex(prev => {
      const maxIndex = searchData.results.length - 1;
      return prev > 0 ? prev - 1 : maxIndex;
    });
  }, [isOpen, searchData.results.length]);

  const navigateDown = React.useCallback(() => {
    if (!isOpen) return;
    setSelectedIndex(prev => {
      const maxIndex = searchData.results.length - 1;
      return prev < maxIndex ? prev + 1 : 0;
    });
  }, [isOpen, searchData.results.length]);

  const selectResult = React.useCallback(() => {
    if (!isOpen || selectedIndex < 0 || !searchData.results[selectedIndex]) return;
    
    const selected = searchData.results[selectedIndex];
    handleResultClick(selected);
  }, [isOpen, selectedIndex, searchData.results]);

  const clearSearch = React.useCallback(() => {
    setQuery('');
    setSelectedIndex(-1);
    setShowHistory(false);
    setShowFilters(false);
  }, []);

  const openSearch = React.useCallback(() => {
    onOpenChange(true);
  }, [onOpenChange]);

  const closeSearch = React.useCallback(() => {
    onOpenChange(false);
    clearSearch();
  }, [onOpenChange, clearSearch]);

  // Keyboard shortcuts
  useSearchKeyboardShortcuts({
    onOpenSearch: openSearch,
    onCloseSearch: closeSearch,
    onNavigateUp: navigateUp,
    onNavigateDown: navigateDown,
    onSelectResult: selectResult,
    onClearSearch: clearSearch,
  });

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selected index when query changes
  React.useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  // Show history when input is focused but empty
  React.useEffect(() => {
    if (isOpen && !query.trim()) {
      setShowHistory(true);
    } else {
      setShowHistory(false);
    }
  }, [isOpen, query]);

  const handleResultClick = (result: SearchResult) => {
    // Navigate to the result URL
    window.location.href = result.url;
    closeSearch();
  };

  const handleHistoryClick = (historyItem: SearchHistoryType) => {
    setQuery(historyItem.query);
    if (historyItem.filters) {
      // Apply historical filters if available
      if (historyItem.filters.types) {
        setFilters(prev => ({
          ...prev,
          types: historyItem.filters!.types!,
        }));
      }
    }
    setShowHistory(false);
  };

  const handleHistoryRemove = (historyId: string) => {
    removeFromHistory.mutate(historyId);
  };

  const handleHistoryClear = () => {
    clearHistory.mutate();
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTypeToggle = (type: 'customer' | 'campaign' | 'tag', checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      types: checked 
        ? [...prev.types, type]
        : prev.types.filter(t => t !== type),
    }));
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.types.length < 3) count++; // Not all types selected
    if (filters.includeInactive) count++;
    return count;
  }, [filters]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[80vh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Command className="h-5 w-5 text-gray-600" />
            <DialogTitle className="text-lg font-semibold">Search OneClickTag</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600">
            Find customers, campaigns, and tags across your account
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              ref={inputRef}
              type="text"
              placeholder={`Search... (${getSearchShortcut()})`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-12 py-2 text-base"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
              {/* Clear button */}
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              
              {/* Filters button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-6 w-6 p-0 ${showFilters ? 'bg-gray-100' : ''}`}
              >
                <Filter className="h-3 w-3" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-2 gap-4">
                {/* Type Filters */}
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-2 block">
                    Content Types
                  </Label>
                  <div className="space-y-2">
                    {[
                      { value: 'customer', label: 'Customers' },
                      { value: 'campaign', label: 'Campaigns' },
                      { value: 'tag', label: 'Tags' },
                    ].map(({ value, label }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${value}`}
                          checked={filters.types.includes(value as any)}
                          onCheckedChange={(checked) => 
                            handleTypeToggle(value as any, !!checked)
                          }
                        />
                        <Label 
                          htmlFor={`type-${value}`} 
                          className="text-sm cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Filters */}
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-2 block">
                    Options
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-inactive"
                        checked={filters.includeInactive}
                        onCheckedChange={(checked) => 
                          handleFilterChange('includeInactive', !!checked)
                        }
                      />
                      <Label htmlFor="include-inactive" className="text-sm cursor-pointer">
                        Include inactive items
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({
                      types: ['customer', 'campaign', 'tag'],
                      includeInactive: false,
                      limit: 20,
                    })}
                    className="text-xs"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Loading State */}
          {searchData.isLoading && query.length >= 2 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Searching...</span>
            </div>
          )}

          {/* Error State */}
          {searchData.error && (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <span className="ml-2">Search failed. Please try again.</span>
            </div>
          )}

          {/* Search Results */}
          {!searchData.isLoading && !searchData.error && query.length >= 2 && (
            <SearchResults
              results={searchData.results}
              query={query}
              totalCount={searchData.totalCount}
              searchTime={searchData.searchTime}
              selectedIndex={selectedIndex}
              onResultClick={handleResultClick}
              onResultHover={setSelectedIndex}
            />
          )}

          {/* Search History */}
          {showHistory && (
            <SearchHistory
              history={searchHistory || []}
              onHistoryClick={handleHistoryClick}
              onHistoryRemove={handleHistoryRemove}
              onHistoryClear={handleHistoryClear}
            />
          )}

          {/* Empty State */}
          {!searchData.isLoading && !searchData.error && !showHistory && query.length < 2 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600 mb-2">
                Search OneClickTag
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Find customers, campaigns, and tags across your account
              </p>
              <div className="text-xs text-gray-400">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono">
                  {getSearchShortcut()}
                </kbd> to search anytime
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono">
                  ↑↓
                </kbd>
                <span>to navigate</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono">
                  ↵
                </kbd>
                <span>to select</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono">
                  esc
                </kbd>
                <span>to close</span>
              </div>
            </div>
            {searchData.results.length > 0 && (
              <span>
                {searchData.results.length} of {searchData.totalCount} results
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}