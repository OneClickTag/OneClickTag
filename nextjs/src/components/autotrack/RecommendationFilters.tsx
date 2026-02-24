'use client';

import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterState {
  severities: string[];
  trackingTypes: string[];
  funnelStage: string | null;
  search: string;
}

interface RecommendationFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  counts: {
    critical: number;
    important: number;
    recommended: number;
    optional: number;
  };
}

const TRACKING_TYPES = [
  { value: 'button_click', label: 'Button Click' },
  { value: 'page_view', label: 'Page View' },
  { value: 'form_submit', label: 'Form Submit' },
  { value: 'scroll_depth', label: 'Scroll Depth' },
  { value: 'time_on_page', label: 'Time on Page' },
  { value: 'video_play', label: 'Video Play' },
  { value: 'download', label: 'Download' },
  { value: 'phone_click', label: 'Phone Click' },
  { value: 'email_click', label: 'Email Click' },
];

const FUNNEL_STAGES = [
  { value: 'top', label: 'Top Funnel' },
  { value: 'middle', label: 'Middle Funnel' },
  { value: 'bottom', label: 'Bottom Funnel' },
];

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700' },
  { value: 'IMPORTANT', label: 'Important', color: 'bg-orange-100 text-orange-700' },
  { value: 'RECOMMENDED', label: 'Recommended', color: 'bg-blue-100 text-blue-700' },
  { value: 'OPTIONAL', label: 'Optional', color: 'bg-gray-100 text-gray-600' },
];

export function RecommendationFilters({
  onFilterChange,
  counts,
}: RecommendationFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    severities: [],
    trackingTypes: [],
    funnelStage: null,
    search: '',
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleSeverityToggle = (severity: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      severities: checked
        ? [...prev.severities, severity]
        : prev.severities.filter((s) => s !== severity),
    }));
  };

  const handleTrackingTypeChange = (value: string) => {
    if (value === 'all') {
      setFilters((prev) => ({ ...prev, trackingTypes: [] }));
    } else {
      setFilters((prev) => {
        const exists = prev.trackingTypes.includes(value);
        return {
          ...prev,
          trackingTypes: exists
            ? prev.trackingTypes.filter((t) => t !== value)
            : [...prev.trackingTypes, value],
        };
      });
    }
  };

  const handleFunnelStageChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      funnelStage: value === 'all' ? null : value,
    }));
  };

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const getSeverityCount = (severity: string): number => {
    const key = severity.toLowerCase() as keyof typeof counts;
    return counts[key] || 0;
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 border rounded-lg">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filter Recommendations</span>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Severity filters */}
        <div className="space-y-2 flex-shrink-0">
          <label className="text-xs font-medium text-muted-foreground">
            Severity
          </label>
          <div className="flex flex-col gap-2">
            {SEVERITY_OPTIONS.map((option) => {
              const count = getSeverityCount(option.value);
              return (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`severity-${option.value}`}
                    checked={filters.severities.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleSeverityToggle(option.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`severity-${option.value}`}
                    className="text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <span>{option.label}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${option.color}`}
                    >
                      {count}
                    </Badge>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tracking type filter */}
        <div className="space-y-2 flex-shrink-0">
          <label className="text-xs font-medium text-muted-foreground">
            Tracking Type
          </label>
          <Select
            value={
              filters.trackingTypes.length === 0
                ? 'all'
                : filters.trackingTypes[0]
            }
            onValueChange={handleTrackingTypeChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TRACKING_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Funnel stage filter */}
        <div className="space-y-2 flex-shrink-0">
          <label className="text-xs font-medium text-muted-foreground">
            Funnel Stage
          </label>
          <Select
            value={filters.funnelStage || 'all'}
            onValueChange={handleFunnelStageChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {FUNNEL_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search input */}
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or URL..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Active filters summary */}
      {(filters.severities.length > 0 ||
        filters.trackingTypes.length > 0 ||
        filters.funnelStage ||
        filters.search) && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          <div className="flex flex-wrap gap-1">
            {filters.severities.map((sev) => (
              <Badge key={sev} variant="secondary" className="text-xs">
                {sev.toLowerCase()}
              </Badge>
            ))}
            {filters.trackingTypes.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type.replace(/_/g, ' ')}
              </Badge>
            ))}
            {filters.funnelStage && (
              <Badge variant="secondary" className="text-xs">
                {filters.funnelStage} funnel
              </Badge>
            )}
            {filters.search && (
              <Badge variant="secondary" className="text-xs">
                search: {filters.search}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
