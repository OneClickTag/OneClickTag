import React from 'react';
import {
  Users,
  Target,
  Tag,
  Search,
  Zap,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SearchResult, SearchCategory } from '@/types/search.types';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  totalCount: number;
  searchTime?: number;
  isLoading?: boolean;
  error?: Error | null;
  selectedIndex?: number;
  onResultClick?: (result: SearchResult) => void;
  onResultHover?: (index: number) => void;
  className?: string;
}

const getTypeIcon = (type: 'customer' | 'campaign' | 'tag') => {
  switch (type) {
    case 'customer':
      return Users;
    case 'campaign':
      return Target;
    case 'tag':
      return Tag;
    default:
      return Search;
  }
};

const getTypeLabel = (type: 'customer' | 'campaign' | 'tag') => {
  switch (type) {
    case 'customer':
      return 'Customers';
    case 'campaign':
      return 'Campaigns';
    case 'tag':
      return 'Tags';
    default:
      return 'Results';
  }
};

export function SearchResults({
  results,
  query,
  totalCount,
  searchTime = 0,
  isLoading = false,
  error = null,
  selectedIndex = -1,
  onResultClick,
  onResultHover,
  className = '',
}: SearchResultsProps) {
  // Group results by type
  const categorizedResults = React.useMemo(() => {
    const categories: SearchCategory[] = [];
    const grouped = results.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);

    Object.entries(grouped).forEach(([type, typeResults]) => {
      const Icon = getTypeIcon(type as any);
      categories.push({
        type: type as any,
        label: getTypeLabel(type as any),
        icon: Icon,
        color: type === 'customer' ? 'blue' : type === 'campaign' ? 'green' : 'purple',
        results: typeResults,
      });
    });

    return categories.sort((a, b) => b.results.length - a.results.length);
  }, [results]);

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-6 w-6" />
          <span className="ml-2">Search failed. Please try again.</span>
        </div>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-8 text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">Search OneClickTag</p>
          <p className="text-sm">
            Find customers, campaigns, and tags across your account
          </p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-8">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600 mb-2">
            No results found
          </p>
          <p className="text-sm text-gray-500">
            Try adjusting your search terms or check for typos
          </p>
        </div>
      </div>
    );
  }

  const getGlobalIndex = (categoryIndex: number, itemIndex: number): number => {
    let globalIndex = 0;
    for (let i = 0; i < categoryIndex; i++) {
      globalIndex += categorizedResults[i].results.length;
    }
    return globalIndex + itemIndex;
  };

  return (
    <div className={className}>
      {/* Search Summary */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Search className="h-4 w-4" />
            <span>
              {totalCount} result{totalCount !== 1 ? 's' : ''} for "{query}"
            </span>
          </div>
          {searchTime > 0 && (
            <div className="flex items-center space-x-1 text-gray-500">
              <Zap className="h-3 w-3" />
              <span>{searchTime}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Results by Category */}
      <div className="max-h-96 overflow-y-auto">
        {categorizedResults.map((category, categoryIndex) => (
          <div key={category.type}>
            {/* Category Header */}
            <div className="sticky top-0 px-4 py-2 bg-gray-100 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <category.icon className={`h-4 w-4 text-${category.color}-600`} />
                <span className="text-sm font-medium text-gray-700">
                  {category.label}
                </span>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {category.results.length}
                </span>
              </div>
            </div>

            {/* Category Results */}
            <div>
              {category.results.map((result, itemIndex) => {
                const globalIndex = getGlobalIndex(categoryIndex, itemIndex);
                return (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    isSelected={selectedIndex === globalIndex}
                    onClick={() => onResultClick?.(result)}
                    onMouseEnter={() => onResultHover?.(globalIndex)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer with keyboard shortcuts hint */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">
                ↑↓
              </kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">
                ↵
              </kbd>
              <span>select</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">
                esc
              </kbd>
              <span>close</span>
            </div>
          </div>
          {results.length < totalCount && (
            <span>Showing first {results.length} results</span>
          )}
        </div>
      </div>
    </div>
  );
}