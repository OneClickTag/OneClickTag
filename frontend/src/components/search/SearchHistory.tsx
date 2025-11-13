import React from 'react';
import {
  Clock,
  Search,
  X,
  Trash2,
  Filter,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { SearchHistory as SearchHistoryType } from '@/types/search.types';
import { Button } from '@/components/ui/button';

interface SearchHistoryProps {
  history: SearchHistoryType[];
  onHistoryClick?: (historyItem: SearchHistoryType) => void;
  onHistoryRemove?: (historyId: string) => void;
  onHistoryClear?: () => void;
  className?: string;
}

export function SearchHistory({
  history,
  onHistoryClick,
  onHistoryRemove,
  onHistoryClear,
  className = '',
}: SearchHistoryProps) {
  if (history.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600 mb-2">
            No search history
          </p>
          <p className="text-sm text-gray-500">
            Your recent searches will appear here
          </p>
        </div>
      </div>
    );
  }

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const searchTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - searchTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const hasFilters = (historyItem: SearchHistoryType): boolean => {
    const filters = historyItem.filters;
    if (!filters) return false;

    return !!(
      (filters.types && filters.types.length > 0) ||
      (filters.customerIds && filters.customerIds.length > 0) ||
      (filters.statuses && filters.statuses.length > 0) ||
      filters.dateRange
    );
  };

  const getFiltersDescription = (historyItem: SearchHistoryType): string => {
    const filters = historyItem.filters;
    if (!filters || !hasFilters(historyItem)) return '';

    const parts: string[] = [];

    if (filters.types && filters.types.length > 0) {
      parts.push(`${filters.types.length} type${filters.types.length > 1 ? 's' : ''}`);
    }

    if (filters.customerIds && filters.customerIds.length > 0) {
      parts.push(`${filters.customerIds.length} customer${filters.customerIds.length > 1 ? 's' : ''}`);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      parts.push(`${filters.statuses.length} status${filters.statuses.length > 1 ? 'es' : ''}`);
    }

    if (filters.dateRange) {
      parts.push('date range');
    }

    return parts.join(', ');
  };

  // Group history by date
  const groupedHistory = React.useMemo(() => {
    const groups: { [key: string]: SearchHistoryType[] } = {};
    
    history.forEach(item => {
      const date = new Date(item.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [history]);

  const isToday = (dateString: string): boolean => {
    return dateString === new Date().toDateString();
  };

  const isYesterday = (dateString: string): boolean => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateString === yesterday.toDateString();
  };

  const formatDateGroup = (dateString: string): string => {
    if (isToday(dateString)) return 'Today';
    if (isYesterday(dateString)) return 'Yesterday';
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Recent Searches</span>
            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          </div>
          {history.length > 0 && onHistoryClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onHistoryClear}
              className="text-gray-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* History Items */}
      <div className="max-h-80 overflow-y-auto">
        {groupedHistory.map(([dateString, dateHistory]) => (
          <div key={dateString}>
            {/* Date Group Header */}
            <div className="sticky top-0 px-4 py-2 bg-gray-100 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-600">
                {formatDateGroup(dateString)}
              </span>
            </div>

            {/* History Items for Date */}
            <div>
              {dateHistory.map((historyItem) => (
                <div
                  key={historyItem.id}
                  className="group flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onHistoryClick?.(historyItem)}
                >
                  <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                    <Search className="h-4 w-4 text-gray-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {historyItem.query}
                      </h4>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(historyItem.timestamp)}
                        </span>
                        {onHistoryRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onHistoryRemove(historyItem.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                          >
                            <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>
                          {historyItem.resultCount} result{historyItem.resultCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {hasFilters(historyItem) && (
                        <div className="flex items-center space-x-1">
                          <Filter className="h-3 w-3" />
                          <span title={getFiltersDescription(historyItem)}>
                            with filters
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Filters preview for recent searches */}
                    {hasFilters(historyItem) && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-400">
                          Filtered by: {getFiltersDescription(historyItem)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <RotateCcw className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Click any search to repeat it</span>
          {history.length >= 10 && (
            <span>Only showing recent 10 searches</span>
          )}
        </div>
      </div>
    </div>
  );
}