import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchService } from '@/lib/api/services';
import {
  SearchRequest,
} from '@/types/search.types';

// Query keys
const SEARCH_KEYS = {
  search: (request: SearchRequest) => ['search', request] as const,
  suggestions: (query: string) => ['search', 'suggestions', query] as const,
  history: () => ['search', 'history'] as const,
} as const;

/**
 * Hook for performing search
 */
export function useSearch(request: SearchRequest, enabled: boolean = true) {
  return useQuery({
    queryKey: SEARCH_KEYS.search(request),
    queryFn: () => searchService.search(request),
    enabled: enabled && request.query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting search suggestions
 */
export function useSearchSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: SEARCH_KEYS.suggestions(query),
    queryFn: () => searchService.generateSuggestions(query),
    enabled: enabled && query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting search history
 */
export function useSearchHistory() {
  return useQuery({
    queryKey: SEARCH_KEYS.history(),
    queryFn: () => searchService.getSearchHistory(),
    staleTime: Infinity, // Never stale since it's local data
  });
}

/**
 * Hook for initializing search data
 */
export function useInitializeSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => searchService.initializeSearchIndex(),
    onSuccess: () => {
      // Invalidate all search-related queries
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
}

/**
 * Hook for refreshing search data
 */
export function useRefreshSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => searchService.refreshSearchIndex(),
    onSuccess: () => {
      // Invalidate all search-related queries
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
}

/**
 * Hook for clearing search history
 */
export function useClearSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      searchService.clearSearchHistory();
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEARCH_KEYS.history() });
    },
  });
}

/**
 * Hook for removing item from search history
 */
export function useRemoveFromHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (historyId: string) => {
      searchService.removeFromHistory(historyId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEARCH_KEYS.history() });
    },
  });
}

/**
 * Custom hook for debounced search
 */
export function useDebouncedSearch(query: string, delay: number = 300) {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  return debouncedQuery;
}

/**
 * Hook for search with debouncing and automatic suggestions
 */
export function useSearchWithSuggestions(query: string, filters?: any) {
  const debouncedQuery = useDebouncedSearch(query);
  
  const searchRequest: SearchRequest = {
    query: debouncedQuery,
    filters,
    limit: 20,
    includeInactive: false,
  };

  const searchResults = useSearch(searchRequest, debouncedQuery.length >= 2);
  const suggestions = useSearchSuggestions(debouncedQuery, debouncedQuery.length >= 2);

  return {
    results: searchResults.data?.results || [],
    totalCount: searchResults.data?.totalCount || 0,
    searchTime: searchResults.data?.searchTime || 0,
    suggestions: suggestions.data || [],
    isLoading: searchResults.isLoading || suggestions.isLoading,
    error: searchResults.error || suggestions.error,
    isSearching: searchResults.isFetching,
  };
}

/**
 * Hook for managing search state
 */
export function useSearchState() {
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [filters, setFilters] = React.useState<any>({});

  const searchData = useSearchWithSuggestions(query, filters);
  const history = useSearchHistory();

  const clearSearch = React.useCallback(() => {
    setQuery('');
    setSelectedIndex(-1);
  }, []);

  const openSearch = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearch = React.useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    const results = searchData.results;
    const maxIndex = results.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          // Navigate to selected result
          const selected = results[selectedIndex];
          window.location.href = selected.url;
          closeSearch();
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeSearch();
        break;
    }
  }, [isOpen, selectedIndex, searchData.results, closeSearch]);

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    filters,
    setFilters,
    searchData,
    history: history.data || [],
    clearSearch,
    openSearch,
    closeSearch,
  };
}